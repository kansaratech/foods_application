/**
 * One-off backfill for the platform commission billing feature.
 *
 *   1. Give every store a commission rate. Stores created before this feature
 *      have `commissionRate = 0`, which silently means the platform earns
 *      nothing. Bring them to the Configuration default.
 *   2. Give every store a delivery radius. `deliveryDistance` is what
 *      serviceability / order placement enforce; derive it from the circle the
 *      vendor already drew (`circleBounds.radius`), else a 60 km fallback.
 *   3. Synthesise a CommissionRecord for orders already DELIVERED/COMPLETED so
 *      the first generated bill is not empty.
 *
 * Safe to re-run.
 *
 *   npx ts-node prisma/backfill-commission.ts
 */
import { PrismaClient } from '@prisma/client';
import { resolveCommissionRate, orderFoodSubtotal } from '../src/utils/commission';

const round2n = (n: number) => Math.round(n * 100) / 100;

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

  // 3 — commission records for historical delivered orders
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const delivered = await prisma.order.findMany({
    where: { orderStatus: { in: ['DELIVERED', 'COMPLETED'] } },
  });
  let recordsCreated = 0;
  for (const order of delivered) {
    const existing = await prisma.commissionRecord.findUnique({ where: { orderId: order.id } });
    if (existing) continue;
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
        orderDeliveredAt: order.deliveredAt ?? order.updatedAt,
      },
    });
    recordsCreated += 1;
  }
  console.log(`Commission records: ${recordsCreated} created for historical delivered orders.`);

  // 4 — rider COD cash entries for historical COD deliveries that had a rider
  let cashCreated = 0;
  for (const order of delivered) {
    if (order.paymentMethod !== 'COD' || !order.riderId) continue;
    const existing = await prisma.riderCashEntry.findUnique({ where: { orderId: order.id } });
    if (existing) continue;
    const riderKeeps = order.deliveryCharges + order.tipping;
    await prisma.riderCashEntry.create({
      data: {
        orderId: order.id,
        orderNumber: order.orderId,
        riderId: order.riderId,
        collectedTotal: order.orderAmount,
        riderKeeps,
        owedToPlatform: round2n(order.orderAmount - riderKeeps),
        deliveredAt: order.deliveredAt ?? order.updatedAt,
      },
    });
    cashCreated += 1;
  }
  console.log(`Rider cash entries: ${cashCreated} created for historical COD deliveries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
