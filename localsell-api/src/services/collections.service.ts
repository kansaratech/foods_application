import { prisma } from "../prisma/client";
import { userInputError, notFoundError } from "../utils/errors";

export const roundMoney = (amount: number) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;
export function billOutstanding(bill: {
  status: string;
  commissionTotal: number;
  paidAmount: number | null;
}): number {
  return ["PAID", "WAIVED"].includes(bill.status)
    ? 0
    : Math.max(0, roundMoney(bill.commissionTotal - (bill.paidAmount ?? 0)));
}
export function paymentAmount(amount: number, outstanding: number): number {
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.abs(amount - roundMoney(amount)) > 0.000001
  )
    throw userInputError(
      "Enter a positive amount with at most two decimal places.",
    );
  if (amount > outstanding)
    throw userInputError("Payment cannot exceed the outstanding commission.");
  return roundMoney(amount);
}
export function reportDates(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return undefined;
  if (
    !startDate ||
    !endDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  )
    throw userInputError("Choose a complete date range.");
  const gte = new Date(`${startDate}T00:00:00+05:30`),
    lte = new Date(`${endDate}T23:59:59.999+05:30`);
  if (
    !Number.isFinite(gte.getTime()) ||
    !Number.isFinite(lte.getTime()) ||
    gte > lte ||
    new Date(gte.getTime() + 330 * 60000).toISOString().slice(0, 10) !==
      startDate ||
    new Date(lte.getTime() + 330 * 60000).toISOString().slice(0, 10) !== endDate
  )
    throw userInputError("Choose a valid date range.");
  return { gte, lte };
}
export type PaymentInput = {
  billId: string;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  receivedAt: string;
  idempotencyKey: string;
};
export async function collectCommission(input: PaymentInput, actorId: string) {
  if (!["CASH", "UPI", "BANK_TRANSFER"].includes(input.method))
    throw userInputError("Choose Cash, UPI or Bank transfer.");
  if (input.method !== "CASH" && !input.reference?.trim())
    throw userInputError("A bank or UPI transaction reference is required.");
  if (!input.idempotencyKey || input.idempotencyKey.length > 100)
    throw userInputError("A payment request identifier is required.");
  if (
    (input.reference?.trim().length ?? 0) > 150 ||
    (input.note?.trim().length ?? 0) > 1000
  )
    throw userInputError("Reference or note is too long.");
  const receivedAt = new Date(input.receivedAt);
  if (
    !Number.isFinite(receivedAt.getTime()) ||
    receivedAt.getTime() > Date.now() + 60000
  )
    throw userInputError(
      "Payment date must be valid and cannot be in the future.",
    );
  const previous = await prisma.commissionPayment.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (previous) {
    if (
      previous.billId !== input.billId ||
      previous.amount !== input.amount ||
      previous.method !== input.method ||
      previous.reference !== (input.reference?.trim() || null) ||
      previous.recordedById !== actorId ||
      previous.receivedAt.getTime() !== receivedAt.getTime() ||
      previous.note !== (input.note?.trim() || null)
    )
      throw userInputError(
        "This payment request was already used for different details.",
      );
    return previous;
  }
  return prisma.$transaction(async (tx) => {
    const bill = await tx.commissionBill.findUnique({
      where: { id: input.billId },
    });
    if (!bill) throw notFoundError("Commission bill not found");
    const amount = paymentAmount(input.amount, billOutstanding(bill));
    const paidAmount = roundMoney((bill.paidAmount ?? 0) + amount);
    const settled = paidAmount >= bill.commissionTotal;
    // Optimistic compare-and-set prevents concurrent collectors from overpaying a bill.
    const claim = await tx.commissionBill.updateMany({
      where: { id: bill.id, status: bill.status, paidAmount: bill.paidAmount },
      data: {
        paidAmount,
        status: settled ? "PAID" : "PENDING",
        paidAt: settled ? receivedAt : null,
      },
    });
    if (claim.count !== 1)
      throw userInputError(
        "The balance changed. Refresh this bill before recording payment.",
      );
    const receipt = await tx.commissionPayment.create({
      data: {
        billId: bill.id,
        vendorId: bill.vendorId,
        amount,
        method: input.method,
        reference: input.reference?.trim() || null,
        note: input.note?.trim() || null,
        receivedAt,
        recordedById: actorId,
        idempotencyKey: input.idempotencyKey,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        actorType: "ADMIN",
        action: "commission.payment.received",
        targetType: "CommissionBill",
        targetId: bill.id,
        summary: `Received commission ${amount.toFixed(2)} by ${input.method}`,
        changes: {
          receiptId: receipt.id,
          previousPaid: bill.paidAmount ?? 0,
          paidAmount,
        },
      },
    });
    return receipt;
  });
}
