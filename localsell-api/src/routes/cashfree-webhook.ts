import { Router, raw } from 'express';
import { prisma } from '../prisma/client';
import { verifyCashfreeWebhookSignature } from '../services/cashfree.service';
import { confirmCashfreeOrderPaid, markCashfreeOrderFailed } from '../services/cashfree-confirm';

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
 * Cashfree's `order_id` is a per-attempt id ("<Order.id>-<attempt>", stored on
 * Order.cashfreeOrderId at session-creation time — see createCashfreePaymentSession)
 * rather than Order.id itself, because Cashfree rejects re-creating an order
 * under an id that already exists, which a "Pay Again" retry would otherwise
 * hit every time. Older orders (created before this field existed) still used
 * Order.id directly, so that's the fallback lookup.
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
    const cfOrderId = body.data?.order?.order_id;
    if (!cfOrderId) return;

    const order =
      (await prisma.order.findUnique({ where: { cashfreeOrderId: cfOrderId } })) ??
      (await prisma.order.findUnique({ where: { id: cfOrderId } })); // legacy: pre-attempt-id orders
    if (!order || order.paymentMethod !== 'CASHFREE') return;

    if (body.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const updated = await confirmCashfreeOrderPaid(
        order.id,
        body.data?.payment?.payment_amount ?? order.orderAmount,
        body.data?.payment?.cf_payment_id ?? null,
      );
      if (updated) console.log(`[cashfree-webhook] order ${order.id} marked PAID (cf_payment_id=${body.data?.payment?.cf_payment_id})`);
    } else if (body.type === 'PAYMENT_FAILED_WEBHOOK' || body.type === 'PAYMENT_USER_DROPPED_WEBHOOK') {
      const updated = await markCashfreeOrderFailed(order.id);
      if (updated) console.log(`[cashfree-webhook] order ${order.id} marked FAILED (${body.type})`);
    }
  } catch (err) {
    console.error('[cashfree-webhook] processing error:', (err as Error).message);
  }
});
