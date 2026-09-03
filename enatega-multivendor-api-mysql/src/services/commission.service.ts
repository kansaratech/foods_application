import { CommissionBill, CommissionRecord } from '@prisma/client';
import { prisma } from '../prisma/client';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Calendar period (month or year) that contains `ref`. */
export function currentPeriod(cycle: string, ref = new Date()): { start: Date; end: Date } {
  const y = ref.getUTCFullYear();
  if (cycle === 'YEARLY') {
    return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)) };
  }
  const m = ref.getUTCMonth();
  return { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)) };
}

export async function billingCycle(): Promise<string> {
  const config = await prisma.configuration.findFirst();
  return config?.commissionBillingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
}

function groupByVendor(records: CommissionRecord[]) {
  const byVendor = new Map<
    string,
    { orderCount: number; grossFoodSubtotal: number; commissionTotal: number; records: CommissionRecord[] }
  >();
  for (const r of records) {
    const e = byVendor.get(r.vendorId) ?? { orderCount: 0, grossFoodSubtotal: 0, commissionTotal: 0, records: [] };
    e.orderCount += 1;
    e.grossFoodSubtotal += r.foodSubtotal;
    e.commissionTotal += r.commissionAmount;
    e.records.push(r);
    byVendor.set(r.vendorId, e);
  }
  return byVendor;
}

/**
 * Roll unbilled `CommissionRecord`s into one `CommissionBill` per vendor.
 *
 * - `before` (auto-close): only records delivered strictly before this date —
 *   i.e. records from a period that has fully ended. The current in-progress
 *   period stays open.
 * - `periodStart` / `periodEnd` (manual "close now"): stamped onto every bill;
 *   when omitted, each bill spans the min/max delivery date of its own records.
 *
 * Idempotent: records already carrying a `billId` are never touched.
 */
export async function closeCommissionBills(opts: {
  before?: Date;
  periodStart?: string;
  periodEnd?: string;
}): Promise<CommissionBill[]> {
  const cycle = await billingCycle();
  const unbilled = await prisma.commissionRecord.findMany({
    where: { billId: null, ...(opts.before ? { orderDeliveredAt: { lt: opts.before } } : {}) },
  });
  if (unbilled.length === 0) return [];

  const byVendor = groupByVendor(unbilled);
  const fallback = currentPeriod(cycle);
  const created: CommissionBill[] = [];

  for (const [vendorId, agg] of byVendor.entries()) {
    const deliveredAts = agg.records.map((r) => r.orderDeliveredAt.getTime());
    const periodStart = opts.periodStart
      ? new Date(opts.periodStart)
      : deliveredAts.length
        ? new Date(Math.min(...deliveredAts))
        : fallback.start;
    const periodEnd = opts.periodEnd
      ? new Date(opts.periodEnd)
      : deliveredAts.length
        ? new Date(Math.max(...deliveredAts))
        : fallback.end;

    const bill = await prisma.commissionBill.create({
      data: {
        vendorId,
        periodStart,
        periodEnd,
        cycle,
        orderCount: agg.orderCount,
        grossFoodSubtotal: round2(agg.grossFoodSubtotal),
        commissionTotal: round2(agg.commissionTotal),
        status: 'PENDING',
      },
    });
    await prisma.commissionRecord.updateMany({
      where: { id: { in: agg.records.map((r) => r.id) } },
      data: { billId: bill.id },
    });
    created.push(bill);
  }
  return created;
}

/**
 * Close every commission period that has fully ended (leaving the current one
 * open). Called on a schedule from `src/scheduler.ts`. Safe to run any number of
 * times — nothing happens until a period boundary is crossed with unbilled
 * records behind it.
 */
export async function autoCloseCompletedPeriods(): Promise<CommissionBill[]> {
  const cycle = await billingCycle();
  const { start } = currentPeriod(cycle);
  return closeCommissionBills({ before: start });
}
