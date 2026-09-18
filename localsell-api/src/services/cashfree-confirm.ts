// Shared "flip a CASHFREE order to PAID/FAILED" logic — used by both the
// webhook (routes/cashfree-webhook.ts) and the recheckCashfreePayment mutation
// (a client-triggered fallback for when the webhook is delayed or missed), so
// the two paths can never drift out of sync on what "payment confirmed" does.
import { prisma } from '../prisma/client';
import { Order } from '@prisma/client';
import { publishOrderUpdate } from '../graphql/resolvers/order.resolvers';
import { notifyOrderEvent } from './order-notify';
import { pubsub, TOPICS } from '../utils/pubsub';

/** No-op if the order is already PAID (idempotent — safe to call from a webhook retry or a repeated recheck). */
export async function confirmCashfreeOrderPaid(
  orderId: string,
  paidAmount: number,
  gatewayRef: string | null,
): Promise<Order | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod !== 'CASHFREE') return null;
  if (order.paymentStatus === 'PAID') return order;

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'PAID', paidAmount, paymentGatewayRef: gatewayRef },
  });
  await publishOrderUpdate(updated);
  notifyOrderEvent(updated.id, 'PAYMENT_CONFIRMED');

  // Payment just confirmed — the first moment the store is allowed to see this
  // order (placeOrder deliberately held it back for CASHFREE; see the matching
  // gate there and in the restaurantOrders query).
  notifyOrderEvent(updated.id, 'PLACED');
  const restaurant = await prisma.restaurant.findUnique({ where: { id: updated.restaurantId } });
  if (restaurant) {
    await pubsub.publish(TOPICS.SUBSCRIBE_PLACE_ORDER(updated.restaurantId), {
      subscribePlaceOrder: { userId: updated.userId, origin: 'order_service', order: updated },
    });
    await prisma.webNotification.create({
      data: { userId: restaurant.ownerId, body: `New order #${updated.orderId} received`, navigateTo: '/orders' },
    });
  }
  return updated;
}

/** No-op if the order is already PAID (a later successful payment must never be clobbered by a stale failure signal). */
export async function markCashfreeOrderFailed(orderId: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod !== 'CASHFREE') return null;
  if (order.paymentStatus === 'PAID') return order;

  const updated = await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'FAILED' } });
  await publishOrderUpdate(updated);
  return updated;
}
