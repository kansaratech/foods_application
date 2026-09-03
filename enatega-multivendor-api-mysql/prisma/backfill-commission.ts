/**
 * One-off backfill for the platform commission / rider-cash feature.
 *
 *   1. Give every store a commission rate (0 → the Configuration default).
 *   2. Give every store a delivery radius (`deliveryDistance`).
 *   3. A CommissionRecord for every already-DELIVERED order, tagged with how
 *      the commission is collected (`selfCollected` — online / COD-delivery
 *      keep it via the money flow; only COD-pickup is invoiced).
 *   4. A RiderCashEntry for every historical COD-delivery order, with the rider
 *      owing the FULL order amount (deposit 100%).
 *   5. Re-tag any pre-existing records written by an earlier version:
 *      CommissionRecord.selfCollected/paymentMethod/isPickedUp,
 *      RiderCashEntry.owedToPlatform → full order amount.
 *
 * Safe to re-run.   npx ts-node prisma/backfill-commission.ts
 */
import { PrismaClient } from '@prisma/client';
import { resolveCommissionRate, orderFoodSubtotal, isCommissionSelfCollected } from '../src/utils/commission';

const prisma = new PrismaClient();
const round2 = (n: number) => Math.round(n * 100) / 100;
const FALLBACK_RADIUS_KM = 60;

async function main() {
  const config = await prisma.configuration.findFirst();
  const defaultRate = config?.defaultCommissionRate ?? 20;

  // 1 + 2 — rate and radius per store
  const stores = await prisma.restaurant.findMany();
  let rateFixed = 0;
  let radiusFixed = 0;
  for (const s of stores) {
    const data: { commissionRate?: number; deliveryDistance?: number } = {};
    if (!s.commissionRate || s.commissionRate <= 0) {
      data.commissionRate = defaultRate;
      rateFixed += 1;
    }
    if (!s.deliveryDistance || s.deliveryDistance <= 0) {
      const circle = s.circleBounds as { radius?: number } | null;
      data.deliveryDistance = circle?.radius && circle.radius > 0 ? circle.radius : FALLBACK_RADIUS_KM;
      radiusFixed += 1;
    }
    if (Object.keys(data).length > 0) {
      await prisma.restaurant.update({ where: { id: s.id }, data });
    }
  }
  console.log(`Stores: ${rateFixed} commission rate(s), ${radiusFixed} delivery radius(es) backfilled.`);

  const storeById = new Map(stores.map((s) => [s.id, s]));
  const delivered = await prisma.order.findMany({
    where: { orderStatus: { in: ['DELIVERED', 'COMPLETED'] } },
  });
  const orderById = new Map(delivered.map((o) => [o.id, o]));

  // 3 — commission records for historical delivered orders
  let recordsCreated = 0;
  for (const order of delivered) {
    if (await prisma.commissionRecord.findUnique({ where: { orderId: order.id } })) continue;
    const store = storeById.get(order.restaurantId);
    if (!store) continue;
    const rate = resolveCommissionRate(store.commissionRate, defaultRate);
    const foodSubtotal = Math.max(0, orderFoodSubtotal(order));
    await prisma.commissionRecord.create({
      data: {
        orderId: order.id,
        orderNumber: order.orderId,
        restaurantId: store.id,
        vendorId: store.ownerId,
        foodSubtotal,
        commissionRate: rate,
        commissionAmount: round2(foodSubtotal * (rate / 100)),
        paymentMethod: order.paymentMethod,
        isPickedUp: order.isPickedUp,
        selfCollected: isCommissionSelfCollected(order),
        orderDeliveredAt: order.deliveredAt ?? order.updatedAt,
      },
    });
    recordsCreated += 1;
  }
  console.log(`Commission records: ${recordsCreated} created.`);

  // 4 — rider COD cash entries for historical COD deliveries with a rider
  let cashCreated = 0;
  for (const order of delivered) {
    if (order.paymentMethod !== 'COD' || !order.riderId) continue;
    if (await prisma.riderCashEntry.findUnique({ where: { orderId: order.id } })) continue;
    await prisma.riderCashEntry.create({
      data: {
        orderId: order.id,
        orderNumber: order.orderId,
        riderId: order.riderId,
        collectedTotal: order.orderAmount,
        riderKeeps: order.deliveryCharges + order.tipping,
        owedToPlatform: order.orderAmount,
        deliveredAt: order.deliveredAt ?? order.updatedAt,
      },
    });
    cashCreated += 1;
  }
  console.log(`Rider cash entries: ${cashCreated} created.`);

  // 5 — re-tag records from an earlier version of this feature
  let recsRetagged = 0;
  for (const rec of await prisma.commissionRecord.findMany()) {
    const o = orderById.get(rec.orderId);
    if (!o) continue;
    const want = {
      paymentMethod: o.paymentMethod,
      isPickedUp: o.isPickedUp,
      selfCollected: isCommissionSelfCollected(o),
    };
    if (
      rec.paymentMethod !== want.paymentMethod ||
      rec.isPickedUp !== want.isPickedUp ||
      rec.selfCollected !== want.selfCollected
    ) {
      // never re-tag a record already rolled into a bill
      if (rec.billId) continue;
      await prisma.commissionRecord.update({ where: { id: rec.id }, data: want });
      recsRetagged += 1;
    }
  }
  let cashRetagged = 0;
  for (const e of await prisma.riderCashEntry.findMany({ where: { remittanceId: null } })) {
    if (Math.abs(e.owedToPlatform - e.collectedTotal) > 0.001) {
      await prisma.riderCashEntry.update({
        where: { id: e.id },
        data: { owedToPlatform: e.collectedTotal },
      });
      cashRetagged += 1;
    }
  }
  console.log(`Re-tagged: ${recsRetagged} commission record(s), ${cashRetagged} rider cash entr(ies).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
