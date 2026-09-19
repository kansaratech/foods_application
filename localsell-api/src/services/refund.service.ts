// Refunds a cancelled order's online payment back to the customer's original
// card/UPI via Cashfree. Mirrors cashfree-confirm.ts's shape: one place that
// both the cancellation resolvers and the refund webhook call, so they can't
// drift out of sync on what "refunded" means.
import { prisma } from '../prisma/client';
import { Order } from '@prisma/client';
import { getCashfreeCredentials, refundCashfreeOrder, fetchCashfreeRefundStatus } from './cashfree.service';
import { publishOrderUpdate } from '../graphql/resolvers/order.resolvers';
import { sendWhatsAppTemplateAsync } from '../utils/notifications';

function mapCashfreeRefundStatus(status: string | undefined): 'SUCCESS' | 'FAILED' | 'PROCESSING' {
  if (status === 'SUCCESS') return 'SUCCESS';
  if (status === 'FAILED' || status === 'CANCELLED') return 'FAILED';
  return 'PROCESSING'; // PENDING | ONHOLD | anything else Cashfree might add
}

const money = (n: number) => `₹${Math.round(n)}`;
const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || 'there';

/** Best-effort WhatsApp ping for a refund state change — never blocks the caller. */
function notifyRefundEvent(orderId: string, event: 'INITIATED' | 'COMPLETED' | 'FAILED', amount?: number): void {
  setImmediate(() => {
    void (async () => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { select: { id: true, name: true, phone: true } } },
      });
      if (!order?.user?.phone) return;
      const num = order.orderId;
      const params: Record<typeof event, [string, string[]]> = {
        INITIATED: ['refund_initiated', [firstName(order.user.name), num, money(amount ?? order.paidAmount)]],
        COMPLETED: ['refund_completed', [firstName(order.user.name), num, money(amount ?? order.refundedAmount ?? order.paidAmount)]],
        FAILED: ['refund_failed', [firstName(order.user.name), num]],
      } as const;
      const [key, bodyParams] = params[event];
      sendWhatsAppTemplateAsync(key, order.user.phone, bodyParams, {
        purpose: 'ORDER_UPDATE',
        userId: order.user.id,
        userType: 'CUSTOMER',
      });
    })().catch((err) => console.error(`[refund-notify] ${event} for ${orderId} failed:`, (err as Error).message));
  });
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
  notifyRefundEvent(order.id, 'INITIATED', order.paidAmount);

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
    if (mapped === 'SUCCESS') notifyRefundEvent(order.id, 'COMPLETED', result.refundAmount);
    else if (mapped === 'FAILED') notifyRefundEvent(order.id, 'FAILED');
    return updated;
  } catch (err) {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { refundStatus: 'FAILED', refundError: (err as Error).message.slice(0, 500) },
    });
    await publishOrderUpdate(updated);
    notifyRefundEvent(order.id, 'FAILED');
    return updated;
  }
}

/**
 * Reconciliation fallback for a refund stuck at PENDING/PROCESSING — the
 * REFUND_STATUS_WEBHOOK path is the only other way this resolves, and unlike
 * payment confirmation (which has recheckCashfreePayment as a customer/admin
 * fallback), refunds had nothing: a missed or never-configured webhook meant
 * a genuinely-completed Cashfree refund could sit "processing" in our DB
 * forever. Safe to call repeatedly — a no-op once resolved.
 */
export async function reconcileOrderRefund(orderId: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod !== 'CASHFREE') return order;
  if (!['PENDING', 'PROCESSING'].includes(order.refundStatus) || !order.refundId) return order;

  const creds = await getCashfreeCredentials();
  if (!creds) return order;

  const cfOrderId = order.cashfreeOrderId ?? order.id;
  try {
    const result = await fetchCashfreeRefundStatus(creds, cfOrderId, order.refundId);
    await applyRefundWebhookUpdate(order.refundId, result.status, result.refundAmount);
    return prisma.order.findUnique({ where: { id: orderId } });
  } catch (err) {
    console.error(`[refund-reconcile] ${orderId} failed:`, (err as Error).message);
    return order;
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
  // Only tell the customer once it actually resolves — the PENDING ->
  // PROCESSING transition itself isn't user-facing.
  if (mapped === 'SUCCESS') notifyRefundEvent(order.id, 'COMPLETED', refundAmount);
  else if (mapped === 'FAILED' && order.refundStatus !== 'FAILED') notifyRefundEvent(order.id, 'FAILED');
}
