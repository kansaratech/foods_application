import { IResolvers } from '@graphql-tools/utils';
import { Order, OrderStatus } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';
import { resolveCommissionRate } from '../../utils/commission';

const round2 = (n: number) => Math.round(n * 100) / 100;
const DELIVERED: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.COMPLETED];

async function assertOwnsStore(context: GraphQLContext, storeId: string) {
  const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
  const restaurant = await prisma.restaurant.findUnique({ where: { id: storeId } });
  if (!restaurant) throw notFoundError('Store not found');
  if (currentUser.userType === 'VENDOR' && restaurant.ownerId !== currentUser.id) {
    throw notFoundError('Store not found');
  }
  return restaurant;
}

function resolveRange(startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : now;
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function deliveryMode(order: { isPickedUp: boolean; deliveryMode: string | null }): string {
  return order.deliveryMode ?? (order.isPickedUp ? 'PICKUP' : 'PLATFORM');
}

/** Store holds the cash on a COD pickup or COD self-delivery order. */
function storeHoldsCash(order: { paymentMethod: string; isPickedUp: boolean; deliveryMode: string | null }): boolean {
  const mode = deliveryMode(order);
  return order.paymentMethod === 'COD' && (mode === 'PICKUP' || mode === 'SELF');
}

interface Bucket {
  bucket: string;
  label: string;
  orders: number;
  delivered: number;
  cancelled: number;
  pickup: number;
  selfDelivery: number;
  platformDelivery: number;
  grossSales: number;
  codCashCollected: number;
  commissionOwed: number;
  gstCollected: number;
  netEarnings: number;
}

function emptyBucket(bucket: string, label: string): Bucket {
  return {
    bucket,
    label,
    orders: 0,
    delivered: 0,
    cancelled: 0,
    pickup: 0,
    selfDelivery: 0,
    platformDelivery: 0,
    grossSales: 0,
    codCashCollected: 0,
    commissionOwed: 0,
    gstCollected: 0,
    netEarnings: 0,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function bucketKey(d: Date, groupBy: 'DAY' | 'MONTH'): { key: string; label: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (groupBy === 'MONTH') {
    return { key: `${y}-${String(m + 1).padStart(2, '0')}`, label: `${MONTHS[m]} ${y}` };
  }
  const day = d.getDate();
  return {
    key: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    label: `${day} ${MONTHS[m]} ${y}`,
  };
}

function accumulate(b: Bucket, order: Order, rate: number): void {
  b.orders += 1;
  const mode = deliveryMode(order);
  if (mode === 'PICKUP') b.pickup += 1;
  else if (mode === 'SELF') b.selfDelivery += 1;
  else b.platformDelivery += 1;

  if (order.orderStatus === 'CANCELLED') {
    b.cancelled += 1;
    return;
  }
  if (!DELIVERED.includes(order.orderStatus)) return;

  b.delivered += 1;
  const foodAmount =
    order.orderAmount - order.deliveryCharges - order.tipping - order.taxationAmount;
  const commission = round2(Math.max(0, foodAmount) * (rate / 100));
  b.grossSales += order.orderAmount;
  b.gstCollected += order.taxationAmount;
  b.netEarnings +=
    foodAmount - commission + order.taxationAmount +
    (mode === 'SELF' ? order.deliveryCharges + order.tipping : 0);
  if (storeHoldsCash(order)) {
    b.codCashCollected += order.orderAmount;
    b.commissionOwed += commission;
  }
}

function finalize(b: Bucket): Bucket {
  return {
    ...b,
    grossSales: round2(b.grossSales),
    codCashCollected: round2(b.codCashCollected),
    commissionOwed: round2(b.commissionOwed),
    gstCollected: round2(b.gstCollected),
    netEarnings: round2(b.netEarnings),
  };
}

export const storeReportsResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    storeOrderReport: async (
      _parent,
      args: { storeId: string; groupBy: string; startDate?: string; endDate?: string },
      context,
    ) => {
      const restaurant = await assertOwnsStore(context, args.storeId);
      const groupBy = args.groupBy.toUpperCase();
      if (groupBy !== 'DAY' && groupBy !== 'MONTH') {
        throw userInputError('groupBy must be DAY or MONTH');
      }
      const { start, end } = resolveRange(args.startDate, args.endDate);
      const config = await prisma.configuration.findFirst();
      const rate = resolveCommissionRate(restaurant.commissionRate, config?.defaultCommissionRate);

      const orders = await prisma.order.findMany({
        where: { restaurantId: restaurant.id, createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'asc' },
      });

      const byKey = new Map<string, Bucket>();
      const totals = emptyBucket('TOTAL', 'Total');
      for (const order of orders) {
        const { key, label } = bucketKey(order.createdAt, groupBy as 'DAY' | 'MONTH');
        const b = byKey.get(key) ?? emptyBucket(key, label);
        accumulate(b, order, rate);
        accumulate(totals, order, rate);
        byKey.set(key, b);
      }

      const buckets = [...byKey.values()]
        .sort((a, b) => (a.bucket < b.bucket ? 1 : -1))
        .map(finalize);

      return {
        storeId: restaurant.id,
        groupBy,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        buckets,
        totals: finalize(totals),
      };
    },

    storeCollectionSummary: async (
      _parent,
      args: { storeId: string; startDate?: string; endDate?: string },
      context,
    ) => {
      const restaurant = await assertOwnsStore(context, args.storeId);
      const { start, end } = resolveRange(args.startDate, args.endDate);
      const config = await prisma.configuration.findFirst();
      const rate = resolveCommissionRate(restaurant.commissionRate, config?.defaultCommissionRate);

      const delivered = await prisma.order.findMany({
        where: {
          restaurantId: restaurant.id,
          orderStatus: { in: DELIVERED },
          deliveredAt: { gte: start, lte: end },
        },
      });

      let codCashCollected = 0;
      let commissionOwed = 0;
      let gstCollected = 0;
      for (const order of delivered) {
        if (!storeHoldsCash(order)) continue;
        const foodAmount =
          order.orderAmount - order.deliveryCharges - order.tipping - order.taxationAmount;
        codCashCollected += order.orderAmount;
        commissionOwed += round2(Math.max(0, foodAmount) * (rate / 100));
        gstCollected += order.taxationAmount;
      }

      const [unbilled, bills] = await Promise.all([
        prisma.commissionRecord.findMany({
          where: { restaurantId: restaurant.id, billId: null, selfCollected: false },
        }),
        prisma.commissionBill.findMany({
          where: { vendorId: restaurant.ownerId, status: 'PENDING' },
          orderBy: { periodEnd: 'desc' },
        }),
      ]);

      return {
        storeId: restaurant.id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        codCashCollected: round2(codCashCollected),
        commissionOwed: round2(commissionOwed),
        gstCollected: round2(gstCollected),
        netAfterCommission: round2(codCashCollected - commissionOwed),
        unbilledCommission: round2(unbilled.reduce((s, r) => s + r.commissionAmount, 0)),
        outstandingBillsTotal: round2(bills.reduce((s, b) => s + b.commissionTotal, 0)),
        outstandingBills: bills.map((b) => ({
          _id: b.id,
          invoiceNumber: b.invoiceNumber,
          periodStart: b.periodStart.toISOString(),
          periodEnd: b.periodEnd.toISOString(),
          commissionTotal: round2(b.commissionTotal),
          status: b.status,
        })),
      };
    },
  },
};
