import { IResolvers } from '@graphql-tools/utils';
import { CommissionBill, CommissionRecord, RiderCashEntry, RiderCashRemittance } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';
import { billingCycle, closeCommissionBills, currentPeriod } from '../../services/commission.service';

const BILL_STATUSES = ['PENDING', 'PAID', 'WAIVED'];
const round2 = (n: number) => Math.round(n * 100) / 100;

async function vendorLiteMap(vendorIds: string[]) {
  const vendors = await prisma.user.findMany({ where: { id: { in: [...new Set(vendorIds)] } } });
  return new Map(vendors.map((v) => [v.id, v]));
}

function groupByVendor(records: CommissionRecord[]) {
  const byVendor = new Map<
    string,
    { orderCount: number; grossFoodSubtotal: number; commissionTotal: number; records: CommissionRecord[] }
  >();
  for (const r of records) {
    const entry = byVendor.get(r.vendorId) ?? {
      orderCount: 0,
      grossFoodSubtotal: 0,
      commissionTotal: 0,
      records: [],
    };
    entry.orderCount += 1;
    entry.grossFoodSubtotal += r.foodSubtotal;
    entry.commissionTotal += r.commissionAmount;
    entry.records.push(r);
    byVendor.set(r.vendorId, entry);
  }
  return byVendor;
}

export const commissionResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    commissionPeriodPreview: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      const cycle = await billingCycle();
      const unbilled = await prisma.commissionRecord.findMany({
        where: { billId: null, selfCollected: false },
      });
      const byVendor = groupByVendor(unbilled);
      const vendors = await vendorLiteMap([...byVendor.keys()]);

      const deliveredAts = unbilled.map((r) => r.orderDeliveredAt.getTime());
      const period = currentPeriod(cycle);
      const periodStart = deliveredAts.length ? new Date(Math.min(...deliveredAts)) : period.start;
      const periodEnd = deliveredAts.length ? new Date(Math.max(...deliveredAts)) : period.end;

      const rows = [...byVendor.entries()].map(([vendorId, agg]) => {
        const v = vendors.get(vendorId);
        return {
          vendor: { _id: vendorId, name: v?.name ?? null, email: v?.email ?? null, phone: v?.phone ?? null },
          orderCount: agg.orderCount,
          grossFoodSubtotal: round2(agg.grossFoodSubtotal),
          commissionTotal: round2(agg.commissionTotal),
        };
      });
      rows.sort((a, b) => b.commissionTotal - a.commissionTotal);

      return {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        cycle,
        rows,
        unbilledOrderCount: unbilled.length,
        unbilledCommissionTotal: round2(unbilled.reduce((s, r) => s + r.commissionAmount, 0)),
      };
    },

    commissionBills: async (
      _parent,
      args: { status?: string; vendorId?: string; page?: number; limit?: number },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      const page = args.page && args.page > 0 ? args.page : 1;
      const limit = args.limit && args.limit > 0 ? args.limit : 25;
      const where = {
        ...(args.status ? { status: args.status } : {}),
        ...(args.vendorId ? { vendorId: args.vendorId } : {}),
      };
      const [bills, total] = await Promise.all([
        prisma.commissionBill.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.commissionBill.count({ where }),
      ]);
      return { bills, total };
    },

    commissionBill: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      const bill = await prisma.commissionBill.findUnique({ where: { id: args.id } });
      if (!bill) throw notFoundError('Commission bill not found');
      const records = await prisma.commissionRecord.findMany({
        where: { billId: bill.id },
        orderBy: { orderDeliveredAt: 'asc' },
      });
      return { bill, records };
    },

    myCommissionSummary: async (_parent, _args, context) => {
      const currentUser = requireRole(context, ['VENDOR']);
      const cycle = await billingCycle();
      const period = currentPeriod(cycle);

      const [unbilled, bills] = await Promise.all([
        // Only orders the store will actually be billed for (COD-pickup) — the
        // rest was already netted from the store's payout.
        prisma.commissionRecord.findMany({
          where: { vendorId: currentUser.id, billId: null, selfCollected: false },
        }),
        prisma.commissionBill.findMany({
          where: { vendorId: currentUser.id },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const outstandingTotal = bills
        .filter((b) => b.status === 'PENDING')
        .reduce((s, b) => s + b.commissionTotal, 0);

      return {
        cycle,
        currentPeriodStart: period.start.toISOString(),
        currentPeriodEnd: period.end.toISOString(),
        currentPeriodCommission: round2(unbilled.reduce((s, r) => s + r.commissionAmount, 0)),
        currentPeriodOrderCount: unbilled.length,
        outstandingTotal: round2(outstandingTotal),
        bills,
      };
    },

    riderCashOutstanding: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      const open = await prisma.riderCashEntry.findMany({
        where: { remittanceId: null },
        orderBy: { deliveredAt: 'asc' },
      });
      const byRider = new Map<string, { count: number; total: number; oldest: Date }>();
      for (const e of open) {
        const cur = byRider.get(e.riderId) ?? { count: 0, total: 0, oldest: e.deliveredAt };
        cur.count += 1;
        cur.total += e.owedToPlatform;
        if (e.deliveredAt < cur.oldest) cur.oldest = e.deliveredAt;
        byRider.set(e.riderId, cur);
      }
      const riders = await prisma.user.findMany({ where: { id: { in: [...byRider.keys()] } } });
      const rmap = new Map(riders.map((r) => [r.id, r]));
      return [...byRider.entries()]
        .map(([riderId, agg]) => {
          const r = rmap.get(riderId);
          return {
            rider: { _id: riderId, name: r?.name ?? null, username: r?.username ?? null, phone: r?.phone ?? null },
            entryCount: agg.count,
            outstanding: round2(agg.total),
            oldestUnremittedAt: agg.oldest.toISOString(),
          };
        })
        .sort((a, b) => b.outstanding - a.outstanding);
    },

    riderCashSummary: async (_parent, args: { riderId: string }, context) => {
      const currentUser = requireRole(context, ['ADMIN', 'RIDER']);
      if (currentUser.userType === 'RIDER' && currentUser.id !== args.riderId) throw notFoundError('Rider not found');
      const rider = await prisma.user.findUnique({ where: { id: args.riderId } });
      if (!rider || rider.userType !== 'RIDER') throw notFoundError('Rider not found');

      const [entries, remittances, profile, config] = await Promise.all([
        prisma.riderCashEntry.findMany({ where: { riderId: args.riderId }, orderBy: { deliveredAt: 'desc' } }),
        prisma.riderCashRemittance.findMany({ where: { riderId: args.riderId }, orderBy: { createdAt: 'desc' } }),
        prisma.riderProfile.findUnique({ where: { userId: args.riderId } }),
        prisma.configuration.findFirst(),
      ]);
      const outstanding = entries.filter((e) => !e.remittanceId).reduce((s, e) => s + e.owedToPlatform, 0);
      const lifetimeCollected = entries.reduce((s, e) => s + e.owedToPlatform, 0);
      const lifetimeRemitted = remittances.reduce((s, r) => s + r.amount, 0);
      const walletBalance = profile?.currentWalletAmount ?? 0;

      return {
        rider: { _id: rider.id, name: rider.name, username: rider.username, phone: rider.phone },
        outstanding: round2(outstanding),
        lifetimeCollected: round2(lifetimeCollected),
        lifetimeRemitted: round2(lifetimeRemitted),
        cashLimit: config?.riderCashLimit ?? 3000,
        walletBalance: round2(walletBalance),
        availableToWithdraw: round2(Math.max(0, walletBalance - outstanding)),
        entries,
        remittances,
      };
    },

    platformFinanceReport: async (_parent, args: { startDate?: string; endDate?: string }, context) => {
      requireRole(context, ['ADMIN']);
      const now = new Date();
      const start = args.startDate
        ? new Date(args.startDate)
        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = args.endDate ? new Date(args.endDate) : now;
      end.setUTCHours(23, 59, 59, 999);
      const range = { gte: start, lte: end };

      const [deliveredOrders, commissionRecords, bills, cashEntries, remittances, allOpenCash] = await Promise.all([
        prisma.order.findMany({
          where: { orderStatus: { in: ['DELIVERED', 'COMPLETED'] }, deliveredAt: range },
        }),
        prisma.commissionRecord.findMany({ where: { orderDeliveredAt: range } }),
        prisma.commissionBill.findMany(),
        prisma.riderCashEntry.findMany({ where: { deliveredAt: range } }),
        prisma.riderCashRemittance.findMany({ where: { createdAt: range } }),
        prisma.riderCashEntry.findMany({ where: { remittanceId: null } }),
      ]);

      const orderVolume = deliveredOrders.reduce((s, o) => s + o.orderAmount, 0);
      const riderPayouts = deliveredOrders.reduce((s, o) => s + o.deliveryCharges + o.tipping, 0);
      const taxCollected = deliveredOrders.reduce((s, o) => s + o.taxationAmount, 0);
      const commissionAccrued = commissionRecords.reduce((s, r) => s + r.commissionAmount, 0);
      // The store keeps food − commission, plus the tax it remits as GST.
      const storePayouts =
        commissionRecords.reduce((s, r) => s + (r.foodSubtotal - r.commissionAmount), 0) + taxCollected;

      const commissionBilled = bills
        .filter((b) => b.createdAt >= start && b.createdAt <= end)
        .reduce((s, b) => s + b.commissionTotal, 0);
      const commissionPaid = bills
        .filter((b) => b.status === 'PAID' && b.paidAt && b.paidAt >= start && b.paidAt <= end)
        .reduce((s, b) => s + (b.paidAmount ?? b.commissionTotal), 0);
      const commissionOutstanding = bills
        .filter((b) => b.status === 'PENDING')
        .reduce((s, b) => s + b.commissionTotal, 0);

      const codCashCollected = cashEntries.reduce((s, e) => s + e.owedToPlatform, 0);
      const codCashRemitted = remittances.reduce((s, r) => s + r.amount, 0);
      const codCashOutstanding = allOpenCash.reduce((s, e) => s + e.owedToPlatform, 0);

      // Per-vendor (commission side)
      const vendorAgg = new Map<string, { orders: number; foodSubtotal: number; commission: number }>();
      for (const r of commissionRecords) {
        const cur = vendorAgg.get(r.vendorId) ?? { orders: 0, foodSubtotal: 0, commission: 0 };
        cur.orders += 1;
        cur.foodSubtotal += r.foodSubtotal;
        cur.commission += r.commissionAmount;
        vendorAgg.set(r.vendorId, cur);
      }
      const vendors = await prisma.user.findMany({ where: { id: { in: [...vendorAgg.keys()] } } });
      const vmap = new Map(vendors.map((v) => [v.id, v]));
      const perVendor = [...vendorAgg.entries()]
        .map(([vendorId, a]) => ({
          vendor: {
            _id: vendorId,
            name: vmap.get(vendorId)?.name ?? null,
            email: vmap.get(vendorId)?.email ?? null,
            phone: vmap.get(vendorId)?.phone ?? null,
          },
          orders: a.orders,
          foodSubtotal: round2(a.foodSubtotal),
          commission: round2(a.commission),
        }))
        .sort((x, y) => y.commission - x.commission);

      // Per-rider (payout + cash side)
      const riderAgg = new Map<string, { deliveries: number; earned: number; cashCollected: number }>();
      for (const o of deliveredOrders) {
        if (!o.riderId) continue;
        const cur = riderAgg.get(o.riderId) ?? { deliveries: 0, earned: 0, cashCollected: 0 };
        cur.deliveries += 1;
        cur.earned += o.deliveryCharges + o.tipping;
        riderAgg.set(o.riderId, cur);
      }
      for (const e of cashEntries) {
        const cur = riderAgg.get(e.riderId) ?? { deliveries: 0, earned: 0, cashCollected: 0 };
        cur.cashCollected += e.owedToPlatform;
        riderAgg.set(e.riderId, cur);
      }
      const openByRider = new Map<string, number>();
      for (const e of allOpenCash) openByRider.set(e.riderId, (openByRider.get(e.riderId) ?? 0) + e.owedToPlatform);
      const riderUsers = await prisma.user.findMany({ where: { id: { in: [...riderAgg.keys()] } } });
      const rumap = new Map(riderUsers.map((r) => [r.id, r]));
      const perRider = [...riderAgg.entries()]
        .map(([riderId, a]) => ({
          rider: {
            _id: riderId,
            name: rumap.get(riderId)?.name ?? null,
            username: rumap.get(riderId)?.username ?? null,
            phone: rumap.get(riderId)?.phone ?? null,
          },
          deliveries: a.deliveries,
          earned: round2(a.earned),
          cashCollected: round2(a.cashCollected),
          cashOutstanding: round2(openByRider.get(riderId) ?? 0),
        }))
        .sort((x, y) => y.cashCollected - x.cashCollected);

      return {
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        orderVolume: round2(orderVolume),
        deliveredOrders: deliveredOrders.length,
        commissionAccrued: round2(commissionAccrued),
        commissionBilled: round2(commissionBilled),
        commissionPaid: round2(commissionPaid),
        commissionOutstanding: round2(commissionOutstanding),
        storePayouts: round2(storePayouts),
        taxCollected: round2(taxCollected),
        riderPayouts: round2(riderPayouts),
        codCashCollected: round2(codCashCollected),
        codCashRemitted: round2(codCashRemitted),
        codCashOutstanding: round2(codCashOutstanding),
        perVendor,
        perRider,
      };
    },
  },

  Mutation: {
    closeCommissionPeriod: async (
      _parent,
      args: { periodStart?: string; periodEnd?: string },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      // Manual "close now" — bills every unbilled record. The scheduler
      // (`src/scheduler.ts`) closes only completed periods automatically.
      return closeCommissionBills({ periodStart: args.periodStart, periodEnd: args.periodEnd });
    },

    closeCompletedCommissionPeriods: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      const { start } = currentPeriod(await billingCycle());
      return closeCommissionBills({ before: start });
    },

    updateCommissionBillStatus: async (
      _parent,
      args: { id: string; status: string; paidAmount?: number; note?: string },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      const status = args.status.toUpperCase();
      if (!BILL_STATUSES.includes(status)) {
        throw userInputError(`Invalid bill status: ${args.status}`);
      }
      const existing = await prisma.commissionBill.findUnique({ where: { id: args.id } });
      if (!existing) throw notFoundError('Commission bill not found');

      const settling = status !== 'PENDING' && existing.status === 'PENDING';
      return prisma.commissionBill.update({
        where: { id: args.id },
        data: {
          status,
          note: args.note ?? undefined,
          ...(status === 'PAID'
            ? { paidAt: settling ? new Date() : existing.paidAt, paidAmount: args.paidAmount ?? existing.commissionTotal }
            : {}),
          ...(status === 'WAIVED' && settling ? { paidAt: new Date(), paidAmount: 0 } : {}),
        },
      });
    },

    recordRiderCashRemittance: async (
      _parent,
      args: { riderId: string; amount?: number; method?: string; note?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN']);
      const open = await prisma.riderCashEntry.findMany({
        where: { riderId: args.riderId, remittanceId: null },
        orderBy: { deliveredAt: 'asc' },
      });
      if (open.length === 0) throw userInputError('This rider has no outstanding cash to remit');

      // Clear oldest entries first, up to `amount` if given (else clear all).
      const cap = args.amount && args.amount > 0 ? args.amount : Infinity;
      const toClear: string[] = [];
      let cleared = 0;
      for (const e of open) {
        if (cleared + e.owedToPlatform > cap + 0.001) break;
        toClear.push(e.id);
        cleared += e.owedToPlatform;
      }
      if (toClear.length === 0) {
        throw userInputError(
          `The smallest outstanding entry is ₹${round2(open[0].owedToPlatform)} — remit at least that much`,
        );
      }

      const remittance = await prisma.riderCashRemittance.create({
        data: {
          riderId: args.riderId,
          amount: round2(cleared),
          entryCount: toClear.length,
          method: args.method ?? 'cash',
          note: args.note ?? null,
          recordedById: currentUser.id,
        },
      });
      await prisma.riderCashEntry.updateMany({
        where: { id: { in: toClear } },
        data: { remittanceId: remittance.id },
      });
      return remittance;
    },
  },

  CommissionBill: {
    _id: (parent: CommissionBill) => parent.id,
    periodStart: (parent: CommissionBill) => parent.periodStart.toISOString(),
    periodEnd: (parent: CommissionBill) => parent.periodEnd.toISOString(),
    paidAt: (parent: CommissionBill) => parent.paidAt?.toISOString() ?? null,
    createdAt: (parent: CommissionBill) => parent.createdAt.toISOString(),
    vendor: async (parent: CommissionBill) => {
      const v = await prisma.user.findUnique({ where: { id: parent.vendorId } });
      return v ? { _id: v.id, name: v.name, email: v.email, phone: v.phone } : null;
    },
  },

  CommissionRecordRow: {
    _id: (parent: CommissionRecord) => parent.id,
    orderDeliveredAt: (parent: CommissionRecord) => parent.orderDeliveredAt.toISOString(),
    storeName: async (parent: CommissionRecord) => {
      const r = await prisma.restaurant.findUnique({ where: { id: parent.restaurantId } });
      return r?.name ?? null;
    },
  },

  RiderCashEntryRow: {
    _id: (parent: RiderCashEntry) => parent.id,
    deliveredAt: (parent: RiderCashEntry) => parent.deliveredAt.toISOString(),
    remitted: (parent: RiderCashEntry) => parent.remittanceId != null,
  },

  RiderCashRemittanceRow: {
    _id: (parent: RiderCashRemittance) => parent.id,
    createdAt: (parent: RiderCashRemittance) => parent.createdAt.toISOString(),
  },
};
