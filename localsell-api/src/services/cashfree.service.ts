// Thin wrapper around Cashfree's Orders API (Payment Gateway, v2023-08-01) —
// no SDK dependency, just `fetch` (Node 20+ has it globally), matching this
// codebase's convention of talking to external APIs directly (see
// whatsapp-admin.ts) rather than pulling in a client library per provider.
//
// Docs: https://docs.cashfree.com/reference/pg-new-apis-endpoint

import { prisma } from '../prisma/client';
import crypto from 'crypto';

const API_VERSION = '2023-08-01';

function apiBase(env: string | null | undefined): string {
  return env === 'PRODUCTION' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
}

export interface CashfreeCredentials {
  appId: string;
  secretKey: string;
  env: string;
}

/** Reads Cashfree credentials from the Configuration singleton. Returns null if not configured. */
export async function getCashfreeCredentials(): Promise<CashfreeCredentials | null> {
  const config = await prisma.configuration.findFirst();
  if (!config?.cashfreeAppId || !config?.cashfreeSecretKey) return null;
  return { appId: config.cashfreeAppId, secretKey: config.cashfreeSecretKey, env: config.cashfreeEnv ?? 'TEST' };
}

export interface CreateCashfreeOrderInput {
  /** Reused as Cashfree's own order_id so a webhook can look our Order up with no extra mapping table. */
  orderId: string;
  orderAmount: number;
  customerId: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerName?: string | null;
  returnUrl: string;
}

export interface CreateCashfreeOrderResult {
  paymentSessionId: string;
  cfOrderId: string;
}

/** Creates a Cashfree order and returns the payment_session_id the client hands to the Cashfree JS SDK. */
export async function createCashfreeOrder(
  creds: CashfreeCredentials,
  input: CreateCashfreeOrderInput,
): Promise<CreateCashfreeOrderResult> {
  const res = await fetch(`${apiBase(creds.env)}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': creds.appId,
      'x-client-secret': creds.secretKey,
      'x-api-version': API_VERSION,
    },
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: Math.round(input.orderAmount * 100) / 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: input.customerId,
        // Cashfree requires a phone number; fall back to a placeholder rather
        // than fail the whole order for a customer with no phone on file.
        customer_phone: input.customerPhone || '9999999999',
        ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
        ...(input.customerName ? { customer_name: input.customerName } : {}),
      },
      order_meta: {
        return_url: input.returnUrl,
      },
    }),
  });

  const body: Record<string, any> = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    const message = body?.message || `Cashfree order creation failed (${res.status})`;
    throw new Error(message);
  }
  if (!body?.payment_session_id) {
    throw new Error('Cashfree did not return a payment session — check API credentials/environment.');
  }
  return { paymentSessionId: body.payment_session_id, cfOrderId: body.order_id ?? input.orderId };
}

export interface CashfreeOrderStatus {
  paymentSessionId?: string;
  orderStatus: string; // ACTIVE | PAID | EXPIRED | TERMINATED | TERMINATION_REQUESTED
  paymentStatus?: string; // from the latest payment on the order, when available
}

/** Fetches the current status of a Cashfree order directly — used as a reconciliation fallback if a webhook is missed. */
export async function fetchCashfreeOrderStatus(
  creds: CashfreeCredentials,
  cfOrderId: string,
): Promise<CashfreeOrderStatus> {
  const res = await fetch(`${apiBase(creds.env)}/orders/${encodeURIComponent(cfOrderId)}`, {
    headers: {
      'x-client-id': creds.appId,
      'x-client-secret': creds.secretKey,
      'x-api-version': API_VERSION,
    },
  });
  const body: Record<string, any> = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(body?.message || `Cashfree order lookup failed (${res.status})`);
  return { orderStatus: body.order_status, paymentSessionId: body.payment_session_id };
}

export interface CashfreeRefundInput {
  /** Our own idempotency key for this refund attempt — Cashfree rejects reuse across attempts. */
  refundId: string;
  refundAmount: number;
  refundNote?: string;
}

export interface CashfreeRefundResult {
  status: string; // SUCCESS | PENDING | ONHOLD | CANCELLED
  cfRefundId?: string;
  refundAmount: number;
}

/** Initiates a refund on a Cashfree order. Cashfree processes it async — SUCCESS here is the fast path; PENDING/ONHOLD need the refund webhook (or fetchCashfreeRefundStatus) to resolve later. */
export async function refundCashfreeOrder(
  creds: CashfreeCredentials,
  cfOrderId: string,
  input: CashfreeRefundInput,
): Promise<CashfreeRefundResult> {
  const res = await fetch(`${apiBase(creds.env)}/orders/${encodeURIComponent(cfOrderId)}/refunds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': creds.appId,
      'x-client-secret': creds.secretKey,
      'x-api-version': API_VERSION,
    },
    body: JSON.stringify({
      refund_amount: Math.round(input.refundAmount * 100) / 100,
      refund_id: input.refundId,
      ...(input.refundNote ? { refund_note: input.refundNote } : {}),
    }),
  });

  const body: Record<string, any> = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    const message = body?.message || `Cashfree refund failed (${res.status})`;
    throw new Error(message);
  }
  return {
    status: body.refund_status ?? 'PENDING',
    cfRefundId: body.cf_refund_id != null ? String(body.cf_refund_id) : undefined,
    refundAmount: body.refund_amount ?? input.refundAmount,
  };
}

/** Reconciliation fallback — looks up a specific refund's current status directly, for when a webhook is delayed or missed. */
export async function fetchCashfreeRefundStatus(
  creds: CashfreeCredentials,
  cfOrderId: string,
  refundId: string,
): Promise<CashfreeRefundResult> {
  const res = await fetch(
    `${apiBase(creds.env)}/orders/${encodeURIComponent(cfOrderId)}/refunds/${encodeURIComponent(refundId)}`,
    {
      headers: {
        'x-client-id': creds.appId,
        'x-client-secret': creds.secretKey,
        'x-api-version': API_VERSION,
      },
    },
  );
  const body: Record<string, any> = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(body?.message || `Cashfree refund lookup failed (${res.status})`);
  return {
    status: body.refund_status ?? 'PENDING',
    cfRefundId: body.cf_refund_id != null ? String(body.cf_refund_id) : undefined,
    refundAmount: body.refund_amount,
  };
}

/**
 * Verifies a Cashfree webhook's HMAC-SHA256 signature.
 * Per Cashfree's docs: signature = base64(HMAC-SHA256(timestamp + rawBody, secretKey)).
 */
export function verifyCashfreeWebhookSignature(
  rawBody: Buffer,
  timestamp: string,
  signature: string,
  secretKey: string,
): boolean {
  if (!timestamp || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(timestamp + rawBody.toString('utf8'))
    .digest('base64');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
