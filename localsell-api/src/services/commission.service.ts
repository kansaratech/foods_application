import { CommissionBill, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { randomUUID } from "crypto";
import { userInputError } from "../utils/errors";
import { reportDates, roundMoney } from "./collections.service";

/** Billing uses Indian calendar days, independent of the server's timezone. */
export function currentPeriod(
  cycle: string,
  ref = new Date(),
): { start: Date; end: Date } {
  const offset = 330 * 60 * 1000;
  const local = new Date(ref.getTime() + offset),
    y = local.getUTCFullYear(),
    m = local.getUTCMonth();
  return cycle === "YEARLY"
    ? {
        start: new Date(Date.UTC(y, 0, 1) - offset),
        end: new Date(Date.UTC(y + 1, 0, 1) - offset - 1),
      }
    : {
        start: new Date(Date.UTC(y, m, 1) - offset),
        end: new Date(Date.UTC(y, m + 1, 1) - offset - 1),
      };
}
export async function billingCycle(): Promise<string> {
  return (await prisma.configuration.findFirst())?.commissionBillingCycle ===
    "YEARLY"
    ? "YEARLY"
    : "MONTHLY";
}
export async function nextInvoiceNumber(periodEnd: Date): Promise<string> {
  const day = new Date(periodEnd.getTime() + 330 * 60000);
  return `LS-INV-${day.getUTCFullYear()}${String(day.getUTCMonth() + 1).padStart(2, "0")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}
export async function closeCommissionBills(opts: {
  before?: Date;
  periodStart?: string;
  periodEnd?: string;
}): Promise<CommissionBill[]> {
  const cycle = await billingCycle();
  const selectedRange =
    opts.periodStart || opts.periodEnd
      ? reportDates(
          opts.periodStart?.slice(0, 10),
          opts.periodEnd?.slice(0, 10),
        )
      : undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const records = await tx.commissionRecord.findMany({
            where: {
              billId: null,
              selfCollected: false,
              orderDeliveredAt: opts.before
                ? { lt: opts.before }
                : selectedRange,
            },
            orderBy: { orderDeliveredAt: "asc" },
          });
          const groups = new Map<string, typeof records>();
          for (const record of records) {
            const period = currentPeriod(cycle, record.orderDeliveredAt);
            const key = `${record.vendorId}:${period.start.toISOString()}`;
            groups.set(key, [...(groups.get(key) ?? []), record]);
          }
          const bills: CommissionBill[] = [];
          for (const group of groups.values()) {
            const period = currentPeriod(cycle, group[0].orderDeliveredAt);
            const bill = await tx.commissionBill.create({
              data: {
                vendorId: group[0].vendorId,
                periodStart:
                  selectedRange?.gte && selectedRange.gte > period.start
                    ? selectedRange.gte
                    : period.start,
                periodEnd:
                  selectedRange?.lte && selectedRange.lte < period.end
                    ? selectedRange.lte
                    : period.end,
                cycle,
                orderCount: group.length,
                grossFoodSubtotal: roundMoney(
                  group.reduce((n, r) => n + r.foodSubtotal, 0),
                ),
                commissionTotal: roundMoney(
                  group.reduce((n, r) => n + r.commissionAmount, 0),
                ),
                status: group.every((r) => r.commissionAmount === 0)
                  ? "PAID"
                  : "PENDING",
                paidAmount: 0,
                invoiceNumber: await nextInvoiceNumber(period.end),
              },
            });
            const claim = await tx.commissionRecord.updateMany({
              where: { id: { in: group.map((r) => r.id) }, billId: null },
              data: { billId: bill.id },
            });
            if (claim.count !== group.length)
              throw userInputError(
                "These orders were billed by another request. Refresh the list.",
              );
            bills.push(bill);
          }
          return bills;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 20000,
        },
      );
    } catch (error) {
      if (attempt < 2 && (error as { code?: string }).code === "P2034")
        continue;
      throw error;
    }
  }
  return [];
}
export async function autoCloseCompletedPeriods(): Promise<CommissionBill[]> {
  return closeCommissionBills({
    before: currentPeriod(await billingCycle()).start,
  });
}
