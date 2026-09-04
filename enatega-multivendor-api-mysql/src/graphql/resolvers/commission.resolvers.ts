import { IResolvers } from '@graphql-tools/utils';
import { CommissionBill, CommissionRecord, RiderCashEntry, RiderCashRemittance } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';
import { billingCycle, closeCommissionBills, currentPeriod } from '../../services/commission.service';
import { recordAudit } from '../../utils/audit';

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

// Clear a rider's outstanding COD cash entries oldest-first (up to `amount`, or
// all of them), recording one CONFIRMED remittance. Shared by the admin
// "record deposit" mutation and the rider-deposit confirmation path.
async function settleRiderCash(input: {
  riderId: string;
  amount?: number | null;
  method?: string | null;
  reference?: string | null;
  note?: string | null;
  recordedById?: string | null;
}): Promise<RiderCashRemittance> {
  const open = await prisma.riderCashEntry.findMany({
    where: { riderId: input.riderId, remittanceId: null },
    orderBy: { deliveredAt: 'asc' },
  });
  if (open.length === 0) throw userInputError('This rider has no outstanding cash to remit');

  const cap = input.amount && input.amount > 0 ? input.amount : Infinity;
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
      riderId: input.riderId,
      amount: round2(cleared),
      entryCount: toClear.length,
      method: input.method ?? 'cash',
      reference: input.reference ?? null,
      note: input.note ?? null,
      recordedById: input.recordedById ?? null,
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    },
  });
  await prisma.riderCashEntry.updateMany({
    where: { id: { in: toClear } },
    data: { remittanceId: remittance.id },
  });
  return remittance;
}

function periodLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
}

async function buildCommissionInvoice(bill: CommissionBill, records: CommissionRecord[]) {
  const [vendor, config] = await Promise.all([
    prisma.user.findUnique({ where: { id: bill.vendorId } }),
    prisma.configuration.findFirst(),
  ]);
  const storeIds = [...new Set(records.map((r) => r.restaurantId))];
  const stores = storeIds.length
    ? await prisma.restaurant.findMany({ where: { id: { in: storeIds } }, select: { name: true } })
    : [];
  const effectiveRate = bill.grossFoodSubtotal > 0 ? (bill.commissionTotal / bill.grossFoodSubtotal) * 100 : 0;

  return {
    invoiceNumber: bill.invoiceNumber ?? `PDR-INV-${bill.id.slice(-8).toUpperCase()}`,
    issuedOn: bill.createdAt.toISOString(),
    periodLabel: periodLabel(bill.periodStart, bill.periodEnd),
    platformName: config?.platformLegalName || 'Padharo',
    platformAddress: config?.platformAddress ?? null,
    platformGstin: config?.platformGstin ?? null,
    vendorName: vendor?.name || vendor?.email || 'Vendor',
    vendorEmail: vendor?.email ?? null,
    vendorPhone: vendor?.phone ?? null,
    storeNames: stores.map((s) => s.name),
    orderCount: bill.orderCount,
    grossFoodSubtotal: round2(bill.grossFoodSubtotal),
    commissionRate: Math.round(effectiveRate * 100) / 100,
    commissionTotal: round2(bill.commissionTotal),
    status: bill.status,
    note: bill.note ?? null,
  };
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
      const currentUser = requireRole(context, ['ADMIN', 'VENDOR']);
      const bill = await prisma.commissionBill.findUnique({ where: { id: args.id } });
      if (!bill) throw notFoundError('Commission bill not found');
      if (currentUser.userType === 'VENDOR' && bill.vendorId !== currentUser.id) {
        throw notFoundError('Commission bill not found');
      }
      const records = await prisma.commissionRecord.findMany({
        where: { billId: bill.id },
        orderBy: { orderDeliveredAt: 'asc' },
      });
      const invoice = await buildCommissionInvoice(bill, records);
      return { bill, records, invoice };
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
      const pending = await prisma.riderCashRemittance.groupBy({
        by: ['riderId'],
        where: { status: 'PENDING' },
        _count: { _all: true },
        _sum: { amount: true },
      });
      const pendingByRider = new Map(pending.map((p) => [p.riderId, { count: p._count._all, total: p._sum.amount ?? 0 }]));

      const riderIds = new Set<string>([...byRider.keys(), ...pendingByRider.keys()]);
      const riders = await prisma.user.findMany({ where: { id: { in: [...riderIds] } } });
      const rmap = new Map(riders.map((r) => [r.id, r]));
      return [...riderIds]
        .map((riderId) => {
          const agg = byRider.get(riderId);
          const pend = pendingByRider.get(riderId);
          const r = rmap.get(riderId);
          return {
            rider: { _id: riderId, name: r?.name ?? null, username: r?.username ?? null, phone: r?.phone ?? null },
            entryCount: agg?.count ?? 0,
            outstanding: round2(agg?.total ?? 0),
            oldestUnremittedAt: agg?.oldest.toISOString() ?? null,
            pendingDepositCount: pend?.count ?? 0,
            pendingDepositTotal: round2(pend?.total ?? 0),
          };
        })
        .sort((a, b) => b.outstanding - a.outstanding || b.pendingDepositTotal - a.pendingDepositTotal);
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
      const lifetimeRemitted = remittances
        .filter((r) => r.status === 'CONFIRMED')
        .reduce((s, r) => s + r.amount, 0);
      const pendingDepositTotal = remittances
        .filter((r) => r.status === 'PENDING')
        .reduce((s, r) => s + r.amount, 0);
      const walletBalance = profile?.currentWalletAmount ?? 0;

      return {
        rider: { _id: rider.id, name: rider.name, username: rider.username, phone: rider.phone },
        outstanding: round2(outstanding),
        lifetimeCollected: round2(lifetimeCollected),
        lifetimeRemitted: round2(lifetimeRemitted),
        cashLimit: config?.riderCashLimit ?? 3000,
        walletBalance: round2(walletBalance),
        availableToWithdraw: round2(Math.max(0, walletBalance - outstanding)),
        pendingDepositTotal: round2(pendingDepositTotal),
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
      const bills = await closeCommissionBills({ periodStart: args.periodStart, periodEnd: args.periodEnd });
      if (bills.length)
        await recordAudit(context, {
          action: 'commission.period.close',
          summary: `Closed the commission period — ${bills.length} bill(s), ₹${bills.reduce((s, b) => s + b.commissionTotal, 0).toFixed(2)}`,
        });
      return bills;
    },

    closeCompletedCommissionPeriods: async (_parent, _args, context) => {
      requireRole(context, ['ADMIN']);
      const { start } = currentPeriod(await billingCycle());
      const bills = await closeCommissionBills({ before: start });
      if (bills.length)
        await recordAudit(context, {
          action: 'commission.period.close',
          summary: `Closed completed period(s) — ${bills.length} bill(s)`,
        });
      return bills;
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
      const updated = await prisma.commissionBill.update({
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
      await recordAudit(context, {
        action: `commission.bill.${status.toLowerCase()}`,
        targetType: 'CommissionBill',
        targetId: args.id,
        summary: `Commission bill ${existing.status} → ${status} (₹${updated.commissionTotal.toFixed(2)})`,
        changes: { status: [existing.status, status], paidAmount: updated.paidAmount },
      });
      return updated;
    },

    recordRiderCashRemittance: async (
      _parent,
      args: { riderId: string; amount?: number; method?: string; note?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN']);
      const remittance = await settleRiderCash({
        riderId: args.riderId,
        amount: args.amount,
        method: args.method ?? 'cash',
        note: args.note ?? null,
        recordedById: currentUser.id,
      });
      await recordAudit(context, {
        action: 'ridercash.remittance',
        targetType: 'User',
        targetId: args.riderId,
        summary: `Recorded rider cash deposit ₹${remittance.amount} (${remittance.entryCount} deliveries, ${remittance.method ?? 'cash'})`,
      });
      return remittance;
    },

    riderReportDeposit: async (
      _parent,
      args: { riderId?: string; amount: number; method?: string; reference?: string; note?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN', 'RIDER']);
      const riderId = currentUser.userType === 'RIDER' ? currentUser.id : args.riderId;
      if (!riderId) throw userInputError('riderId is required');
      if (currentUser.userType === 'RIDER' && args.riderId && args.riderId !== currentUser.id) {
        throw notFoundError('Rider not found');
      }
      if (!(args.amount > 0)) throw userInputError('Deposit amount must be greater than zero');

      const outstanding = await prisma.riderCashEntry.aggregate({
        where: { riderId, remittanceId: null },
        _sum: { owedToPlatform: true },
      });
      const pending = await prisma.riderCashRemittance.aggregate({
        where: { riderId, status: 'PENDING' },
        _sum: { amount: true },
      });
      const owed = round2(outstanding._sum.owedToPlatform ?? 0);
      const claimed = round2(pending._sum.amount ?? 0);
      if (args.amount > owed - claimed + 0.5) {
        throw userInputError(
          `You're reporting more than you owe. Outstanding ₹${owed}${claimed ? `, already reported ₹${claimed}` : ''}.`,
        );
      }

      const remittance = await prisma.riderCashRemittance.create({
        data: {
          riderId,
          amount: round2(args.amount),
          entryCount: 0,
          method: args.method ?? 'upi',
          reference: args.reference ?? null,
          note: args.note ?? null,
          recordedById: currentUser.id,
          status: 'PENDING',
        },
      });
      await recordAudit(context, {
        action: 'ridercash.deposit.reported',
        targetType: 'User',
        targetId: riderId,
        summary: `Rider reported a ₹${round2(args.amount)} cash deposit (${args.method ?? 'upi'}) — awaiting confirmation`,
      });
      return remittance;
    },

    confirmRiderCashDeposit: async (
      _parent,
      args: { id: string; approve: boolean; note?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN']);
      const remittance = await prisma.riderCashRemittance.findUnique({ where: { id: args.id } });
      if (!remittance) throw notFoundError('Deposit not found');
      if (remittance.status !== 'PENDING') throw userInputError('This deposit has already been reviewed');

      if (!args.approve) {
        const rejected = await prisma.riderCashRemittance.update({
          where: { id: args.id },
          data: { status: 'REJECTED', note: args.note ?? remittance.note },
        });
        await recordAudit(context, {
          action: 'ridercash.deposit.rejected',
          targetType: 'User',
          targetId: remittance.riderId,
          summary: `Rejected a rider-reported deposit of ₹${round2(remittance.amount)}`,
        });
        return rejected;
      }

      // Approve: clear oldest entries up to the reported amount, then mark it
      // CONFIRMED. Reuse the shared settlement, but attach to the existing row.
      const open = await prisma.riderCashEntry.findMany({
        where: { riderId: remittance.riderId, remittanceId: null },
        orderBy: { deliveredAt: 'asc' },
      });
      const toClear: string[] = [];
      let cleared = 0;
      for (const e of open) {
        if (cleared + e.owedToPlatform > remittance.amount + 0.5) break;
        toClear.push(e.id);
        cleared += e.owedToPlatform;
      }
      if (toClear.length === 0) {
        throw userInputError(
          `The smallest outstanding entry is larger than the reported ₹${round2(remittance.amount)} — reject this and ask the rider to re-report.`,
        );
      }
      await prisma.riderCashEntry.updateMany({ where: { id: { in: toClear } }, data: { remittanceId: remittance.id } });
      const confirmed = await prisma.riderCashRemittance.update({
        where: { id: args.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          // Snapshot what was actually applied (COD entries clear whole).
          amount: round2(cleared),
          entryCount: toClear.length,
          recordedById: currentUser.id,
          note: args.note ?? remittance.note,
        },
      });
      await recordAudit(context, {
        action: 'ridercash.deposit.confirmed',
        targetType: 'User',
        targetId: remittance.riderId,
        summary: `Confirmed a rider cash deposit of ₹${round2(cleared)} (cleared ${toClear.length} deliveries)`,
      });
      return confirmed;
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
    status: (parent: RiderCashRemittance) => parent.status ?? 'CONFIRMED',
    confirmedAt: (parent: RiderCashRemittance) => parent.confirmedAt?.toISOString() ?? null,
    createdAt: (parent: RiderCashRemittance) => parent.createdAt.toISOString(),
  },
};
