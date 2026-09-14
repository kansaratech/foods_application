// Usage:
//   node prisma/remove-restaurant.cjs "<name or slug substring>"              # dry run — report only
//   node prisma/remove-restaurant.cjs "<name or slug substring>" --confirm    # actually delete
//   node prisma/remove-restaurant.cjs "<name or slug substring>" --confirm --keep-owner
//       # leaves the vendor's User account + CommissionBill history in place
//       # (use this if the vendor owns/will own other stores)
//
// Removes ONE restaurant and everything that hangs off it: orders (+ their
// items/addons/reviews/chat), menu (categories/foods/variations/addons/
// options), coupons, documents, delivery agents, withdraw requests,
// transactions, and the no-FK ledger rows that reference it by id
// (CommissionRecord, WalletAdjustment, PayoutRunItem). If the owning vendor
// has no other restaurant left, also removes that vendor's User account and
// CommissionBill history (skip with --keep-owner).
//
// Matches by case-insensitive substring on name OR slug. Aborts if that
// matches zero or more than one restaurant — this is a real DELETE against
// whatever DATABASE_URL points at, so it refuses to guess.
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');
  const keepOwner = args.includes('--keep-owner');
  const pattern = args.find((a) => !a.startsWith('--'));

  if (!pattern) {
    throw new Error('Usage: node prisma/remove-restaurant.cjs "<name or slug substring>" [--confirm] [--keep-owner]');
  }

  const candidates = await p.restaurant.findMany({
    where: { OR: [{ name: { contains: pattern } }, { slug: { contains: pattern } }] },
    select: { id: true, name: true, slug: true, ownerId: true, isActive: true },
  });

  if (candidates.length === 0) {
    throw new Error(`No restaurant matches "${pattern}" — nothing to do.`);
  }
  if (candidates.length > 1) {
    console.error(`"${pattern}" matches ${candidates.length} restaurants — be more specific:`);
    candidates.forEach((c) => console.error(`  - ${c.name}  (slug: ${c.slug}, id: ${c.id})`));
    throw new Error('Aborting: ambiguous match.');
  }

  const target = candidates[0];
  const owner = await p.user.findUnique({ where: { id: target.ownerId }, select: { id: true, email: true, name: true } });
  const otherRestaurants = await p.restaurant.count({ where: { ownerId: target.ownerId, id: { not: target.id } } });

  const orderIds = (await p.order.findMany({ where: { restaurantId: target.id }, select: { id: true } })).map((o) => o.id);
  const [categories, foods, addons, reviews, coupons, docs, agents, withdraws, txns, commission, bills, wallet, payoutItems] = await Promise.all([
    p.category.count({ where: { restaurantId: target.id } }),
    p.food.count({ where: { category: { restaurantId: target.id } } }),
    p.addon.count({ where: { restaurantId: target.id } }),
    p.review.count({ where: { restaurantId: target.id } }),
    p.coupon.count({ where: { restaurantId: target.id } }),
    p.storeDocument.count({ where: { restaurantId: target.id } }),
    p.storeDeliveryAgent.count({ where: { restaurantId: target.id } }),
    p.withdrawRequest.count({ where: { restaurantId: target.id } }),
    p.transaction.count({ where: { restaurantId: target.id } }),
    p.commissionRecord.count({ where: { restaurantId: target.id } }),
    p.commissionBill.count({ where: { vendorId: target.ownerId } }),
    p.walletAdjustment.count({ where: { restaurantId: target.id } }),
    p.payoutRunItem.count({ where: { restaurantId: target.id } }),
  ]);

  const willDeleteOwner = !keepOwner && otherRestaurants === 0;

  console.log('=== Target ===');
  console.log(`  ${target.name}  (slug: ${target.slug}, id: ${target.id}, active: ${target.isActive})`);
  console.log(`  owner: ${owner ? `${owner.name} <${owner.email}>` : '(none)'}  — owns ${otherRestaurants} other restaurant(s)`);
  console.log('=== Related data that will be deleted ===');
  console.log({ orders: orderIds.length, categories, foods, addons, reviews, coupons, docs, agents, withdraws, txns, commission, payoutItems, wallet });
  console.log(`  owner account + ${bills} commission bill(s): ${willDeleteOwner ? 'WILL be deleted (owner has no other restaurant)' : 'kept'}`);

  if (!confirm) {
    console.log('\nDRY RUN — no changes made. Re-run with --confirm to execute.');
    return;
  }

  console.log('\nDeleting...');

  console.log(`  orders (${orderIds.length}, cascades items/addons/reviews/chat)...`);
  for (let i = 0; i < orderIds.length; i += 200) {
    await p.order.deleteMany({ where: { id: { in: orderIds.slice(i, i + 200) } } });
  }

  console.log('  restaurant (cascades menu/coupons/docs/delivery agents/withdraws/transactions)...');
  await p.restaurant.delete({ where: { id: target.id } });

  console.log('  orphan ledger rows (no FK — CommissionRecord/WalletAdjustment/PayoutRunItem)...');
  const ledgerResults = await Promise.all([
    p.commissionRecord.deleteMany({ where: { restaurantId: target.id } }),
    p.walletAdjustment.deleteMany({ where: { restaurantId: target.id } }),
    p.payoutRunItem.deleteMany({ where: { restaurantId: target.id } }),
  ]);
  console.log('  ledger rows deleted:', ledgerResults.map((r) => r.count));

  if (willDeleteOwner) {
    console.log(`  vendor commission bills (${bills})...`);
    await p.commissionBill.deleteMany({ where: { vendorId: target.ownerId } });
    console.log(`  owner user account (${owner ? owner.email : target.ownerId}, cascades addresses/documents)...`);
    await p.user.delete({ where: { id: target.ownerId } });
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
