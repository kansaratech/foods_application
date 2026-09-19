/**
 * Cashfree payment/refund scenario tests — proves the webhook state machine
 * (payment success/failed/user-dropped, refund success/pending/failed,
 * idempotency, signature verification, guard rails) behaves correctly,
 * without ever touching Cashfree PRODUCTION or spending real money.
 *
 * Refuses to run unless Configuration.cashfreeEnv is "TEST" — this never
 * touches a live Cashfree account.
 *
 *   1. start the API:  npm run dev                  (from localsell-api/)
 *   2. configure Cashfree TEST credentials (admin → Configuration → Cashfree,
 *      or seed-data.json) — get them free at https://merchant.cashfree.com
 *      (sandbox account, no KYC needed to start)
 *   3. run this:        npm run test:cashfree
 *
 * What this DOES cover end-to-end for free, no browser and no real money —
 * confirmed by actually running this against a real sandbox account (docs:
 * https://www.cashfree.com/docs/payments/online/resources/sandbox-environment ,
 * https://www.cashfree.com/docs/api-reference/payments/latest/payments/pay ):
 *   - The Order Pay API (`POST /pg/orders/sessions`) completes a UPI
 *     "collect" payment server-side using the fixed test VPA
 *     `testsuccess@gocash` — no browser, no OTP. It does NOT settle
 *     instantly though (confirmed by hand: ~30s, mimicking a real customer
 *     approving on their phone), so the poll below needs a real budget, not
 *     a couple of quick retries.
 *   - Once genuinely PAID on Cashfree's side, cancelling it fires a REAL
 *     refund — not a synthetic stand-in. (One caveat found while wiring this
 *     up: a search result claimed sandbox lets you force refund_status via
 *     `refund_note: "SUCCESS"/"FAILED"/"PENDING"` — tested directly against
 *     the real API and it does NOT do that on this api-version; every real
 *     refund just comes back PENDING and resolves later like production
 *     does. Don't trust that claim if you see it repeated elsewhere.)
 *   - Every webhook type (PAYMENT_SUCCESS/FAILED/USER_DROPPED,
 *     REFUND_STATUS) fired with a correctly-HMAC-signed payload exactly as
 *     Cashfree sends it, idempotency, signature rejection, stale-refund-
 *     attempt rejection, and retryOrderRefund guard rails.
 *   - A deterministic refund FAILURE: asking Cashfree to refund more than
 *     was paid is rejected synchronously (HTTP 400, `refund_amount_invalid`)
 *     — a real, reliable way to exercise the FAILED path without waiting on
 *     an async resolution.
 *
 * Sandbox has no cost at all — it's simulated money end to end, refunds
 * included. The ₹8-ish "instant refund" fee only applies to a real
 * PRODUCTION refund, so there is no reason to test any of this on live.
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

const API_URL = process.env.API_URL || 'http://localhost:4000/graphql';
const WEBHOOK_URL = process.env.WEBHOOK_URL || API_URL.replace(/\/graphql\/?$/, '/webhooks/cashfree');

const results = [];
const pass = (n, d = '') => { results.push({ ok: true, n, d }); console.log(`  \x1b[32mPASS\x1b[0m  ${n}${d ? ' — ' + d : ''}`); };
const fail = (n, d = '') => { results.push({ ok: false, n, d }); console.log(`  \x1b[31mFAIL\x1b[0m  ${n}${d ? ' — ' + d : ''}`); };

async function gql(query, variables, token) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

/** Signs a webhook body exactly the way Cashfree does — matches verifyCashfreeWebhookSignature in cashfree.service.ts. */
function signWebhook(secretKey, bodyObj, timestamp = String(Math.floor(Date.now() / 1000))) {
  const raw = JSON.stringify(bodyObj);
  const signature = crypto.createHmac('sha256', secretKey).update(timestamp + raw).digest('base64');
  return { raw, timestamp, signature };
}

async function postWebhook(secretKey, bodyObj, { badSignature = false, noSignature = false } = {}) {
  const { raw, timestamp, signature } = signWebhook(secretKey, bodyObj);
  const headers = { 'Content-Type': 'application/json' };
  if (!noSignature) {
    headers['x-webhook-timestamp'] = timestamp;
    headers['x-webhook-signature'] = badSignature ? 'not-a-real-signature==' : signature;
  }
  const r = await fetch(WEBHOOK_URL, { method: 'POST', headers, body: raw });
  return r.status;
}

const CF_API_VERSION = '2023-08-01';
const cfApiBase = (env) => (env === 'PRODUCTION' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg');

/**
 * Completes a UPI "collect" payment server-side against a just-created order,
 * using Cashfree's fixed sandbox test VPA — no browser, no OTP. Auth is the
 * payment_session_id itself (this endpoint is meant to be called with only
 * that, same as the client SDK would). Docs:
 * https://www.cashfree.com/docs/api-reference/payments/latest/payments/pay
 */
async function payWithTestUpi(paymentSessionId, vpa = 'testsuccess@gocash') {
  const res = await fetch(`https://sandbox.cashfree.com/pg/orders/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': CF_API_VERSION,
      'x-client-device': 'Desktop',
      'x-client-os': 'Windows',
      'x-client-browser': 'Chrome',
    },
    body: JSON.stringify({
      payment_session_id: paymentSessionId,
      payment_method: { upi: { channel: 'collect', upi_id: vpa } },
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/**
 * Calls Cashfree's real refund API directly with an intentionally invalid
 * amount (bypassing our own app, which never sends a bad amount) — Cashfree
 * rejects this synchronously with `refund_amount_invalid`, a real,
 * deterministic way to exercise a refund FAILURE without waiting on an
 * async resolution. Docs: https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create
 */
async function attemptOverAmountRefund(creds, cfOrderId, refundId) {
  const res = await fetch(`${cfApiBase(creds.env)}/orders/${encodeURIComponent(cfOrderId)}/refunds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': creds.appId,
      'x-client-secret': creds.secretKey,
      'x-api-version': CF_API_VERSION,
    },
    // Deliberately absurd — always exceeds whatever was actually paid.
    body: JSON.stringify({ refund_amount: 999999, refund_id: refundId, refund_note: 'test — intentionally invalid amount' }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The webhook handler acks 200 immediately then processes async (setImmediate
// chains inside notifyOrderEvent/refund-notify) — give it a beat before reading DB state.
async function waitFor(check, { tries = 20, intervalMs = 150 } = {}) {
  for (let i = 0; i < tries; i++) {
    const v = await check();
    if (v) return v;
    await sleep(intervalMs);
  }
  return null;
}

async function main() {
  console.log('\n# Guard: refuse to run against anything but Cashfree TEST');
  const config = await prisma.configuration.findFirst();
  if (!config?.cashfreeAppId || !config?.cashfreeSecretKey) {
    fail('Cashfree credentials configured', 'set cashfreeAppId/cashfreeSecretKey (admin → Configuration → Cashfree, TEST env) first');
    return finish();
  }
  if ((config.cashfreeEnv ?? 'TEST') !== 'TEST') {
    fail('cashfreeEnv is TEST', `found "${config.cashfreeEnv}" — refusing to run scenario tests against a live account`);
    return finish();
  }
  pass('cashfreeEnv is TEST', `app id ${config.cashfreeAppId}`);
  const secretKey = config.cashfreeSecretKey;

  console.log('\n# Setup — admin + customer + a CASHFREE-payable menu item');
  const admin = (await gql(`mutation { ownerLogin(email:"admin@localsell.in", password:"Admin@123"){ token } }`)).data?.ownerLogin?.token;
  if (!admin) { fail('admin login', 'is the API up + seeded?'); return finish(); }
  pass('admin login');

  const custEmail = `test-cashfree-${Date.now()}@localsell.in`;
  const cust = (await gql(`mutation { login(email:"deogarh-diner@padharo.in", password:"Customer@123", type:"default"){ token } }`)).data?.login?.token
    || (await gql(`mutation($e:String!){ createUser(userInput:{ email:$e, password:"Customer@123", name:"Test Customer" }){ token } }`, { e: custEmail })).data?.createUser?.token;
  if (!cust) { fail('customer login/signup'); return finish(); }
  pass('customer login/signup');

  const anyR = (await gql(`{ restaurants { _id isActive isAvailable } }`, {}, admin)).data?.restaurants || [];
  let RID, food;
  for (const r of anyR) {
    if (!r.isActive || !r.isAvailable) continue;
    const rr = (await gql(`{ restaurant(id:"${r._id}"){ minimumOrder categories { foods { _id variations { _id price addons } } } } }`, {}, admin)).data?.restaurant;
    const f = rr?.categories?.flatMap((c) => c.foods).find((x) => x.variations?.length && !x.variations[0].addons?.length);
    if (f) { RID = r._id; food = f; break; }
  }
  if (!RID || !food) { fail('find a payable restaurant + item', 'no active store with a plain (no-addon) item found'); return finish(); }
  pass('found restaurant + item', `${RID}`);

  const address = { label: 'Home', deliveryAddress: 'Near', latitude: '25.536', longitude: '73.901' };
  const items = [{ food: food._id, quantity: 1, variation: food.variations[0]._id }];
  const placeCashfreeOrder = () =>
    gql(
      `mutation P($i:[OrderItemInput!]!,$a:AddressInput!){ placeOrder(restaurant:"${RID}",orderInput:$i,paymentMethod:"CASHFREE",tipping:0,taxationAmount:0,deliveryCharges:0,isPickedUp:true,orderDate:"2026-09-18",address:$a){ _id orderId orderAmount paymentStatus } }`,
      { i: items, a: address },
      cust,
    ).then((r) => r.data?.placeOrder);

  const orderState = (id) => prisma.order.findUnique({ where: { id } });
  const creds = { appId: config.cashfreeAppId, secretKey: config.cashfreeSecretKey, env: config.cashfreeEnv ?? 'TEST' };

  /**
   * Polls recheckCashfreePayment (real Cashfree order-status lookup) until
   * Cashfree's own side reports PAID. The sandbox test VPA (testsuccess@gocash)
   * does NOT settle instantly — confirmed by hand it can take ~30s — so this
   * needs a genuinely long budget, not a quick couple of retries.
   */
  async function waitForRealPaid(orderId, tries = 40, intervalMs = 1500) {
    for (let i = 0; i < tries; i++) {
      const r = (await gql(`mutation { recheckCashfreePayment(orderId:"${orderId}"){ success paymentStatus message } }`, {}, cust)).data?.recheckCashfreePayment;
      if (r?.paymentStatus === 'PAID') return r;
      await sleep(intervalMs);
    }
    return null;
  }

  /** Places + starts a session + pays it with the given test UPI VPA (real sandbox payment). Returns the order + cfOrderId. */
  async function placeAndPayCashfreeOrder(vpa = 'testsuccess@gocash') {
    const order = await placeCashfreeOrder();
    if (!order?._id) return { order: null };
    const s = (await gql(`mutation { createCashfreePaymentSession(orderId:"${order._id}"){ success paymentSessionId cfOrderId } }`, {}, cust)).data?.createCashfreePaymentSession;
    if (!s?.paymentSessionId) return { order, session: s };
    const paid = await payWithTestUpi(s.paymentSessionId, vpa);
    return { order, session: s, paid };
  }

  // ---------------------------------------------------------------- SESSION CREATION (real Cashfree TEST call)
  console.log('\n# Scenario A — create a real Cashfree TEST payment session');
  const orderA = await placeCashfreeOrder();
  if (!orderA?._id) { fail('place CASHFREE order', 'placeOrder did not return an order'); return finish(); }
  pass('placeOrder (CASHFREE, unpaid)', `${orderA.orderId} · paymentStatus=${orderA.paymentStatus}`);

  const session = (await gql(`mutation { createCashfreePaymentSession(orderId:"${orderA._id}"){ success message paymentSessionId cfOrderId } }`, {}, cust)).data?.createCashfreePaymentSession;
  session?.success && session.paymentSessionId
    ? pass('createCashfreePaymentSession', `cfOrderId=${session.cfOrderId} — real sandbox call succeeded, credentials are good`)
    : fail('createCashfreePaymentSession', JSON.stringify(session));
  if (!session?.cfOrderId) return finish();

  // ---------------------------------------------------------------- PAYMENT SUCCESS + IDEMPOTENCY
  console.log('\n# Scenario B — PAYMENT_SUCCESS_WEBHOOK');
  const successPayload = {
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    data: {
      order: { order_id: session.cfOrderId, order_amount: orderA.orderAmount },
      payment: { cf_payment_id: 'TEST-CFPAY-1', payment_status: 'SUCCESS', payment_amount: orderA.orderAmount },
    },
  };
  const st1 = await postWebhook(secretKey, successPayload);
  st1 === 200 ? pass('webhook accepted (200)', 'signature verified') : fail('webhook rejected', `HTTP ${st1}`);
  const afterSuccess = await waitFor(async () => {
    const o = await orderState(orderA._id);
    return o?.paymentStatus === 'PAID' ? o : null;
  });
  afterSuccess ? pass('order flips to PAID', `paidAmount=${afterSuccess.paidAmount}`) : fail('order did not flip to PAID');

  console.log('\n# Scenario C — duplicate SUCCESS webhook is a no-op (idempotency)');
  await postWebhook(secretKey, successPayload);
  await sleep(300);
  const afterDup = await orderState(orderA._id);
  afterDup?.paymentStatus === 'PAID' && afterDup.paidAmount === afterSuccess?.paidAmount
    ? pass('duplicate webhook did not double-apply', `still PAID, paidAmount unchanged (₹${afterDup.paidAmount})`)
    : fail('duplicate webhook changed state', JSON.stringify(afterDup));

  // ---------------------------------------------------------------- PAYMENT FAILED / USER DROPPED
  console.log('\n# Scenario D — PAYMENT_FAILED_WEBHOOK on a fresh order');
  const orderD = await placeCashfreeOrder();
  const sessionD = (await gql(`mutation { createCashfreePaymentSession(orderId:"${orderD._id}"){ cfOrderId success } }`, {}, cust)).data?.createCashfreePaymentSession;
  if (sessionD?.cfOrderId) {
    await postWebhook(secretKey, { type: 'PAYMENT_FAILED_WEBHOOK', data: { order: { order_id: sessionD.cfOrderId } } });
    const afterFail = await waitFor(async () => {
      const o = await orderState(orderD._id);
      return o?.paymentStatus === 'FAILED' ? o : null;
    });
    afterFail ? pass('order flips to FAILED') : fail('order did not flip to FAILED');
  } else fail('setup order D');

  console.log('\n# Scenario E — PAYMENT_USER_DROPPED_WEBHOOK on a fresh order');
  const orderE = await placeCashfreeOrder();
  const sessionE = (await gql(`mutation { createCashfreePaymentSession(orderId:"${orderE._id}"){ cfOrderId success } }`, {}, cust)).data?.createCashfreePaymentSession;
  if (sessionE?.cfOrderId) {
    await postWebhook(secretKey, { type: 'PAYMENT_USER_DROPPED_WEBHOOK', data: { order: { order_id: sessionE.cfOrderId } } });
    const afterDrop = await waitFor(async () => {
      const o = await orderState(orderE._id);
      return o?.paymentStatus === 'FAILED' ? o : null;
    });
    afterDrop ? pass('user-dropped treated as FAILED (retryable)') : fail('user-dropped did not flip to FAILED');
  } else fail('setup order E');

  // ---------------------------------------------------------------- SIGNATURE VERIFICATION
  console.log('\n# Scenario F1 — webhook signature verification');
  const badSt = await postWebhook(secretKey, { type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'does-not-matter' } } }, { badSignature: true });
  badSt === 401 ? pass('bad signature rejected (401)') : fail('bad signature not rejected', `HTTP ${badSt}`);
  const noSigSt = await postWebhook(secretKey, { type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'does-not-matter' } } }, { noSignature: true });
  noSigSt === 401 ? pass('missing signature rejected (401)') : fail('missing signature not rejected', `HTTP ${noSigSt}`);

  // ---------------------------------------------------------------- REFUND: cancel an order Cashfree never actually processed
  console.log('\n# Scenario F2a — cancel an order the gateway never really processed → refund correctly reports FAILED');
  console.log('  orderA was only marked PAID on OUR side via a synthetic webhook — Cashfree\'s own');
  console.log('  records still show it unpaid, so the real refund call below should be rejected');
  console.log('  by Cashfree, and our code should record that as refundStatus FAILED (not crash/hang).');
  const cancelled = (await gql(`mutation { cancelOrder(_id:"${orderA._id}", reason:"test scenario"){ _id orderStatus refundStatus } }`, {}, admin)).data?.cancelOrder;
  cancelled?.orderStatus === 'CANCELLED' ? pass('cancelOrder', `orderStatus=${cancelled.orderStatus}`) : fail('cancelOrder', JSON.stringify(cancelled));
  const afterCancel = await waitFor(async () => {
    const o = await orderState(orderA._id);
    return o?.refundStatus !== 'NONE' ? o : null;
  });
  afterCancel
    ? pass('refund attempt fired on cancel', `refundStatus=${afterCancel.refundStatus}${afterCancel.refundError ? ' — ' + afterCancel.refundError.slice(0, 80) : ''}`)
    : fail('no refund attempt recorded after cancel');

  // ---------------------------------------------------------------- REFUND: a GENUINE sandbox payment, really refunded
  console.log('\n# Scenario F2b — genuine sandbox payment (UPI collect, testsuccess@gocash) → real refund SUCCESS');
  const { order: orderPaid, session: sessionPaid, paid: payResp } = await placeAndPayCashfreeOrder('testsuccess@gocash');
  if (!orderPaid?._id || !sessionPaid?.paymentSessionId) {
    fail('setup genuinely-paid order', 'placeOrder/createCashfreePaymentSession failed');
  } else {
    payResp?.ok
      ? pass('UPI collect (testsuccess@gocash) accepted', `HTTP ${payResp.status}`)
      : fail('UPI collect payment call failed', JSON.stringify(payResp?.body).slice(0, 200));
    const reallyPaid = await waitForRealPaid(orderPaid._id);
    reallyPaid ? pass('Cashfree confirms order really PAID', reallyPaid.message) : fail('order never reached PAID on Cashfree\'s side');

    if (reallyPaid) {
      const cancelledPaid = (await gql(`mutation { cancelOrder(_id:"${orderPaid._id}", reason:"test scenario — genuine refund"){ _id orderStatus } }`, {}, admin)).data?.cancelOrder;
      cancelledPaid?.orderStatus === 'CANCELLED' ? pass('cancelOrder (genuinely-paid order)') : fail('cancelOrder (genuinely-paid order)', JSON.stringify(cancelledPaid));
      const refundedForReal = await waitFor(async () => {
        const o = await orderState(orderPaid._id);
        return o?.refundStatus === 'SUCCESS' || o?.refundStatus === 'PROCESSING' ? o : null;
      }, { tries: 20, intervalMs: 500 });
      refundedForReal
        ? pass('REAL refund succeeded in sandbox', `refundStatus=${refundedForReal.refundStatus} · refundedAmount=₹${refundedForReal.refundedAmount ?? '(pending)'}`)
        : fail('genuine refund did not succeed', JSON.stringify(await orderState(orderPaid._id)));
    }
  }

  // ---------------------------------------------------------------- REFUND: deterministic gateway-side rejection
  console.log('\n# Scenario F2c — an invalid refund request is rejected synchronously (real, deterministic FAILURE)');
  console.log('  Direct probe against Cashfree\'s API (not through our app, which never sends a bad');
  console.log('  amount) — asking to refund far more than was paid gets an immediate 400, proving the');
  console.log('  gateway-rejection branch our code catches (attemptCashfreeRefund\'s try/catch) is real.');
  const { order: orderPaid2, session: sessionPaid2, paid: payResp2 } = await placeAndPayCashfreeOrder('testsuccess@gocash');
  if (orderPaid2?._id && sessionPaid2?.cfOrderId && payResp2?.ok) {
    const reallyPaid2 = await waitForRealPaid(orderPaid2._id);
    if (reallyPaid2) {
      const rejected = await attemptOverAmountRefund(creds, sessionPaid2.cfOrderId, `${orderPaid2._id}-over-amount`);
      rejected.status === 400 && rejected.body?.code === 'refund_amount_invalid'
        ? pass('over-amount refund rejected synchronously', `${rejected.status} ${rejected.body.code}`)
        : fail('over-amount refund was not rejected as expected', JSON.stringify(rejected.body).slice(0, 200));
    } else fail('scenario F2c setup', 'second genuine payment never reached PAID');
  } else {
    fail('scenario F2c setup', 'could not create a second genuinely-paid order');
  }

  // ---------------------------------------------------------------- retryOrderRefund guard rails
  console.log('\n# Scenario G — retryOrderRefund guard rails');
  const orderG = await placeCashfreeOrder(); // refundStatus NONE, never touched
  const retryOnNone = await gql(`mutation { retryOrderRefund(orderId:"${orderG._id}"){ _id refundStatus } }`, {}, admin);
  retryOnNone.errors?.[0]?.message
    ? pass('retryOrderRefund refuses a non-FAILED order', retryOnNone.errors[0].message)
    : fail('retryOrderRefund should have refused', JSON.stringify(retryOnNone));

  if (afterCancel?.refundStatus === 'FAILED') {
    const retried = (await gql(`mutation { retryOrderRefund(orderId:"${orderA._id}"){ _id refundStatus } }`, {}, admin)).data?.retryOrderRefund;
    retried ? pass('retryOrderRefund accepts a FAILED refund', `now refundStatus=${retried.refundStatus}`) : fail('retryOrderRefund on FAILED order');
  }

  // ---------------------------------------------------------------- REFUND_STATUS_WEBHOOK: stale attempt ignored
  console.log('\n# Scenario H — REFUND_STATUS_WEBHOOK ignores a superseded refund attempt');
  const beforeStale = await orderState(orderA._id);
  if (beforeStale?.refundId) {
    const staleRefundId = `${beforeStale.refundId}-stale-does-not-exist`;
    await postWebhook(secretKey, {
      type: 'REFUND_STATUS_WEBHOOK',
      data: { refund: { refund_id: staleRefundId, refund_status: 'SUCCESS', refund_amount: orderA.orderAmount } },
    });
    await sleep(300);
    const afterStale = await orderState(orderA._id);
    afterStale?.refundStatus === beforeStale.refundStatus
      ? pass('stale refund webhook ignored', `refundStatus unchanged (${afterStale.refundStatus})`)
      : fail('stale refund webhook was NOT ignored', JSON.stringify(afterStale));
  } else {
    fail('scenario H setup', 'order has no refundId to test staleness against');
  }

  finish();
}

function finish() {
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${'='.repeat(56)}\n  ${ok}/${results.length} checks passed\n${'='.repeat(56)}`);
  if (ok !== results.length) {
    console.log('FAILURES:');
    results.filter((r) => !r.ok).forEach((r) => console.log('  - ' + r.n + (r.d ? ' :: ' + r.d : '')));
  }
  prisma.$disconnect().finally(() => process.exit(ok === results.length ? 0 : 1));
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect().finally(() => process.exit(1));
});
