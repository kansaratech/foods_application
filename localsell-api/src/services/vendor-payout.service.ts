import { prisma } from "../prisma/client";
import { userInputError, notFoundError } from "../utils/errors";
import { roundMoney } from "./collections.service";

export type VendorPayoutInput = {
  vendorId: string;
  payableIds: string[];
  method: string;
  reference?: string;
  note?: string;
  paidAt: string;
  idempotencyKey: string;
};

/**
 * Pays out a vendor's net-of-commission share for a batch of CASHFREE
 * orders. Mirrors `collectCommission` (collections.service.ts) — same
 * idempotency-key replay guard, optimistic compare-and-set on each
 * `VendorPayable` row (status must still be PENDING), one immutable
 * `VendorPayout` receipt, one audit log entry.
 */
export async function payVendorPayables(input: VendorPayoutInput, actorId: string) {
  if (!["CASH", "UPI", "BANK_TRANSFER"].includes(input.method))
    throw userInputError("Choose Cash, UPI or Bank transfer.");
  if (input.method !== "CASH" && !input.reference?.trim())
    throw userInputError("A bank or UPI transaction reference is required.");
  if (!input.idempotencyKey || input.idempotencyKey.length > 100)
    throw userInputError("A payout request identifier is required.");
  if (!input.payableIds?.length) throw userInputError("Select at least one payable to pay out.");
  if (
    (input.reference?.trim().length ?? 0) > 150 ||
    (input.note?.trim().length ?? 0) > 1000
  )
    throw userInputError("Reference or note is too long.");
  const paidAt = new Date(input.paidAt);
  if (!Number.isFinite(paidAt.getTime()) || paidAt.getTime() > Date.now() + 60000)
    throw userInputError("Payout date must be valid and cannot be in the future.");

  const previous = await prisma.vendorPayout.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (previous) {
    if (previous.vendorId !== input.vendorId || previous.method !== input.method) {
      throw userInputError("This payout request was already used for different details.");
    }
    return previous;
  }

  return prisma.$transaction(async (tx) => {
    const payables = await tx.vendorPayable.findMany({
      where: { id: { in: input.payableIds }, vendorId: input.vendorId },
    });
    if (payables.length !== input.payableIds.length) {
      throw notFoundError("Some selected payables were not found for this vendor.");
    }
    const alreadyPaid = payables.find((p) => p.status !== "PENDING");
    if (alreadyPaid) {
      throw userInputError("One of the selected payables was already paid out. Refresh and try again.");
    }
    const amount = roundMoney(payables.reduce((s, p) => s + p.netPayable, 0));

    const payout = await tx.vendorPayout.create({
      data: {
        vendorId: input.vendorId,
        amount,
        method: input.method,
        reference: input.reference?.trim() || null,
        note: input.note?.trim() || null,
        paidAt,
        recordedById: actorId,
        idempotencyKey: input.idempotencyKey,
      },
    });

    const claim = await tx.vendorPayable.updateMany({
      where: { id: { in: input.payableIds }, status: "PENDING" },
      data: { status: "PAID", payoutId: payout.id },
    });
    if (claim.count !== input.payableIds.length) {
      throw userInputError("Some payables changed while recording this payout. Refresh and try again.");
    }

    await tx.auditLog.create({
      data: {
        actorId,
        actorType: "ADMIN",
        action: "vendor.payout.paid",
        targetType: "User",
        targetId: input.vendorId,
        summary: `Paid out ₹${amount.toFixed(2)} to vendor by ${input.method} (${payables.length} order(s))`,
        changes: { payoutId: payout.id, payableIds: input.payableIds, amount },
      },
    });

    return payout;
  });
}
