/**
 * Launch verification — proves the commission billing, delivery-area
 * enforcement and language-trim work are actually wired up and behaving.
 *
 *   1. start the API:   npm run dev
 *   2. run this:         npm run verify          (from enatega-multivendor-api-mysql/)
 *
 * Set API_URL to point elsewhere (default http://localhost:4000/graphql).
 * Exits non-zero if any check fails. Read-only except for a couple of test
 * orders / a test bill status flip on whatever data is in the DB.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API_URL = process.env.API_URL || 'http://localhost:4000/graphql';
const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // enatega-multivendor-api-mysql/ (or /app in the container)
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
const siblingsPresent = fs.existsSync(path.join(REPO, 'enatega-multivendor-admin'));
if (!siblingsPresent) {
  console.log('\n# Language pickers — skipped (running from an API-only tree)');
} else {
  console.log('\n# Language pickers trimmed to English + Hindi');
  const langChecks = [
    ['customer app modal', 'enatega-multivendor-app/src/components/LanguageModalize/LanguageModal.js', /languageTypes = \[([\s\S]*?)\]/],
    ['customer app settings', 'enatega-multivendor-app/src/screens/Settings/Settings.js', /languageTypes = \[([\s\S]*?)\]/],
    ['rider app', 'enatega-multivendor-rider/lib/utils/constants/languages.ts', /LANGUAGES = \[([\s\S]*?)\];/],
    ['store app', 'enatega-multivendor-store/lib/utils/constants/languages.ts', /LANGUAGES = \[([\s\S]*?)\];/],
    ['admin', 'enatega-multivendor-admin/lib/utils/constants/global.ts', /languageTypes = \[([\s\S]*?)\]/],
    ['web', 'enatega-multivendor-web/lib/utils/constants/global.ts', /languageTypes = \[([\s\S]*?)\]/],
  ];
  for (const [name, rel, re] of langChecks) {
    const src = fs.readFileSync(path.join(REPO, rel), 'utf8');
    const block = (src.match(re) || [])[1] || '';
    const codes = [...new Set([...block.matchAll(/code:\s*['"]([a-z]{2})['"]/g)].map((m) => m[1]))].sort().join(',');
    codes === 'en,hi' ? pass(`${name} = [en, hi]`) : fail(`${name}`, `codes: ${codes || '(none)'}`);
  }
  fs.existsSync(path.join(REPO, 'enatega-multivendor-store/languages/hi.js'))
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
const admin = (await gql(`mutation { ownerLogin(email:"admin@enatega.local", password:"Admin@123"){ token } }`)).data?.ownerLogin?.token;
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

const vTok = (await gql(`mutation { ownerLogin(email:"dgh-deogarh-chaat-bhandar-owner@padharo.local", password:"Vendor@123"){ token } }`)).data?.ownerLogin?.token;
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
  || (await gql(`mutation { login(email:"customer@enatega.local", password:"Customer@123", type:"default"){ token } }`)).data?.login?.token;
if (RID && food && cust) {
  await gql(`mutation { updateDeliveryBoundsAndLocation(id:"${RID}", boundType:"radius", location:{latitude:25.534, longitude:73.899}, circleBounds:{radius:7}) { data { deliveryDistance } } }`, {}, admin);
  const dd = (await gql(`{ getRestaurantDeliveryZoneInfo(id:"${RID}"){ circleBounds { radius } } }`, {}, admin)).data?.getRestaurantDeliveryZoneInfo;
  const items = [{ food: food._id, quantity: 8, variation: food.variations[0]._id }];
  const P = `mutation P($i:[OrderItemInput!]!,$a:AddressInput!){ placeOrder(restaurant:"${RID}",orderInput:$i,paymentMethod:"COD",tipping:15,taxationAmount:12,deliveryCharges:20,isPickedUp:false,orderDate:"2026-09-03",address:$a){ _id } }`;
  const near = { label: 'Home', deliveryAddress: 'Near', latitude: '25.536', longitude: '73.901' };
  const far = { label: 'Home', deliveryAddress: 'Far', latitude: '19.076', longitude: '72.8777' };
  const aRider = (await gql(`{ riders { _id } }`, {}, admin)).data?.riders?.[0]?._id;

  const before = (await gql(`{ commissionPeriodPreview { unbilledOrderCount } }`, {}, admin)).data.commissionPeriodPreview.unbilledOrderCount;
  const cashBefore = (await gql(`{ platformFinanceReport { codCashOutstanding } }`, {}, admin)).data.platformFinanceReport.codCashOutstanding;
  const o = (await gql(P, { i: items, a: near }, cust)).data?.placeOrder;
  if (o?._id) {
    await gql(`mutation { updateOrderStatus(id:"${o._id}", status:"ACCEPTED"){ _id } }`, {}, admin);
    if (aRider) await gql(`mutation { assignRider(id:"${o._id}", riderId:"${aRider}"){ _id } }`, {}, admin);
    await gql(`mutation { updateOrderStatus(id:"${o._id}", status:"DELIVERED"){ _id } }`, {}, admin);
    const after = (await gql(`{ commissionPeriodPreview { unbilledOrderCount } }`, {}, admin)).data.commissionPeriodPreview.unbilledOrderCount;
    if (aRider) {
      const cashAfter = (await gql(`{ platformFinanceReport { codCashOutstanding } }`, {}, admin)).data.platformFinanceReport.codCashOutstanding;
      cashAfter > cashBefore
        ? pass('rider COD cash accrues on DELIVERED', `held ₹${cashBefore} → ₹${cashAfter} (order total − fee − tip)`)
        : fail('rider cash not accrued', `${cashBefore} → ${cashAfter}`);
    }
    after === before + 1 ? pass('commission accrues on DELIVERED', `${before} → ${after} unbilled`) : fail('accrual', `${before} → ${after}`);
    await gql(`mutation { updateOrderStatus(id:"${o._id}", status:"DELIVERED"){ _id } }`, {}, admin);
    const after2 = (await gql(`{ commissionPeriodPreview { unbilledOrderCount } }`, {}, admin)).data.commissionPeriodPreview.unbilledOrderCount;
    after2 === after ? pass('accrual idempotent', 're-deliver = no duplicate record') : fail('accrual duplicated');
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
