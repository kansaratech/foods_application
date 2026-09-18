// Refunds a cancelled order's online payment back to the customer's original
// card/UPI via Cashfree. Mirrors cashfree-confirm.ts's shape: one place that
// both the cancellation resolvers and the refund webhook call, so they can't
// drift out of sync on what "refunded" means.
import { prisma } from '../prisma/client';
import { Order } from '@prisma/client';
import { getCashfreeCredentials, refundCashfreeOrder } from './cashfree.service';
import { publishOrderUpdate } from '../graphql/resolvers/order.resolvers';

function mapCashfreeRefundStatus(status: string | undefined): 'SUCCESS' | 'FAILED' | 'PROCESSING' {
  if (status === 'SUCCESS') return 'SUCCESS';
  if (status === 'FAILED' || status === 'CANCELLED') return 'FAILED';
  return 'PROCESSING'; // PENDING | ONHOLD | anything else Cashfree might add
}

/**
 * Call right after an order flips to CANCELLED. No-op for COD, unpaid, or
 * already-refunded orders. Never throws — a gateway failure must not block
 * the cancellation itself; it's recorded as refundStatus FAILED so an admin
 * can retry via retryOrderRefund.
 */
export async function refundOrderIfEligible(order: Order): Promise<Order> {
  if (order.paymentMethod !== 'CASHFREE') return order;
  if (order.paymentStatus !== 'PAID') return order;
  if (order.paidAmount <= 0) return order;
  // Already succeeded, or an attempt is already in flight — retryOrderRefund
  // is the only path allowed to re-fire a FAILED one.
  if (order.refundStatus !== 'NONE') return order;
  return attemptCashfreeRefund(order);
}

/** Fires (or re-fires, for a previously FAILED attempt) a Cashfree refund and records the outcome. */
export async function attemptCashfreeRefund(order: Order): Promise<Order> {
  const creds = await getCashfreeCredentials();
  if (!creds) {
    return prisma.order.update({
      where: { id: order.id },
      data: { refundStatus: 'FAILED', refundError: 'Cashfree is not configured' },
    });
  }

  const cfOrderId = order.cashfreeOrderId ?? order.id;
  // A fresh refund_id per attempt — Cashfree rejects reusing one that already
  // failed/cancelled under the same order, same reasoning as cashfreeOrderId's
  // per-attempt suffix (see createCashfreeOrder's comment).
  const priorAttempts = order.refundId ? Number(order.refundId.split('-refund-')[1] ?? '0') || 0 : 0;
  const refundId = `${order.id}-refund-${priorAttempts + 1}`;

  await prisma.order.update({
    where: { id: order.id },
    data: { refundStatus: 'PENDING', refundId, refundError: null },
  });

  try {
    const result = await refundCashfreeOrder(creds, cfOrderId, {
      refundId,
      refundAmount: order.paidAmount,
      refundNote: `Refund for cancelled order ${order.orderId}`,
    });
    const mapped = mapCashfreeRefundStatus(result.status);
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        refundStatus: mapped,
        refundedAmount: result.refundAmount,
        ...(mapped === 'SUCCESS' ? { refundedAt: new Date() } : {}),
      },
    });
    await publishOrderUpdate(updated);
    return updated;
  } catch (err) {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { refundStatus: 'FAILED', refundError: (err as Error).message.slice(0, 500) },
    });
    await publishOrderUpdate(updated);
    return updated;
  }
}

/** Applies a REFUND_STATUS_WEBHOOK event — a PENDING/PROCESSING refund resolving to SUCCESS/FAILED later. */
export async function applyRefundWebhookUpdate(
  refundId: string,
  refundStatus: string | undefined,
  refundAmount: number | undefined,
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { refundId } });
  if (!order) return;
  const mapped = mapCashfreeRefundStatus(refundStatus);
  // A webhook for an old, already-superseded attempt (order.refundId changed
  // since via a retry) would otherwise clobber the newer attempt's state.
  if (order.refundId !== refundId) return;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      refundStatus: mapped,
      ...(refundAmount != null ? { refundedAmount: refundAmount } : {}),
      ...(mapped === 'SUCCESS' ? { refundedAt: new Date() } : {}),
    },
  });
  await publishOrderUpdate(updated);
}
