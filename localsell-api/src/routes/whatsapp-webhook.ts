import { Router, raw } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma/client';
import { env } from '../config/env';

/**
 * Meta WhatsApp webhook.
 *
 *   GET  /webhooks/whatsapp   — one-time verification handshake (hub.challenge)
 *   POST /webhooks/whatsapp   — delivery/read receipts + inbound messages +
 *                               template-status changes
 *
 * Configure in Meta App → WhatsApp → Configuration → Webhook:
 *   Callback URL   https://<api-host>/webhooks/whatsapp
 *   Verify token   = WHATSAPP_VERIFY_TOKEN (env)
 *   Subscribe to   "messages" and "message_template_status_update"
 *
 * Signature check is enforced only when WHATSAPP_APP_SECRET is set.
 */
export const whatsappWebhookRouter = Router();

// Rank so out-of-order receipts never downgrade a row (read → delivered etc).
const RANK: Record<string, number> = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3 };

whatsappWebhookRouter.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === env.whatsappVerifyToken) {
    return res.status(200).send(String(challenge ?? ''));
  }
  return res.sendStatus(403);
});

whatsappWebhookRouter.post('/', raw({ type: '*/*', limit: '2mb' }), async (req, res) => {
  const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

  if (env.whatsappAppSecret) {
    const sig = String(req.header('x-hub-signature-256') ?? '');
    const expected =
      'sha256=' + crypto.createHmac('sha256', env.whatsappAppSecret).update(rawBody).digest('hex');
    const ok =
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) {
      console.warn('[whatsapp-webhook] bad signature — rejected');
      return res.sendStatus(401);
    }
  }

  // Ack immediately; Meta retries aggressively on anything but a fast 200.
  res.sendStatus(200);

  try {
    const body = JSON.parse(rawBody.toString('utf8') || '{}');
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === 'messages') await handleMessagesChange(change.value ?? {});
        else if (change.field === 'message_template_status_update')
          await handleTemplateStatus(change.value ?? {});
      }
    }
  } catch (err) {
    console.error('[whatsapp-webhook] processing error:', (err as Error).message);
  }
});

interface MetaStatus {
  id: string;
  status: string; // sent | delivered | read | failed
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
}

async function handleMessagesChange(value: {
  statuses?: MetaStatus[];
  messages?: Array<{ from?: string; type?: string; text?: { body?: string } }>;
}) {
  for (const s of value.statuses ?? []) {
    const next = (s.status ?? '').toUpperCase();
    const row = await prisma.whatsappMessageLog.findFirst({ where: { metaMessageId: s.id } });
    if (!row) continue;

    if (next === 'FAILED') {
      const e = s.errors?.[0];
      await prisma.whatsappMessageLog.update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          errorCode: e?.code != null ? String(e.code) : row.errorCode,
          errorDetail: (e?.message || e?.title || 'delivery failed').slice(0, 1000),
        },
      });
      continue;
    }
    // Only move forward through QUEUED → SENT → DELIVERED → READ.
    if ((RANK[next] ?? -1) > (RANK[row.status] ?? -1)) {
      await prisma.whatsappMessageLog.update({ where: { id: row.id }, data: { status: next } });
    }
  }

  for (const m of value.messages ?? []) {
    // Inbound customer reply. Not acted on yet (opt-out / support routing is a
    // later step) — logged so it isn't silently lost.
    console.log(`[whatsapp-webhook] inbound from ${m.from}: ${m.type === 'text' ? m.text?.body : m.type}`);
  }
}

async function handleTemplateStatus(value: {
  message_template_name?: string;
  message_template_language?: string;
  event?: string; // APPROVED | REJECTED | PAUSED | DISABLED | PENDING_DELETION
  reason?: string;
}) {
  const name = value.message_template_name;
  const event = (value.event ?? '').toUpperCase();
  if (!name || !event) return;
  const updated = await prisma.whatsappTemplate.updateMany({
    where: { metaName: name },
    data: { status: event, lastSyncedAt: new Date() },
  });
  if (updated.count) {
    console.log(`[whatsapp-webhook] template ${name} → ${event}${value.reason ? ` (${value.reason})` : ''}`);
  }
}
