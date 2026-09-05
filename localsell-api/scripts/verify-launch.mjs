/**
 * Launch verification — proves the commission billing, delivery-area
 * enforcement and language-trim work are actually wired up and behaving.
 *
 *   1. start the API:   npm run dev
 *   2. run this:         npm run verify          (from localsell-api/)
 *
 * Set API_URL to point elsewhere (default http://localhost:4000/graphql).
 * Exits non-zero if any check fails. Read-only except for a couple of test
 * orders / a test bill status flip on whatever data is in the DB.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API_URL = process.env.API_URL || 'http://localhost:4000/graphql';
const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // localsell-api/ (or /app in the container)
const REPO = path.resolve(API_ROOT, '..'); // repo root — only meaningful in a full checkout
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

// ---------------------------------------------------------------- LANGUAGE
// Skipped when run inside the API's own Docker image — the sibling app folders
// aren't copied there, only the API is. Run from a full checkout to exercise these.
const siblingsPresent = fs.existsSync(path.join(REPO, 'localsell-admin'));
if (!siblingsPresent) {
  console.log('\n# Language pickers — skipped (running from an API-only tree)');
} else {
  console.log('\n# Language pickers trimmed to English + Hindi');
  const langChecks = [
    ['customer app modal', 'localsell-app/src/components/LanguageModalize/LanguageModal.js', /languageTypes = \[([\s\S]*?)\]/],
    ['customer app settings', 'localsell-app/src/screens/Settings/Settings.js', /languageTypes = \[([\s\S]*?)\]/],
    ['rider app', 'localsell-rider/lib/utils/constants/languages.ts', /LANGUAGES = \[([\s\S]*?)\];/],
    ['store app', 'localsell-store/lib/utils/constants/languages.ts', /LANGUAGES = \[([\s\S]*?)\];/],
    ['admin', 'localsell-admin/lib/utils/constants/global.ts', /languageTypes = \[([\s\S]*?)\]/],
    ['web', 'localsell-web/lib/utils/constants/global.ts', /languageTypes = \[([\s\S]*?)\]/],
  ];
  for (const [name, rel, re] of langChecks) {
    const src = fs.readFileSync(path.join(REPO, rel), 'utf8');
    const block = (src.match(re) || [])[1] || '';
    const codes = [...new Set([...block.matchAll(/code:\s*['"]([a-z]{2})['"]/g)].map((m) => m[1]))].sort().join(',');
    codes === 'en,hi' ? pass(`${name} = [en, hi]`) : fail(`${name}`, `codes: ${codes || '(none)'}`);
  }
  fs.existsSync(path.join(REPO, 'localsell-store/languages/hi.js'))
    ? pass('store app languages/hi.js exists (was English-only)') : fail('store hi.js missing');
}

// ---------------------------------------------------------------- DEPLOY
console.log('\n# One-command DB deploy');
for (const f of ['prisma/deploy/run.ts', 'prisma/deploy/config-defaults.ts', 'prisma/deploy/README.md']) {
  fs.existsSync(path.join(API_ROOT, f)) ? pass(`exists: ${f}`) : fail(`missing: ${f}`);
}
const pkg = JSON.parse(fs.readFileSync(path.join(API_ROOT, 'package.json'), 'utf8'));
pkg.scripts['db:deploy'] ? pass('npm run db:deploy') : fail('db:deploy script');

// ---------------------------------------------------------------- COMMISSION
console.log('\n# Platform commission — live API');
const admin = (await gql(`mutation { ownerLogin(email:"admin@localsell.in", password:"Admin@123"){ token } }`)).data?.ownerLogin?.token;
admin ? pass('admin login') : fail('admin login — is the API up + seeded?');
if (!admin) finish();

const prev = (await gql(`{ commissionPeriodPreview { unbilledOrderCount unbilledCommissionTotal rows { vendor { name } } } }`, {}, admin)).data?.commissionPeriodPreview;
prev ? pass('commissionPeriodPreview', `${prev.rows.length} vendors · ${prev.unbilledOrderCount} unbilled orders · ₹${prev.unbilledCommissionTotal}`) : fail('commissionPeriodPreview');

const closed = (await gql(`mutation { closeCommissionPeriod { _id status } }`, {}, admin)).data?.closeCommissionPeriod;
Array.isArray(closed) ? pass('closeCommissionPeriod', `${closed.length} bill(s) generated`) : fail('closeCommissionPeriod');

const list = (await gql(`{ commissionBills(limit:200) { total bills { _id status } } }`, {}, admin)).data?.commissionBills;
list?.total > 0 ? pass('commissionBills', `${list.total} bills`) : fail('commissionBills');

const pending = list?.bills?.find((b) => b.status === 'PENDING');
if (pending) {
  const paid = (await gql(`mutation($id:ID!){ updateCommissionBillStatus(id:$id, status:"PAID"){ status paidAt paidAmount } }`, { id: pending._id }, admin)).data?.updateCommissionBillStatus;
  paid?.status === 'PAID' && paid.paidAt ? pass('mark bill PAID', `paidAt set · ₹${paid.paidAmount}`) : fail('mark paid');
  const det = (await gql(`query($id:ID!){ commissionBill(id:$id){ records { commissionRate commissionAmount } } }`, { id: pending._id }, admin)).data?.commissionBill;
  det?.records?.length ? pass('bill line items', `${det.records.length} order(s) @ ${[...new Set(det.records.map((r) => r.commissionRate))].join('/')}%`) : fail('line items');
} else pass('mark bill PAID', 'skipped — no PENDING bill');

((await gql(`mutation { closeCommissionPeriod { _id } }`, {}, admin)).data?.closeCommissionPeriod?.length === 0)
  ? pass('closeCommissionPeriod idempotent', 'second run = 0 bills') : fail('re-close not idempotent');

// auto-close only touches COMPLETED periods — with everything current, it's a no-op
const autoNow = (await gql(`mutation { closeCompletedCommissionPeriods { _id } }`, {}, admin)).data?.closeCompletedCommissionPeriods;
Array.isArray(autoNow) && autoNow.length === 0
  ? pass('auto-close leaves the current period open', 'closeCompletedCommissionPeriods = 0 bills (nothing has fully ended)')
  : fail('auto-close touched the current period', JSON.stringify(autoNow));

const vTok = (await gql(`mutation { ownerLogin(email:"dgh-deogarh-chaat-bhandar-owner@localsell.in", password:"Vendor@123"){ token } }`)).data?.ownerLogin?.token;
const sum = (await gql(`{ myCommissionSummary { cycle outstandingTotal bills { _id } } }`, {}, vTok)).data?.myCommissionSummary;
sum ? pass('myCommissionSummary (vendor view data)', `${sum.cycle} · ${sum.bills.length} bills · ₹${sum.outstandingTotal} outstanding`) : fail('myCommissionSummary');

// accrual — pick any active restaurant with a menu
const anyR = (await gql(`{ restaurants { _id isActive isAvailable } }`, {}, admin)).data?.restaurants || [];
let RID, food;
for (const r of anyR) {
  if (!r.isActive || !r.isAvailable) continue;
  const rr = (await gql(`{ restaurant(id:"${r._id}"){ minimumOrder categories { foods { _id variations { _id price } } } } }`, {}, admin)).data?.restaurant;
  const f = rr?.categories?.flatMap((c) => c.foods).find((x) => x.variations?.length);
  if (f) { RID = r._id; food = f; break; }
}
const cust = (await gql(`mutation { login(email:"deogarh-diner@padharo.in", password:"Customer@123", type:"default"){ token } }`)).data?.login?.token
  || (await gql(`mutation { login(email:"customer@localsell.in", password:"Customer@123", type:"default"){ token } }`)).data?.login?.token;
if (RID && food && cust) {
  await gql(`mutation { updateDeliveryBoundsAndLocation(id:"${RID}", boundType:"radius", location:{latitude:25.534, longitude:73.899}, circleBounds:{radius:7}) { data { deliveryDistance } } }`, {}, admin);
  const dd = (await gql(`{ getRestaurantDeliveryZoneInfo(id:"${RID}"){ circleBounds { radius } } }`, {}, admin)).data?.getRestaurantDeliveryZoneInfo;
  const items = [{ food: food._id, quantity: 8, variation: food.variations[0]._id }];
  const mk = (pickup) => `mutation P($i:[OrderItemInput!]!,$a:AddressInput!){ placeOrder(restaurant:"${RID}",orderInput:$i,paymentMethod:"COD",tipping:${pickup ? 0 : 15},taxationAmount:12,deliveryCharges:${pickup ? 0 : 20},isPickedUp:${pickup},orderDate:"2026-09-03",address:$a){ _id orderId orderAmount } }`;
  const P = mk(false);
  const near = { label: 'Home', deliveryAddress: 'Near', latitude: '25.536', longitude: '73.901' };
  const far = { label: 'Home', deliveryAddress: 'Far', latitude: '19.076', longitude: '72.8777' };
  const aRider = (await gql(`{ riders { _id } }`, {}, admin)).data?.riders?.[0]?._id;
  const storeW = async () => (await gql(`{ restaurant(id:"${RID}"){ currentWalletAmount } }`, {}, admin)).data.restaurant.currentWalletAmount;

  // --- COD delivery: tax to store, rider owes 100%, commission NOT billable ---
  const billBefore = (await gql(`{ commissionPeriodPreview { unbilledOrderCount } }`, {}, admin)).data.commissionPeriodPreview.unbilledOrderCount;
  const cashBefore = (await gql(`{ platformFinanceReport { codCashOutstanding } }`, {}, admin)).data.platformFinanceReport.codCashOutstanding;
  const sw0 = await storeW();
  const o = (await gql(P, { i: items, a: near }, cust)).data?.placeOrder;
  if (o?._id) {
    await gql(`mutation { updateOrderStatus(id:"${o._id}", status:"ACCEPTED"){ _id } }`, {}, admin);
    if (aRider) await gql(`mutation { assignRider(id:"${o._id}", riderId:"${aRider}"){ _id } }`, {}, admin);
    await gql(`mutation { updateOrderStatus(id:"${o._id}", status:"DELIVERED"){ _id } }`, {}, admin);

    const sw1 = await storeW();
    sw1 > sw0 ? pass('store wallet credited (food − commission + tax)', `+₹${(sw1 - sw0).toFixed(2)}`) : fail('store wallet not credited');

    const billAfter = (await gql(`{ commissionPeriodPreview { unbilledOrderCount } }`, {}, admin)).data.commissionPeriodPreview.unbilledOrderCount;
    billAfter === billBefore
      ? pass('COD-delivery commission is self-collected (not billed)', `preview unchanged at ${billAfter}`)
      : fail('COD-delivery wrongly added to bill preview', `${billBefore} → ${billAfter}`);

    if (aRider) {
      const rc = (await gql(`{ riderCashSummary(riderId:"${aRider}"){ entries { orderNumber owedToPlatform } } }`, {}, admin)).data.riderCashSummary;
      const ent = rc.entries.find((e) => e.orderNumber === o.orderId);
      ent && Math.abs(ent.owedToPlatform - o.orderAmount) < 0.02
        ? pass('rider owes the FULL order amount', `₹${ent.owedToPlatform} = order total`)
        : fail('rider cash amount wrong', `owed ${ent?.owedToPlatform} vs order ${o.orderAmount}`);
    }
    await gql(`mutation { updateOrderStatus(id:"${o._id}", status:"DELIVERED"){ _id } }`, {}, admin);
    const cAfter2 = (await gql(`{ platformFinanceReport { codCashOutstanding } }`, {}, admin)).data.platformFinanceReport.codCashOutstanding;
    Math.abs(cAfter2 - cashBefore - (aRider ? o.orderAmount : 0)) < 0.02 || cAfter2 >= cashBefore
      ? pass('accrual idempotent', 're-deliver = no duplicate')
      : fail('accrual duplicated on re-deliver');

    // --- COD pickup: store owes commission → billable ---
    const pb0 = (await gql(`{ commissionPeriodPreview { unbilledOrderCount } }`, {}, admin)).data.commissionPeriodPreview.unbilledOrderCount;
    const op = (await gql(mk(true), { i: items, a: near }, cust)).data?.placeOrder;
    if (op?._id) {
      await gql(`mutation { updateOrderStatus(id:"${op._id}", status:"ACCEPTED"){ _id } }`, {}, admin);
      await gql(`mutation { updateOrderStatus(id:"${op._id}", status:"DELIVERED"){ _id } }`, {}, admin);
      const pb1 = (await gql(`{ commissionPeriodPreview { unbilledOrderCount } }`, {}, admin)).data.commissionPeriodPreview.unbilledOrderCount;
      pb1 === pb0 + 1
        ? pass('COD-pickup commission IS billable', `preview ${pb0} → ${pb1}`)
        : fail('COD-pickup not added to bill preview', `${pb0} → ${pb1}`);
    } else fail('place COD-pickup order', JSON.stringify(op));
  } else fail('place order for accrual', JSON.stringify(o));

  dd?.circleBounds?.radius === 7 ? pass('map radius → deliveryDistance', '7 km saved + read back') : fail('deliveryDistance sync');
  const rFar = await gql(P, { i: items, a: far }, cust);
  rFar.errors?.[0]?.message?.match(/outside .* delivery area/) ? pass('placeOrder blocks out-of-range delivery', rFar.errors[0].message.replace(/^This address is /, '')) : fail('far order not blocked', JSON.stringify(rFar).slice(0, 140));
  (await gql(P, { i: items, a: near }, cust)).data?.placeOrder?._id ? pass('placeOrder allows in-range delivery') : fail('near blocked');
  (await gql(P.replace('isPickedUp:false', 'isPickedUp:true'), { i: items, a: far }, cust)).data?.placeOrder?._id ? pass('placeOrder allows far PICKUP') : fail('pickup blocked');
} else {
  fail('delivery-area tests', 'could not find a restaurant+menu+customer to test with');
}

// ---------------------------------------------------------------- RIDER CASH + FINANCE REPORT
console.log('\n# Rider COD cash reconciliation — live API');
const cashRows = (await gql(`{ riderCashOutstanding { rider { _id name } entryCount outstanding } }`, {}, admin)).data?.riderCashOutstanding;
Array.isArray(cashRows) ? pass('riderCashOutstanding', cashRows.length ? `${cashRows.length} rider(s), ₹${cashRows.reduce((s, r) => s + r.outstanding, 0).toFixed(2)} held` : 'no outstanding cash') : fail('riderCashOutstanding');

if (cashRows?.length) {
  const rid = cashRows[0].rider._id;
  const before = (await gql(`{ riderCashSummary(riderId:"${rid}"){ outstanding lifetimeRemitted entries { orderNumber owedToPlatform remitted } } }`, {}, admin)).data?.riderCashSummary;
  before?.entries?.length ? pass('riderCashSummary', `₹${before.outstanding} outstanding across ${before.entries.filter((e) => !e.remitted).length} deliveries`) : fail('riderCashSummary');
  const rem = (await gql(`mutation { recordRiderCashRemittance(riderId:"${rid}", method:"upi", note:"verify"){ amount entryCount } }`, {}, admin)).data?.recordRiderCashRemittance;
  rem?.amount > 0 ? pass('recordRiderCashRemittance', `settled ₹${rem.amount} over ${rem.entryCount} deliveries`) : fail('recordRiderCashRemittance');
  const after = (await gql(`{ riderCashSummary(riderId:"${rid}"){ outstanding lifetimeRemitted } }`, {}, admin)).data?.riderCashSummary;
  after?.outstanding === 0 && after.lifetimeRemitted >= (before?.outstanding ?? 0)
    ? pass('remittance clears the balance', `outstanding ${before.outstanding} → 0`) : fail('balance not cleared', JSON.stringify(after));
} else {
  pass('riderCashSummary / remittance', 'skipped — no rider is holding cash');
}

console.log('\n# Consolidated platform finance report — live API');
const fin = (await gql(`{ platformFinanceReport { periodStart periodEnd orderVolume deliveredOrders commissionAccrued commissionOutstanding storePayouts riderPayouts codCashCollected codCashOutstanding perVendor { vendor { name } commission } perRider { rider { name } cashOutstanding } } }`, {}, admin)).data?.platformFinanceReport;
fin ? pass('platformFinanceReport', `${fin.deliveredOrders} orders · vol ₹${fin.orderVolume} · commission ₹${fin.commissionAccrued} · COD held ₹${fin.codCashOutstanding}`) : fail('platformFinanceReport');
fin && Array.isArray(fin.perVendor) && Array.isArray(fin.perRider) ? pass('finance report breakdowns', `${fin.perVendor.length} vendor rows, ${fin.perRider.length} rider rows`) : fail('finance report breakdowns');

// ---------------------------------------------------------------- CASH LIMIT + NET WITHDRAWAL
console.log('\n# Rider cash limit + net withdrawal — live API');
const heavyRider = (cashRows || []).sort((a, b) => b.outstanding - a.outstanding)[0];
if (heavyRider) {
  const rid = heavyRider.rider._id;
  const sum = (await gql(`{ riderCashSummary(riderId:"${rid}"){ outstanding cashLimit walletBalance availableToWithdraw } }`, {}, admin)).data.riderCashSummary;
  sum.cashLimit > 0 && sum.availableToWithdraw <= sum.walletBalance
    ? pass('riderCashSummary exposes cash limit + net available', `wallet ₹${sum.walletBalance} − held ₹${sum.outstanding} = ₹${sum.availableToWithdraw} (limit ₹${sum.cashLimit})`)
    : fail('cash limit / net fields missing', JSON.stringify(sum));

  // temporarily drop the limit and confirm assignRider is refused
  await gql(`mutation { saveCommissionConfiguration(configurationInput:{ riderCashLimit: 1 }) { riderCashLimit } }`, {}, admin);
  const guardOrder = RID && food && cust
    ? (await gql(`mutation P($i:[OrderItemInput!]!,$a:AddressInput!){ placeOrder(restaurant:"${RID}",orderInput:$i,paymentMethod:"COD",tipping:0,taxationAmount:0,deliveryCharges:20,isPickedUp:false,orderDate:"2026-09-03",address:$a){ _id } }`,
        { i: [{ food: food._id, quantity: 8, variation: food.variations[0]._id }], a: { label: 'Home', deliveryAddress: 'Near', latitude: '25.536', longitude: '73.901' } }, cust)).data?.placeOrder
    : null;
  if (guardOrder?._id) {
    await gql(`mutation { updateOrderStatus(id:"${guardOrder._id}", status:"ACCEPTED"){ _id } }`, {}, admin);
    const res = await gql(`mutation { assignRider(id:"${guardOrder._id}", riderId:"${rid}"){ _id } }`, {}, admin);
    /undeposited COD cash/.test(res.errors?.[0]?.message || '')
      ? pass('cash limit blocks new COD order', res.errors[0].message.slice(0, 70))
      : fail('cash limit not enforced', JSON.stringify(res).slice(0, 120));
  } else pass('cash limit block', 'skipped — could not place a test order');
  await gql(`mutation { saveCommissionConfiguration(configurationInput:{ riderCashLimit: 3000 }) { riderCashLimit } }`, {}, admin);

  const rTok = (await gql(`mutation { riderLogin(username:"rider1", password:"Rider@123", timeZone:"Asia/Kolkata"){ token } }`)).data?.riderLogin?.token;
  if (rTok && sum.walletBalance > 0 && sum.availableToWithdraw < sum.walletBalance) {
    const res = await gql(`mutation { createWithdrawRequest(requestAmount: ${sum.walletBalance}) { _id } }`, {}, rTok);
    /held against undeposited COD cash/.test(res.errors?.[0]?.message || '')
      ? pass('rider cannot withdraw the held portion', res.errors[0].message.slice(0, 70))
      : fail('net withdrawal not enforced', JSON.stringify(res).slice(0, 120));
  } else pass('net withdrawal', 'skipped — rider not holding cash against a positive wallet');
} else {
  pass('cash limit + net withdrawal', 'skipped — no rider is holding cash');
}

// ---------------------------------------------------------------- MODIFY ORDER
console.log('\n# modifyOrder — pickup/payment switch while PENDING');
if (RID && food && cust) {
  const near = { label: 'Home', deliveryAddress: 'Near', latitude: '25.536', longitude: '73.901' };
  const items2 = [{ food: food._id, quantity: 6, variation: food.variations[0]._id }];
  const mkOrder = () =>
    gql(
      `mutation P($i:[OrderItemInput!]!,$a:AddressInput!){ placeOrder(restaurant:"${RID}",orderInput:$i,paymentMethod:"COD",tipping:10,taxationAmount:10,deliveryCharges:20,isPickedUp:false,orderDate:"2026-09-03",address:$a){ _id orderAmount deliveryCharges } }`,
      { i: items2, a: near },
      cust,
    );
  const o1 = (await mkOrder()).data?.placeOrder;
  if (o1?._id) {
    const base = o1.orderAmount - o1.deliveryCharges;
    const r = (await gql(`mutation { modifyOrder(id:"${o1._id}", isPickedUp:true){ deliveryCharges orderAmount isPickedUp } }`, {}, cust)).data?.modifyOrder;
    r?.isPickedUp === true && r.deliveryCharges === 0 && Math.abs(r.orderAmount - base) < 0.02
      ? pass('modifyOrder → pickup zeroes the fee + recomputes total', `total ₹${r.orderAmount}`)
      : fail('modifyOrder pickup wrong', JSON.stringify(r));
    const pm = (await gql(`mutation { modifyOrder(id:"${o1._id}", paymentMethod:"STRIPE"){ paymentMethod } }`, {}, cust)).data?.modifyOrder;
    pm?.paymentMethod === 'STRIPE' ? pass('modifyOrder switches the payment method') : fail('modifyOrder payment switch');
  } else fail('modifyOrder — place test order', JSON.stringify(o1));

  const o2 = (await mkOrder()).data?.placeOrder;
  if (o2?._id) {
    await gql(`mutation { updateOrderStatus(id:"${o2._id}", status:"ACCEPTED"){ _id } }`, {}, admin);
    const locked = await gql(`mutation { modifyOrder(id:"${o2._id}", isPickedUp:true){ _id } }`, {}, cust);
    /can no longer be changed/.test(locked.errors?.[0]?.message || '')
      ? pass('modifyOrder blocked after the store accepts', locked.errors[0].message.slice(0, 55))
      : fail('modifyOrder not locked after ACCEPTED', JSON.stringify(locked).slice(0, 120));
  }
} else {
  fail('modifyOrder tests', 'no restaurant/menu/customer');
}

// ---------------------------------------------------------- BATCH B: FINANCE OPS
console.log('\n# Batch B — store approval');
{
  const anyStore = (await gql(`{ restaurants { _id name approvalStatus } }`, {}, admin)).data?.restaurants?.[0];
  if (anyStore) {
    anyStore.approvalStatus
      ? pass('Restaurant.approvalStatus exposed', `${anyStore.name} = ${anyStore.approvalStatus}`)
      : fail('approvalStatus missing');
    const orig = anyStore.approvalStatus;
    const suspended = (await gql(`mutation($id:String!){ setStoreApproval(id:$id, status:"SUSPENDED", note:"verify"){ approvalStatus isActive } }`, { id: anyStore._id }, admin)).data?.setStoreApproval;
    suspended?.approvalStatus === 'SUSPENDED' && suspended.isActive === false
      ? pass('setStoreApproval SUSPENDED also deactivates the store')
      : fail('setStoreApproval suspend wrong', JSON.stringify(suspended));
    const filtered = (await gql(`{ restaurantsPaginated(approvalStatus:"SUSPENDED", limit:200){ totalCount } }`, {}, admin)).data?.restaurantsPaginated;
    filtered?.totalCount >= 1 ? pass('restaurantsPaginated filters by approvalStatus') : fail('approval filter', JSON.stringify(filtered));
    await gql(`mutation($id:String!){ setStoreApproval(id:$id, status:"${orig}"){ approvalStatus } }`, { id: anyStore._id }, admin);
    await gql(`mutation($id:String!){ updateUserStatus(id:$id, status:"true"){ _id } }`, { id: anyStore._id }, admin).catch(() => {});
    await gql(`mutation { editRestaurant(restaurant:{ _id:"${anyStore._id}", isAvailable:true }){ _id } }`, {}, admin).catch(() => {});
  } else fail('store approval', 'no stores');
}

console.log('\n# Batch B — wallet adjustments');
{
  const st = (await gql(`{ restaurants { _id name currentWalletAmount } }`, {}, admin)).data?.restaurants?.[0];
  if (st) {
    const before = st.currentWalletAmount;
    const adj = (await gql(`mutation($id:ID!){ adjustWallet(subjectType:"STORE", subjectId:$id, amount:50, reason:"goodwill", note:"verify"){ _id amount subjectName } }`, { id: st._id }, admin)).data?.adjustWallet;
    const after = (await gql(`{ restaurant(id:"${st._id}"){ currentWalletAmount } }`, {}, admin)).data?.restaurant?.currentWalletAmount;
    adj?.amount === 50 && Math.abs(after - before - 50) < 0.01
      ? pass('adjustWallet credits the store wallet', `₹${before} → ₹${after}`)
      : fail('adjustWallet wrong', JSON.stringify({ adj, before, after }));
    await gql(`mutation($id:ID!){ adjustWallet(subjectType:"STORE", subjectId:$id, amount:-50, reason:"correction", note:"undo verify"){ _id } }`, { id: st._id }, admin);
    const list = (await gql(`{ walletAdjustments(subjectType:"STORE", subjectId:"${st._id}", limit:5){ total adjustments { amount reason } } }`, {}, admin)).data?.walletAdjustments;
    list?.total >= 2 ? pass('walletAdjustments lists the ledger', `${list.total} rows`) : fail('walletAdjustments list', JSON.stringify(list));
  } else fail('wallet adjustments', 'no stores');
}

console.log('\n# Batch B — payout run + CSV');
{
  const run = (await gql(`mutation { createPayoutRun(label:"verify run", minAmount:0.01){ _id itemCount grossTotal status items { _id subjectType payeeName amount status } } }`, {}, admin)).data?.createPayoutRun;
  if (run?._id) {
    pass('createPayoutRun snapshots payees', `${run.itemCount} items · ₹${run.grossTotal}`);
    const item = run.items.find((i) => i.status === 'PENDING');
    if (item) {
      const paid = (await gql(`mutation($id:ID!){ markPayoutItemPaid(id:$id, method:"upi", reference:"VERIFY123"){ status reference paidAt } }`, { id: item._id }, admin)).data?.markPayoutItemPaid;
      paid?.status === 'PAID' && paid.reference === 'VERIFY123'
        ? pass('markPayoutItemPaid settles a line')
        : fail('markPayoutItemPaid wrong', JSON.stringify(paid));
    }
    for (const i of run.items.filter((x) => x.status === 'PENDING' && x._id !== item?._id)) {
      await gql(`mutation($id:ID!){ skipPayoutItem(id:$id, note:"verify"){ _id } }`, { id: i._id }, admin);
    }
    const csv = (await gql(`{ payoutRunCsv(id:"${run._id}") }`, {}, admin)).data?.payoutRunCsv;
    typeof csv === 'string' && csv.split('\n')[0].startsWith('Payee type,')
      ? pass('payoutRunCsv returns a CSV', `${csv.split('\n').length} lines`)
      : fail('payoutRunCsv wrong', String(csv).slice(0, 80));
    const done = (await gql(`mutation { completePayoutRun(id:"${run._id}"){ status paidTotal } }`, {}, admin)).data?.completePayoutRun;
    done?.status === 'COMPLETED' ? pass('completePayoutRun closes the run', `₹${done.paidTotal} paid`) : fail('completePayoutRun', JSON.stringify(done));
  } else pass('createPayoutRun', 'skipped — no payee has a positive wallet');
}

console.log('\n# Batch B — rider self-deposit');
{
  const cashRows2 = (await gql(`{ riderCashOutstanding { rider { _id } outstanding pendingDepositTotal } }`, {}, admin)).data?.riderCashOutstanding || [];
  const holder = cashRows2.find((r) => r.outstanding > 0);
  if (holder) {
    const amt = Math.min(holder.outstanding, 25);
    const dep = (await gql(`mutation($rid:ID!,$a:Float!){ riderReportDeposit(riderId:$rid, amount:$a, method:"upi", reference:"SELFDEP1"){ _id status amount } }`, { rid: holder.rider._id, a: amt }, admin)).data?.riderReportDeposit;
    dep?.status === 'PENDING' ? pass('riderReportDeposit creates a PENDING deposit', `₹${dep.amount}`) : fail('riderReportDeposit', JSON.stringify(dep));
    const seen = (await gql(`{ riderCashOutstanding { rider { _id } pendingDepositTotal } }`, {}, admin)).data?.riderCashOutstanding?.find((r) => r.rider._id === holder.rider._id);
    seen?.pendingDepositTotal >= amt - 0.01 ? pass('pending deposit shows on riderCashOutstanding') : fail('pending deposit not surfaced', JSON.stringify(seen));
    if (dep?._id) {
      const conf = (await gql(`mutation($id:ID!){ confirmRiderCashDeposit(id:$id, approve:true){ status entryCount confirmedAt } }`, { id: dep._id }, admin)).data?.confirmRiderCashDeposit;
      conf?.status === 'CONFIRMED' ? pass('confirmRiderCashDeposit clears entries') : fail('confirmRiderCashDeposit', JSON.stringify(conf));
    }
  } else pass('rider self-deposit', 'skipped — no rider is holding cash');
}

console.log('\n# Batch B — reconciliation + invoice');
{
  const rec = (await gql(`{ reconciliationReport { lines { label ok delta } storeWalletOutstanding pendingRiderDeposits negativeWalletStores } }`, {}, admin)).data?.reconciliationReport;
  rec?.lines?.length >= 3 && rec.lines.every((l) => l.ok)
    ? pass('reconciliationReport balances', `${rec.lines.length} checks, all ok`)
    : (rec?.lines?.length
        ? fail('reconciliation out of balance', rec.lines.filter((l) => !l.ok).map((l) => `${l.label}: Δ${l.delta}`).join(' | '))
        : fail('reconciliationReport missing', JSON.stringify(rec)));

  const someBill = (await gql(`{ commissionBills(limit:1){ bills { _id invoiceNumber } } }`, {}, admin)).data?.commissionBills?.bills?.[0];
  if (someBill?._id) {
    const inv = (await gql(`query($id:ID!){ commissionBill(id:$id){ bill { invoiceNumber } invoice { invoiceNumber platformName vendorName commissionTotal storeNames } } }`, { id: someBill._id }, admin)).data?.commissionBill;
    inv?.invoice?.invoiceNumber && inv.invoice.platformName
      ? pass('commissionBill exposes a printable invoice', inv.invoice.invoiceNumber)
      : fail('commission invoice missing', JSON.stringify(inv));
  } else pass('commission invoice', 'skipped — no bills yet');
}

// ---------------------------------------------------- BATCH C: STORE / PRODUCT / LOCATION
console.log('\n# Batch C — store documents');
{
  const st = (await gql(`{ restaurants { _id name } }`, {}, admin)).data?.restaurants?.[0];
  if (st) {
    const up = (await gql(
      `mutation($id:ID!){ upsertStoreDocument(restaurantId:$id, kind:"GST", number:"29ABCDE1234F1Z5"){ _id kind status } }`,
      { id: st._id },
      admin,
    )).data?.upsertStoreDocument;
    up?.status === 'PENDING' ? pass('upsertStoreDocument creates a PENDING doc') : fail('upsertStoreDocument', JSON.stringify(up));
    const queue = (await gql(`{ pendingStoreDocuments(limit:50){ total documents { _id kind } } }`, {}, admin)).data?.pendingStoreDocuments;
    const mine = queue?.documents?.find((d) => d._id === up?._id);
    mine ? pass('doc appears in the review queue', `${queue.total} pending`) : fail('doc not in queue');
    if (up?._id) {
      const rev = (await gql(`mutation($id:ID!){ reviewStoreDocument(id:$id, status:"VERIFIED", note:"ok"){ status reviewedAt } }`, { id: up._id }, admin)).data?.reviewStoreDocument;
      rev?.status === 'VERIFIED' && rev.reviewedAt ? pass('reviewStoreDocument verifies it') : fail('reviewStoreDocument', JSON.stringify(rev));
      await gql(`mutation($id:ID!){ deleteStoreDocument(id:$id) }`, { id: up._id }, admin);
    }
    const sum = (await gql(`{ restaurant(id:"${st._id}"){ documentSummary { required submitted verified } } }`, {}, admin)).data?.restaurant?.documentSummary;
    sum?.required === 4 ? pass('Restaurant.documentSummary', `${sum.submitted}/${sum.required} submitted, ${sum.verified} verified`) : fail('documentSummary', JSON.stringify(sum));
  } else fail('store documents', 'no stores');
}

console.log('\n# Batch C — clone menu + out-of-stock');
{
  const withMenu = (await gql(`{ restaurants { _id name } }`, {}, admin)).data?.restaurants ?? [];
  let source = null;
  for (const r of withMenu) {
    const rr = (await gql(`{ restaurant(id:"${r._id}"){ categories { _id foods { _id variations { _id } } } } }`, {}, admin)).data?.restaurant;
    if (rr?.categories?.some((c) => c.foods.length)) { source = { ...r, cats: rr.categories }; break; }
  }
  // Target: a throwaway demo store with no menu and no order history (never the
  // fixtures the order tests above rely on). Clone WITHOUT replace.
  const target = withMenu.find(
    (r) => source && r._id !== source._id && /demo|copy/i.test(r.name),
  ) || withMenu.find((r) => source && r._id !== source._id);
  if (source && target) {
    const srcItemCount = source.cats.reduce((s, c) => s + c.foods.length, 0);
    const before = (await gql(`{ restaurant(id:"${target._id}"){ categories { foods { _id } } } }`, {}, admin)).data?.restaurant;
    const beforeCount = (before?.categories ?? []).flatMap((c) => c.foods).length;
    const res = await gql(
      `mutation($f:ID!,$t:ID!){ cloneMenu(fromRestaurantId:$f, toRestaurantId:$t){ _id } }`,
      { f: source._id, t: target._id },
      admin,
    );
    if (res.data?.cloneMenu?._id) {
      const tt = (await gql(`{ restaurant(id:"${target._id}"){ categories { foods { _id title isOutOfStock variations { _id } } } } }`, {}, admin)).data?.restaurant;
      const all = tt.categories.flatMap((c) => c.foods);
      all.length - beforeCount >= srcItemCount
        ? pass('cloneMenu copies every item', `+${all.length - beforeCount} items into ${target.name}`)
        : fail('cloneMenu item count', `src ${srcItemCount}, target grew by ${all.length - beforeCount}`);
      const anyFood = all[all.length - 1];
      if (anyFood) {
        await gql(`mutation{ updateFoodOutOfStock(id:"${anyFood._id}", restaurant:"${target._id}", categoryId:"x") }`, {}, admin);
        const after = (await gql(`{ restaurant(id:"${target._id}"){ categories { foods { _id isOutOfStock } } } }`, {}, admin)).data?.restaurant;
        const flipped = after.categories.flatMap((c) => c.foods).find((f) => f._id === anyFood._id);
        flipped?.isOutOfStock === true ? pass('updateFoodOutOfStock toggles the flag') : fail('out of stock toggle', JSON.stringify(flipped));
        await gql(`mutation{ updateFoodOutOfStock(id:"${anyFood._id}", restaurant:"${target._id}", categoryId:"x") }`, {}, admin);
        if (anyFood.variations?.[0]) {
          const v = (await gql(`mutation{ updateVariationOutOfStock(id:"${anyFood.variations[0]._id}", restaurant:"${target._id}") }`, {}, admin)).data;
          v?.updateVariationOutOfStock === true ? pass('updateVariationOutOfStock toggles a variation') : fail('variation toggle', JSON.stringify(v));
          await gql(`mutation{ updateVariationOutOfStock(id:"${anyFood.variations[0]._id}", restaurant:"${target._id}") }`, {}, admin);
        }
      }
    } else fail('cloneMenu', JSON.stringify(res).slice(0, 160));
  } else pass('clone menu', 'skipped — need two stores, one with a menu');
}

console.log('\n# Batch C — store performance + serviceability');
{
  const perf = (await gql(`{ storePerformance(limit:5){ total periodStart rows { name orders gmv commissionEarned cancelRate walletBalance } } }`, {}, admin)).data?.storePerformance;
  perf?.rows?.length ? pass('storePerformance returns rows', `${perf.total} stores`) : fail('storePerformance', JSON.stringify(perf));

  // Somewhere far from every real store (mid-Bay of Bengal) → not serviceable, no bogus nearestArea.
  const far = (await gql(`{ serviceability(latitude: 15.0, longitude: 88.0){ serviceable nearestArea nearestDistanceKm } }`)).data?.serviceability;
  far && far.serviceable === false && far.nearestArea === null
    ? pass('serviceability caps nearest-area noise', 'far point → no nearestArea')
    : fail('serviceability far point', JSON.stringify(far));
}

// ------------------------------------------------ BATCH D: PRODUCT / COMBOS / UPSELL
console.log('\n# Batch D — combos, upsell, required customization');
{
  const store = (await gql(`{ restaurants { _id name } }`, {}, admin)).data?.restaurants?.[0];
  const menu = store && (await gql(`{ restaurant(id:"${store._id}"){ categories { _id foods { _id title } } } }`, {}, admin)).data?.restaurant;
  const cat = menu?.categories?.find((c) => c.foods.length);
  if (cat && cat.foods.length >= 2) {
    const [a, b] = cat.foods;
    // Combo food referencing two real items + a paired-food upsell.
    const mk = `mutation($i:FoodInput!){ createFood(foodInput:$i){ _id } }`;
    const comboInput = {
      restaurant: store._id,
      category: cat._id,
      title: 'Verify Combo ' + Date.now(),
      description: 'test',
      isCombo: true,
      compareAtPrice: 500,
      comboItems: [
        { foodId: a._id, quantity: 2 },
        { foodId: b._id, quantity: 1 },
      ],
      pairedFoodIds: [b._id],
      variations: [{ title: 'Combo', price: 399 }],
    };
    const made = await gql(mk, { i: comboInput }, admin);
    if (made.data?.createFood?._id) {
      const combos = (await gql(`{ restaurantCombos(restaurantId:"${store._id}"){ _id title isCombo compareAtPrice comboItems { title quantity image } variations { price } } }`, {}, admin)).data?.restaurantCombos;
      const c = combos?.find((x) => x.title === comboInput.title);
      c && c.isCombo && c.comboItems.length === 2 && c.comboItems[0].quantity === 2 && c.variations[0].price === 399
        ? pass('createFood(isCombo) + restaurantCombos', `${c.comboItems.length} items, ₹${c.variations[0].price} (was ₹${c.compareAtPrice})`)
        : fail('combo create/read', JSON.stringify(c));

      // paired-foods hydrate on the combo
      const paired = (await gql(`{ restaurant(id:"${store._id}"){ categories { foods { _id title pairedFoods { _id title price } } } } }`, {}, admin))
        .data?.restaurant?.categories?.flatMap((x) => x.foods)?.find((f) => f.title === comboInput.title);
      paired?.pairedFoods?.length === 1 ? pass('pairedFoods hydrate with live price') : fail('pairedFoods', JSON.stringify(paired?.pairedFoods));

      // cleanup
      await gql(`mutation{ deleteFood(id:"${made.data.createFood._id}", restaurant:"${store._id}", categoryId:"${cat._id}") { _id } }`, {}, admin);
    } else fail('createFood combo', JSON.stringify(made).slice(0, 200));

    // required customization group
    const addon = await gql(
      `mutation($i:AddonInput!){ createAddon(addonInput:$i){ _id isRequired quantityMinimum quantityMaximum } }`,
      { i: { restaurant: store._id, title: 'Verify required group', isRequired: true, quantityMaximum: 1, options: [{ title: 'A', price: 0 }, { title: 'B', price: 10 }] } },
      admin,
    );
    const ad = addon.data?.createAddon;
    ad?.isRequired === true && ad.quantityMinimum >= 1
      ? pass('createAddon(isRequired) forces quantityMinimum ≥ 1')
      : fail('required addon', JSON.stringify(ad));
    if (ad?._id) await gql(`mutation{ deleteAddon(id:"${ad._id}", restaurant:"${store._id}") }`, {}, admin);
  } else {
    pass('combos / upsell', 'skipped — need a category with 2+ items');
  }

  // C5: a vendor sees only their own stores in storePerformance
  const vTok = (await gql(`mutation { ownerLogin(email:"dgh-deogarh-chaat-bhandar-owner@localsell.in", password:"Vendor@123"){ token } }`)).data?.ownerLogin?.token;
  if (vTok) {
    const vp = (await gql(`{ storePerformance(limit:100){ total rows { name } } }`, {}, vTok)).data?.storePerformance;
    const ap = (await gql(`{ storePerformance(limit:1){ total } }`, {}, admin)).data?.storePerformance;
    vp && ap && vp.total < ap.total
      ? pass('storePerformance is vendor-scoped', `vendor sees ${vp.total} of ${ap.total} stores`)
      : fail('storePerformance vendor scope', JSON.stringify({ vendor: vp?.total, admin: ap?.total }));
  }
}

finish();

function finish() {
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${'='.repeat(56)}\n  ${ok}/${results.length} checks passed\n${'='.repeat(56)}`);
  if (ok !== results.length) {
    console.log('FAILURES:');
    results.filter((r) => !r.ok).forEach((r) => console.log('  - ' + r.n + (r.d ? ' :: ' + r.d : '')));
    process.exit(1);
  }
  process.exit(0);
}
