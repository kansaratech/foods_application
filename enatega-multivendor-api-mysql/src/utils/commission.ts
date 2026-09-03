import { prisma } from '../prisma/client';

const FALLBACK_COMMISSION_RATE = 20;

/**
 * The commission percentage that applies to a store: its own `commissionRate`
 * when set (> 0), otherwise the platform default from Configuration, otherwise
 * a hard fallback. Keeps one rule for accrual, reporting and previews.
 */
export function resolveCommissionRate(
  storeCommissionRate: number | null | undefined,
  defaultCommissionRate: number | null | undefined,
): number {
  if (storeCommissionRate && storeCommissionRate > 0) return storeCommissionRate;
  if (defaultCommissionRate && defaultCommissionRate > 0) return defaultCommissionRate;
  return FALLBACK_COMMISSION_RATE;
}

/** Food subtotal an order's commission is charged on (excludes delivery, tip, tax). */
export function orderFoodSubtotal(order: {
  orderAmount: number;
  deliveryCharges: number;
  tipping: number;
  taxationAmount: number;
}): number {
  return order.orderAmount - order.deliveryCharges - order.tipping - order.taxationAmount;
}

/**
 * Write the immutable per-order commission ledger row. Called once, when an
 * order is first marked DELIVERED. Safe to call again for the same order — the
 * unique `orderId` makes a repeat a no-op.
 */
export async function recordOrderCommission(order: {
  id: string;
  orderId: string;
  restaurantId: string;
  orderAmount: number;
  deliveryCharges: number;
  tipping: number;
  taxationAmount: number;
  deliveredAt: Date | null;
}): Promise<void> {
  const existing = await prisma.commissionRecord.findUnique({ where: { orderId: order.id } });
  if (existing) return;

  const [restaurant, config] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: order.restaurantId } }),
    prisma.configuration.findFirst(),
  ]);
  if (!restaurant) return;

  const rate = resolveCommissionRate(restaurant.commissionRate, config?.defaultCommissionRate);
  const foodSubtotal = Math.max(0, orderFoodSubtotal(order));
  const commissionAmount = Math.round(foodSubtotal * (rate / 100) * 100) / 100;

  await prisma.commissionRecord.create({
    data: {
      orderId: order.id,
      orderNumber: order.orderId,
      restaurantId: restaurant.id,
      vendorId: restaurant.ownerId,
      foodSubtotal,
      commissionRate: rate,
      commissionAmount,
      orderDeliveredAt: order.deliveredAt ?? new Date(),
    },
  });
}

/**
 * Record the COD cash a rider is now holding on the platform's behalf. Called
 * once, when a COD order with a rider is first marked DELIVERED. The rider keeps
 * `deliveryCharges + tipping`; everything else in the cash they took from the
 * customer (`owedToPlatform`) must be remitted. Idempotent on the order id.
 */
export async function recordRiderCash(order: {
  id: string;
  orderId: string;
  riderId: string | null;
  paymentMethod: string;
  orderAmount: number;
  deliveryCharges: number;
  tipping: number;
  deliveredAt: Date | null;
}): Promise<void> {
  if (order.paymentMethod !== 'COD' || !order.riderId) return;
  const existing = await prisma.riderCashEntry.findUnique({ where: { orderId: order.id } });
  if (existing) return;

  const riderKeeps = order.deliveryCharges + order.tipping;
  const owedToPlatform = Math.round((order.orderAmount - riderKeeps) * 100) / 100;

  await prisma.riderCashEntry.create({
    data: {
      orderId: order.id,
      orderNumber: order.orderId,
      riderId: order.riderId,
      collectedTotal: order.orderAmount,
      riderKeeps,
      owedToPlatform,
      deliveredAt: order.deliveredAt ?? new Date(),
    },
  });
}
