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
/**
 * Whether the platform already keeps this order's commission through the money
 * flow itself (so it must never be invoiced): online payments and COD-delivery
 * (where the rider deposits the full cash). Only COD-**pickup** — the store
 * holds the cash — leaves the commission owed on a bill.
 */
export function isCommissionSelfCollected(order: {
  paymentMethod: string;
  isPickedUp: boolean;
}): boolean {
  return !(order.paymentMethod === 'COD' && order.isPickedUp);
}

export async function recordOrderCommission(order: {
  id: string;
  orderId: string;
  restaurantId: string;
  paymentMethod: string;
  isPickedUp: boolean;
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
      paymentMethod: order.paymentMethod,
      isPickedUp: order.isPickedUp,
      selfCollected: isCommissionSelfCollected(order),
      orderDeliveredAt: order.deliveredAt ?? new Date(),
    },
  });
}

/**
 * Record the COD cash a rider collected on delivery. Called once, when a COD
 * order with a rider is first marked DELIVERED. The rider must deposit **the
 * full order amount** — their delivery fee + tip is paid back separately into
 * their wallet (`riderKeeps` here is that wallet credit, for display only).
 * Idempotent on the order id. Pickup orders have no rider, so this is
 * COD-delivery only.
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

  await prisma.riderCashEntry.create({
    data: {
      orderId: order.id,
      orderNumber: order.orderId,
      riderId: order.riderId,
      collectedTotal: order.orderAmount,
      riderKeeps: order.deliveryCharges + order.tipping, // paid back via wallet
      owedToPlatform: order.orderAmount, // deposit 100%
      deliveredAt: order.deliveredAt ?? new Date(),
    },
  });
}

/** A rider's undeposited COD cash right now (what they owe the platform). */
export async function riderOutstandingCash(riderId: string): Promise<number> {
  const open = await prisma.riderCashEntry.findMany({
    where: { riderId, remittanceId: null },
    select: { owedToPlatform: true },
  });
  return Math.round(open.reduce((s, e) => s + e.owedToPlatform, 0) * 100) / 100;
}
