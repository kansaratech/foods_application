import { Router, raw } from 'express';
import { prisma } from '../prisma/client';
import { verifyCashfreeWebhookSignature } from '../services/cashfree.service';
import { publishOrderUpdate } from '../graphql/resolvers/order.resolvers';
import { notifyOrderEvent } from '../services/order-notify';
import { pubsub, TOPICS } from '../utils/pubsub';

/**
 * Cashfree Payment Gateway webhook.
 *
 *   POST /webhooks/cashfree
 *
 * Configure in Cashfree Dashboard → Developers → Webhooks:
 *   URL      https://<api-host>/webhooks/cashfree
 *   Events   PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK, PAYMENT_USER_DROPPED_WEBHOOK
 *
 * Needs the raw body for HMAC signature verification, so — like the WhatsApp
 * webhook — it brings its own body parser and is mounted before express.json().
 * Cashfree's `order_id` is always our Order.id (set at creation in
 * cashfree.service.createCashfreeOrder), so no separate mapping table is needed.
 */
export const cashfreeWebhookRouter = Router();

interface CashfreeWebhookPayload {
  type?: string; // PAYMENT_SUCCESS_WEBHOOK | PAYMENT_FAILED_WEBHOOK | PAYMENT_USER_DROPPED_WEBHOOK
  data?: {
    order?: { order_id?: string; order_amount?: number };
    payment?: { cf_payment_id?: string; payment_status?: string; payment_amount?: number };
  };
}

cashfreeWebhookRouter.post('/', raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

  const config = await prisma.configuration.findFirst();
  if (!config?.cashfreeSecretKey) {
    // Fail closed: with no secret configured we cannot verify this request came
    // from Cashfree at all, so treat it as untrusted rather than processing it.
    console.error('[cashfree-webhook] no cashfreeSecretKey configured — rejecting unverifiable webhook');
    return res.sendStatus(401);
  }
  {
    const signature = String(req.header('x-webhook-signature') ?? '');
    const timestamp = String(req.header('x-webhook-timestamp') ?? '');
    const ok = verifyCashfreeWebhookSignature(rawBody, timestamp, signature, config.cashfreeSecretKey);
    if (!ok) {
      console.warn('[cashfree-webhook] bad signature — rejected');
      return res.sendStatus(401);
    }
  }

  // Ack immediately; Cashfree retries on anything but a fast 200.
  res.sendStatus(200);

  try {
    const body: CashfreeWebhookPayload = JSON.parse(rawBody.toString('utf8') || '{}');
    const orderId = body.data?.order?.order_id;
    if (!orderId) return;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.paymentMethod !== 'CASHFREE') return;

    if (body.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      if (order.paymentStatus === 'PAID') return; // already processed (webhook retry)
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          paidAmount: body.data?.payment?.payment_amount ?? order.orderAmount,
          paymentGatewayRef: body.data?.payment?.cf_payment_id ?? null,
        },
      });
      await publishOrderUpdate(updated);
      notifyOrderEvent(updated.id, 'PAYMENT_CONFIRMED');

      // Payment just confirmed — this is the first moment the store is allowed
      // to see this order (placeOrder deliberately held it back for CASHFREE;
      // see the matching gate there and in the restaurantOrders query).
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
      console.log(`[cashfree-webhook] order ${orderId} marked PAID (cf_payment_id=${body.data?.payment?.cf_payment_id})`);
    } else if (body.type === 'PAYMENT_FAILED_WEBHOOK' || body.type === 'PAYMENT_USER_DROPPED_WEBHOOK') {
      if (order.paymentStatus === 'PAID') return; // a later successful retry already landed
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });
      await publishOrderUpdate(updated);
      console.log(`[cashfree-webhook] order ${orderId} marked FAILED (${body.type})`);
    }
  } catch (err) {
    console.error('[cashfree-webhook] processing error:', (err as Error).message);
  }
});
