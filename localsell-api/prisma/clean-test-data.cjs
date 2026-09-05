// npm run db:clean-test-data
//
// Keeps only the real MVP data (base admin/staff/rider accounts + the 8 real
// Deogarh vendors/stores + the Deogarh review account) and removes every
// QA/test/demo/Ahmedabad/sample row accumulated during development. Safe to
// re-run (it recomputes the keep-list each time; a second run just finds
// nothing left to delete) — but it is a real DELETE against whatever
// DATABASE_URL points at, so don't run it against a production database that
// has genuine customer/vendor data you don't want gone.
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const KEEP_USER_EMAILS = [
  'admin@localsell.in',
  'staff@localsell.in',
  'vendor@localsell.in',   // base seed.ts fixture — Sample Restaurant, now Deogarh-located
  'vendor2@localsell.in',  // base seed.ts fixture — Pizza Palace, now Deogarh-located
  'customer@localsell.in', // base seed.ts fixture — used by npm run verify
  'rider1@localsell.in',
  'rider2@localsell.in',
  'deogarh-diner@localsell.in', // seed-deogarh.ts reviewer account — wrong old domain, fix separately
  'deogarh-diner@padharo.in',   // in case the rebrand-emails pass didn't catch this variant
  'dgh-aravalli-cafe-snacks-owner@localsell.in',
  'dgh-deogarh-chaat-bhandar-owner@localsell.in',
  'dgh-deogarh-mahal-rasoi-owner@localsell.in',
  'dgh-highway-dhaba-deogarh-owner@localsell.in',
  'dgh-krishna-kirana-provision-owner@localsell.in',
  'dgh-marwari-rasoi-owner@localsell.in',
  'dgh-rathore-bhojanalaya-owner@localsell.in',
  'dgh-shrinath-mishthan-bhandar-owner@localsell.in',
];

const KEEP_RESTAURANT_SLUGS = [
  'sample-restaurant', // base seed.ts fixture, now Deogarh-located
  'pizza-palace',      // base seed.ts fixture, now Deogarh-located
  'dgh-deogarh-mahal-rasoi',
  'dgh-rathore-bhojanalaya',
  'dgh-shrinath-mishthan-bhandar',
  'dgh-marwari-rasoi',
  'dgh-aravalli-cafe-snacks',
  'dgh-highway-dhaba-deogarh',
  'dgh-deogarh-chaat-bhandar',
  'dgh-krishna-kirana-provision',
];

async function main() {
  const keepUsers = await p.user.findMany({ where: { email: { in: KEEP_USER_EMAILS } }, select: { id: true, email: true } });
  const keepUserIds = new Set(keepUsers.map((u) => u.id));
  console.log('Keeping', keepUsers.length, 'users:', keepUsers.map((u) => u.email).join(', '));

  // Fix the reviewer account's domain if it's still on the pre-rebrand one.
  const staleReviewer = keepUsers.find((u) => u.email === 'deogarh-diner@padharo.in');
  if (staleReviewer) {
    await p.user.update({ where: { id: staleReviewer.id }, data: { email: 'deogarh-diner@localsell.in' } });
    console.log('Renamed deogarh-diner@padharo.in -> deogarh-diner@localsell.in');
  }

  const keepRestaurants = await p.restaurant.findMany({ where: { slug: { in: KEEP_RESTAURANT_SLUGS } }, select: { id: true, slug: true } });
  const keepRestaurantIds = new Set(keepRestaurants.map((r) => r.id));
  console.log('Keeping', keepRestaurants.length, 'restaurants:', keepRestaurants.map((r) => r.slug).join(', '));

  if (keepRestaurants.length !== KEEP_RESTAURANT_SLUGS.length) {
    throw new Error('Not all 8 Deogarh restaurants were found — aborting before deleting anything.');
  }

  // ---- 1. Orders: delete anything NOT purely between kept parties ----
  const allOrders = await p.order.findMany({ select: { id: true, restaurantId: true, userId: true, riderId: true } });
  const deleteOrderIds = allOrders
    .filter((o) => !(keepRestaurantIds.has(o.restaurantId) && keepUserIds.has(o.userId) && (!o.riderId || keepUserIds.has(o.riderId))))
    .map((o) => o.id);
  console.log(`Deleting ${deleteOrderIds.length} of ${allOrders.length} orders (cascades items/reviews/chat)...`);
  for (let i = 0; i < deleteOrderIds.length; i += 200) {
    await p.order.deleteMany({ where: { id: { in: deleteOrderIds.slice(i, i + 200) } } });
  }

  // ---- 2. Restaurants not in the keep list (cascades menu/coupons/docs/etc.) ----
  const deleteRestaurants = await p.restaurant.findMany({ where: { id: { notIn: [...keepRestaurantIds] } }, select: { id: true, ownerId: true, name: true } });
  console.log(`Deleting ${deleteRestaurants.length} restaurants...`);
  for (const r of deleteRestaurants) {
    await p.restaurant.delete({ where: { id: r.id } });
  }
  const deleteRestaurantIds = deleteRestaurants.map((r) => r.id);
  const deleteVendorOwnerIds = deleteRestaurants.map((r) => r.ownerId);

  // ---- 3. Ledger rows with no FK (won't block deletion, but are now orphaned garbage) ----
  const orphanRiderIds = [...keepUserIds].length
    ? (await p.user.findMany({ where: { userType: 'RIDER', id: { notIn: [...keepUserIds] } }, select: { id: true } })).map((u) => u.id)
    : [];
  const ledgerCleanup = [
    p.commissionRecord.deleteMany({ where: { OR: [{ restaurantId: { in: deleteRestaurantIds } }, { vendorId: { in: deleteVendorOwnerIds } }] } }),
    p.commissionBill.deleteMany({ where: { vendorId: { in: deleteVendorOwnerIds } } }),
    p.walletAdjustment.deleteMany({ where: { OR: [{ restaurantId: { in: deleteRestaurantIds } }, { riderId: { in: orphanRiderIds } }] } }),
    p.riderCashEntry.deleteMany({ where: { riderId: { in: orphanRiderIds } } }),
    p.riderCashRemittance.deleteMany({ where: { riderId: { in: orphanRiderIds } } }),
    p.payoutRunItem.deleteMany({ where: { OR: [{ restaurantId: { in: deleteRestaurantIds } }, { riderId: { in: orphanRiderIds } }] } }),
  ];
  const ledgerResults = await Promise.all(ledgerCleanup);
  console.log('Ledger rows cleaned:', ledgerResults.map((r) => r.count));

  // ---- 4. Users not in the keep list (cascades address/rider profile/docs/etc.) ----
  const deleteUsers = await p.user.findMany({ where: { id: { notIn: [...keepUserIds] } }, select: { id: true, email: true } });
  console.log(`Deleting ${deleteUsers.length} users...`);
  for (const u of deleteUsers) {
    await p.user.delete({ where: { id: u.id } });
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
