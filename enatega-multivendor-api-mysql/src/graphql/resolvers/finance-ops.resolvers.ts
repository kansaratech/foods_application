import { IResolvers } from '@graphql-tools/utils';
import { PayoutRun, PayoutRunItem, UserType, WalletAdjustment } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { prisma } from '../../prisma/client';
import { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/auth';
import { notFoundError, userInputError } from '../../utils/errors';
import { recordAudit } from '../../utils/audit';
import { riderOutstandingCash } from '../../utils/commission';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

const ADJUSTMENT_REASONS = ['goodwill', 'chargeback', 'correction', 'penalty', 'other'];

function monthRange(startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = endDate ? new Date(endDate) : now;
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

async function subjectName(subjectType: string, subjectId: string): Promise<string | null> {
  if (subjectType === 'STORE') {
    const r = await prisma.restaurant.findUnique({ where: { id: subjectId }, select: { name: true } });
    return r?.name ?? null;
  }
  const u = await prisma.user.findUnique({ where: { id: subjectId }, select: { name: true, email: true } });
  return u?.name || u?.email || null;
}

async function loadRun(id: string): Promise<PayoutRun & { items: PayoutRunItem[] }> {
  const run = await prisma.payoutRun.findUnique({ where: { id }, include: { items: true } });
  if (!run) throw notFoundError('Payout run not found');
  return run;
}

export const financeOpsResolvers: IResolvers<unknown, GraphQLContext> = {
  Query: {
    walletAdjustments: async (
      _parent,
      args: { subjectType?: string; subjectId?: string; page?: number; limit?: number },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 20;
      const page = args.page ?? 1;
      const where = {
        ...(args.subjectType ? { subjectType: args.subjectType } : {}),
        ...(args.subjectId
          ? { OR: [{ restaurantId: args.subjectId }, { riderId: args.subjectId }] }
          : {}),
      };
      const [rows, total] = await Promise.all([
        prisma.walletAdjustment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.walletAdjustment.count({ where }),
      ]);
      const withNames = await Promise.all(
        rows.map(async (r) => ({
          ...r,
          subjectId: r.restaurantId ?? r.riderId ?? '',
          subjectName: await subjectName(r.subjectType, r.restaurantId ?? r.riderId ?? ''),
        })),
      );
      return { adjustments: withNames, total };
    },

    payoutRuns: async (_parent, args: { page?: number; limit?: number }, context) => {
      requireRole(context, ['ADMIN']);
      const limit = args.limit ?? 20;
      const page = args.page ?? 1;
      const [runs, total] = await Promise.all([
        prisma.payoutRun.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: { items: true },
        }),
        prisma.payoutRun.count(),
      ]);
      return { runs, total };
    },

    payoutRun: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      return loadRun(args.id);
    },

    payoutRunCsv: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      const run = await loadRun(args.id);
      const header = [
        'Payee type',
        'Payee',
        'Wallet balance',
        'Held cash',
        'Payout amount',
        'Status',
        'Method',
        'Reference',
        'Paid at',
      ];
      const esc = (v: unknown) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = run.items.map((i) =>
        [
          i.subjectType,
          i.payeeName,
          i.walletBalance.toFixed(2),
          i.heldCash.toFixed(2),
          i.amount.toFixed(2),
          i.status,
          i.method ?? '',
          i.reference ?? '',
          i.paidAt ? i.paidAt.toISOString() : '',
        ]
          .map(esc)
          .join(','),
      );
      return [header.join(','), ...lines].join('\n');
    },

    reconciliationReport: async (
      _parent,
      args: { startDate?: string; endDate?: string },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      const { start, end } = monthRange(args.startDate, args.endDate);

      const [records, bills, entries, remittances, stores, riderProfiles] = await Promise.all([
        prisma.commissionRecord.findMany({ where: { orderDeliveredAt: { gte: start, lte: end } } }),
        prisma.commissionBill.findMany({ where: { createdAt: { gte: start, lte: end } } }),
        prisma.riderCashEntry.findMany({ where: { deliveredAt: { gte: start, lte: end } } }),
        prisma.riderCashRemittance.findMany({ where: { createdAt: { gte: start, lte: end } } }),
        prisma.restaurant.findMany({ select: { currentWalletAmount: true } }),
        prisma.riderProfile.findMany({ select: { currentWalletAmount: true } }),
      ]);

      const accrued = records.reduce((s, r) => s + r.commissionAmount, 0);
      const selfCollected = records.filter((r) => r.selfCollected).reduce((s, r) => s + r.commissionAmount, 0);
      // Clean partition of the store-owed (non-self-collected) commission.
      const storeOwed = records.filter((r) => !r.selfCollected);
      const storeOwedTotal = storeOwed.reduce((s, r) => s + r.commissionAmount, 0);
      const storeOwedInvoiced = storeOwed.filter((r) => r.billId).reduce((s, r) => s + r.commissionAmount, 0);
      const storeOwedPending = storeOwed.filter((r) => !r.billId).reduce((s, r) => s + r.commissionAmount, 0);

      const billTotal = bills.reduce((s, b) => s + b.commissionTotal, 0);
      const billPaid = bills.filter((b) => b.status === 'PAID').reduce((s, b) => s + (b.paidAmount ?? b.commissionTotal), 0);
      const billWaived = bills.filter((b) => b.status === 'WAIVED').reduce((s, b) => s + b.commissionTotal, 0);
      const billPending = bills.filter((b) => b.status === 'PENDING').reduce((s, b) => s + b.commissionTotal, 0);

      const codCollected = entries.reduce((s, e) => s + e.owedToPlatform, 0);
      const codRemitted = entries.filter((e) => e.remittanceId).reduce((s, e) => s + e.owedToPlatform, 0);
      const codOpen = entries.filter((e) => !e.remittanceId).reduce((s, e) => s + e.owedToPlatform, 0);

      const pendingRemitRows = remittances.filter((r) => r.status === 'PENDING');
      const pendingRemit = pendingRemitRows.reduce((s, r) => s + r.amount, 0);

      // All-time cash-clearing invariant: every cleared COD entry belongs to
      // exactly one confirmed remittance and vice-versa.
      const [allConfirmedRemit, allClearedEntries] = await Promise.all([
        prisma.riderCashRemittance.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amount: true } }),
        prisma.riderCashEntry.aggregate({ where: { remittanceId: { not: null } }, _sum: { owedToPlatform: true } }),
      ]);

      const line = (label: string, expected: number, actual: number) => ({
        label,
        expected: round2(expected),
        actual: round2(actual),
        delta: round2(actual - expected),
        ok: Math.abs(actual - expected) < 1,
      });

      const lines = [
        line(
          'Every rupee of commission earned is accounted for (either kept by the store to remit later, or already collected)',
          accrued,
          selfCollected + storeOwedTotal,
        ),
        line(
          "What stores owe us matches what we've billed them plus what's still waiting to be billed",
          storeOwedTotal,
          storeOwedInvoiced + storeOwedPending,
        ),
        line('Every invoice sent to a store is either paid, waived, or still pending', billTotal, billPaid + billWaived + billPending),
        line('Cash-on-delivery collected by riders matches what they’ve handed in plus what they’re still holding', codCollected, codRemitted + codOpen),
        line(
          'All time: every rupee riders have handed in matches a cash-collection record we expected',
          allConfirmedRemit._sum.amount ?? 0,
          allClearedEntries._sum.owedToPlatform ?? 0,
        ),
      ];

      return {
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        lines,
        storeWalletOutstanding: round2(stores.reduce((s, r) => s + Math.max(0, r.currentWalletAmount), 0)),
        riderWalletOutstanding: round2(riderProfiles.reduce((s, r) => s + Math.max(0, r.currentWalletAmount), 0)),
        negativeWalletStores: stores.filter((r) => r.currentWalletAmount < -0.01).length,
        negativeWalletRiders: riderProfiles.filter((r) => r.currentWalletAmount < -0.01).length,
        pendingRiderDeposits: pendingRemitRows.length,
        pendingRiderDepositTotal: round2(pendingRemit),
        generatedAt: new Date().toISOString(),
      };
    },
  },

  Mutation: {
    adjustWallet: async (
      _parent,
      args: { subjectType: string; subjectId: string; amount: number; reason: string; note?: string },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN']);
      if (!['STORE', 'RIDER'].includes(args.subjectType)) {
        throw userInputError('subjectType must be STORE or RIDER');
      }
      if (!ADJUSTMENT_REASONS.includes(args.reason)) {
        throw userInputError(`reason must be one of ${ADJUSTMENT_REASONS.join(', ')}`);
      }
      if (!args.amount || Math.abs(args.amount) < 0.01) {
        throw userInputError('Adjustment amount cannot be zero');
      }
      const amount = round2(args.amount);

      if (args.subjectType === 'STORE') {
        const store = await prisma.restaurant.findUnique({ where: { id: args.subjectId } });
        if (!store) throw notFoundError('Store not found');
        await prisma.restaurant.update({
          where: { id: store.id },
          data: {
            currentWalletAmount: { increment: amount },
            totalWalletAmount: { increment: amount > 0 ? amount : 0 },
          },
        });
      } else {
        const profile = await prisma.riderProfile.findUnique({ where: { userId: args.subjectId } });
        if (!profile) throw notFoundError('Rider not found');
        await prisma.riderProfile.update({
          where: { userId: args.subjectId },
          data: {
            currentWalletAmount: { increment: amount },
            totalWalletAmount: { increment: amount > 0 ? amount : 0 },
          },
        });
      }

      const row = await prisma.walletAdjustment.create({
        data: {
          subjectType: args.subjectType,
          restaurantId: args.subjectType === 'STORE' ? args.subjectId : null,
          riderId: args.subjectType === 'RIDER' ? args.subjectId : null,
          amount,
          reason: args.reason,
          note: args.note ?? null,
          createdById: currentUser.id,
          createdByEmail: currentUser.email ?? null,
        },
      });
      const name = await subjectName(args.subjectType, args.subjectId);
      await recordAudit(context, {
        action: 'wallet.adjust',
        targetType: args.subjectType === 'STORE' ? 'Restaurant' : 'User',
        targetId: args.subjectId,
        summary: `Wallet ${amount >= 0 ? 'credit' : 'debit'} ₹${Math.abs(amount)} to ${name ?? args.subjectId} (${args.reason})`,
        changes: { amount, reason: args.reason, note: args.note ?? null },
      });
      return { ...row, subjectId: args.subjectId, subjectName: name };
    },

    createPayoutRun: async (
      _parent,
      args: {
        label?: string;
        periodStart?: string;
        periodEnd?: string;
        minAmount?: number;
        includeStores?: boolean;
        includeRiders?: boolean;
      },
      context,
    ) => {
      const currentUser = requireRole(context, ['ADMIN']);
      const { start, end } = monthRange(args.periodStart, args.periodEnd);
      const minAmount = args.minAmount ?? 1;
      const includeStores = args.includeStores ?? true;
      const includeRiders = args.includeRiders ?? true;

      const items: Array<{
        subjectType: string;
        restaurantId: string | null;
        riderId: string | null;
        payeeName: string;
        walletBalance: number;
        heldCash: number;
        amount: number;
      }> = [];

      if (includeStores) {
        const stores = await prisma.restaurant.findMany({
          where: { currentWalletAmount: { gte: minAmount } },
          select: { id: true, name: true, currentWalletAmount: true },
        });
        for (const s of stores) {
          items.push({
            subjectType: 'STORE',
            restaurantId: s.id,
            riderId: null,
            payeeName: s.name,
            walletBalance: round2(s.currentWalletAmount),
            heldCash: 0,
            amount: round2(s.currentWalletAmount),
          });
        }
      }

      if (includeRiders) {
        const profiles = await prisma.riderProfile.findMany({
          where: { currentWalletAmount: { gte: minAmount } },
          select: { userId: true, currentWalletAmount: true },
        });
        const riders = await prisma.user.findMany({
          where: { id: { in: profiles.map((p) => p.userId) } },
          select: { id: true, name: true, email: true },
        });
        const rmap = new Map(riders.map((r) => [r.id, r]));
        for (const p of profiles) {
          const held = await riderOutstandingCash(p.userId);
          const payable = Math.max(0, p.currentWalletAmount - held);
          if (payable < minAmount) continue;
          const r = rmap.get(p.userId);
          items.push({
            subjectType: 'RIDER',
            restaurantId: null,
            riderId: p.userId,
            payeeName: r?.name || r?.email || 'Rider',
            walletBalance: round2(p.currentWalletAmount),
            heldCash: round2(held),
            amount: round2(payable),
          });
        }
      }

      if (items.length === 0) throw userInputError('No payees have a payable balance for this run');

      const grossTotal = round2(items.reduce((s, i) => s + i.amount, 0));
      const label =
        args.label ||
        `Run ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;

      const run = await prisma.payoutRun.create({
        data: {
          label,
          periodStart: start,
          periodEnd: end,
          status: 'OPEN',
          itemCount: items.length,
          grossTotal,
          paidTotal: 0,
          createdById: currentUser.id,
          items: { create: items },
        },
        include: { items: true },
      });
      await recordAudit(context, {
        action: 'payout.run.create',
        targetType: 'PayoutRun',
        targetId: run.id,
        summary: `Created payout run "${label}" — ${items.length} payees, ₹${grossTotal}`,
      });
      return run;
    },

    markPayoutItemPaid: async (
      _parent,
      args: { id: string; method?: string; reference?: string; note?: string },
      context,
    ) => {
      requireRole(context, ['ADMIN']);
      const item = await prisma.payoutRunItem.findUnique({ where: { id: args.id } });
      if (!item) throw notFoundError('Payout line not found');
      if (item.status !== 'PENDING') throw userInputError('This line has already been settled');

      if (item.subjectType === 'STORE' && item.restaurantId) {
        await prisma.restaurant.update({
          where: { id: item.restaurantId },
          data: {
            currentWalletAmount: { decrement: item.amount },
            withdrawnWalletAmount: { increment: item.amount },
          },
        });
      } else if (item.subjectType === 'RIDER' && item.riderId) {
        await prisma.riderProfile.update({
          where: { userId: item.riderId },
          data: {
            currentWalletAmount: { decrement: item.amount },
            withdrawnWalletAmount: { increment: item.amount },
          },
        });
      }

      await prisma.transaction.create({
        data: {
          transactionId: `PAYOUT-${nanoid()}`,
          riderId: item.riderId,
          restaurantId: item.restaurantId,
          userType: item.subjectType === 'RIDER' ? UserType.RIDER : UserType.VENDOR,
          amountTransferred: item.amount,
          status: 'COMPLETED',
        },
      });

      const updated = await prisma.payoutRunItem.update({
        where: { id: item.id },
        data: {
          status: 'PAID',
          method: args.method ?? 'bank',
          reference: args.reference ?? null,
          note: args.note ?? item.note,
          paidAt: new Date(),
        },
      });
      const run = await loadRun(item.runId);
      await prisma.payoutRun.update({
        where: { id: run.id },
        data: { paidTotal: round2(run.items.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0)) },
      });
      await recordAudit(context, {
        action: 'payout.item.paid',
        targetType: item.subjectType === 'RIDER' ? 'User' : 'Restaurant',
        targetId: item.riderId ?? item.restaurantId ?? item.id,
        summary: `Paid ₹${item.amount} to ${item.payeeName} (${args.method ?? 'bank'}${args.reference ? ` · ${args.reference}` : ''})`,
      });
      return updated;
    },

    skipPayoutItem: async (_parent, args: { id: string; note?: string }, context) => {
      requireRole(context, ['ADMIN']);
      const item = await prisma.payoutRunItem.findUnique({ where: { id: args.id } });
      if (!item) throw notFoundError('Payout line not found');
      if (item.status !== 'PENDING') throw userInputError('This line has already been settled');
      const updated = await prisma.payoutRunItem.update({
        where: { id: item.id },
        data: { status: 'SKIPPED', note: args.note ?? item.note },
      });
      await recordAudit(context, {
        action: 'payout.item.skip',
        targetType: 'PayoutRunItem',
        targetId: item.id,
        summary: `Skipped payout to ${item.payeeName} (₹${item.amount})`,
      });
      return updated;
    },

    completePayoutRun: async (_parent, args: { id: string }, context) => {
      requireRole(context, ['ADMIN']);
      const run = await loadRun(args.id);
      if (run.status === 'COMPLETED') return run;
      const pending = run.items.filter((i) => i.status === 'PENDING').length;
      if (pending > 0) {
        throw userInputError(`${pending} line(s) still pending — pay or skip them first`);
      }
      const updated = await prisma.payoutRun.update({
        where: { id: run.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: { items: true },
      });
      await recordAudit(context, {
        action: 'payout.run.complete',
        targetType: 'PayoutRun',
        targetId: run.id,
        summary: `Completed payout run "${run.label}" — ₹${updated.paidTotal} paid`,
      });
      return updated;
    },
  },

  WalletAdjustmentRow: {
    _id: (parent: WalletAdjustment & { subjectId?: string; subjectName?: string | null }) => parent.id,
    subjectId: (parent: WalletAdjustment & { subjectId?: string }) =>
      parent.subjectId ?? parent.restaurantId ?? parent.riderId ?? '',
    createdAt: (parent: WalletAdjustment) => parent.createdAt.toISOString(),
  },

  PayoutRunRow: {
    _id: (parent: PayoutRun) => parent.id,
    periodStart: (parent: PayoutRun) => parent.periodStart.toISOString(),
    periodEnd: (parent: PayoutRun) => parent.periodEnd.toISOString(),
    createdAt: (parent: PayoutRun) => parent.createdAt.toISOString(),
    completedAt: (parent: PayoutRun) => parent.completedAt?.toISOString() ?? null,
    items: async (parent: PayoutRun & { items?: PayoutRunItem[] }) =>
      parent.items ?? prisma.payoutRunItem.findMany({ where: { runId: parent.id }, orderBy: { payeeName: 'asc' } }),
  },

  PayoutRunItemRow: {
    _id: (parent: PayoutRunItem) => parent.id,
    subjectId: (parent: PayoutRunItem) => parent.riderId ?? parent.restaurantId ?? '',
    paidAt: (parent: PayoutRunItem) => parent.paidAt?.toISOString() ?? null,
  },
};
