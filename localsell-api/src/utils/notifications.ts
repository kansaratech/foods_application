import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { prisma } from '../prisma/client';
import { env } from '../config/env';
import { waTemplateByKey } from './whatsappTemplates';

/**
 * Real SMS / WhatsApp / email delivery for OTPs, password resets and
 * transactional messages.
 *
 * Phone OTP now goes out over the **Meta WhatsApp Cloud API** (a Meta-approved
 * template) when it's configured — this is what the business launches with.
 * If Cloud API isn't configured or the send fails, it falls back to Twilio SMS,
 * and finally to a console log (unchanged dev behavior). Email is backed by
 * whatever SMTP the admin set in Configuration.
 *
 * The `skipMobileVerification` / `skipEmailVerification` toggles and the
 * `testOtp` bypass still short-circuit verification entirely when nothing is
 * configured, so a fresh install keeps working.
 */

// ---------------------------------------------------------------------------
// Phone number helpers
// ---------------------------------------------------------------------------

/** Meta wants a bare international number: digits only, country code, no "+". */
export function toWhatsAppNumber(raw: string): string {
  const digits = (raw ?? '').replace(/[^\d]/g, '');
  // Bare 10-digit Indian mobile -> prefix 91. Anything already carrying a
  // country code (11-15 digits) is passed through untouched.
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/** E.164 for Twilio / plain SMS / canonical User.phone: digits + leading "+". */
export function toE164(raw: string): string {
  return `+${toWhatsAppNumber(raw)}`;
}

// ---------------------------------------------------------------------------
// Message log
// ---------------------------------------------------------------------------

export type PhoneChannel = 'WHATSAPP_CLOUD' | 'WHATSAPP_TWILIO' | 'SMS' | 'CONSOLE';
export type PhonePurpose =
  | 'OTP_SIGNUP'
  | 'OTP_LOGIN'
  | 'OTP_PHONE_CHANGE'
  | 'PASSWORD_RESET'
  | 'ORDER_UPDATE'
  | 'ADMIN_BROADCAST'
  | 'GENERIC';

interface LogEntry {
  toPhone: string;
  userId?: string | null;
  userType?: string | null;
  channel: PhoneChannel;
  purpose: PhonePurpose;
  templateKey?: string | null;
  metaMessageId?: string | null;
  status: 'SENT' | 'FAILED' | 'FALLBACK';
  errorCode?: string | null;
  errorDetail?: string | null;
}

async function logPhoneMessage(entry: LogEntry): Promise<void> {
  try {
    await prisma.whatsappMessageLog.create({
      data: {
        toPhone: entry.toPhone,
        userId: entry.userId ?? null,
        userType: entry.userType ?? null,
        channel: entry.channel,
        purpose: entry.purpose,
        templateKey: entry.templateKey ?? null,
        metaMessageId: entry.metaMessageId ?? null,
        status: entry.status,
        errorCode: entry.errorCode ?? null,
        errorDetail: entry.errorDetail ? String(entry.errorDetail).slice(0, 1000) : null,
      },
    });
  } catch (err) {
    // Logging must never break a send.
    console.error('[phone-log] failed to write WhatsappMessageLog:', (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Meta WhatsApp Cloud API
// ---------------------------------------------------------------------------

interface CloudSendResult {
  ok: boolean;
  metaMessageId?: string;
  errorCode?: string;
  errorDetail?: string;
}

type TemplateComponent = Record<string, unknown>;

async function postWhatsAppTemplate(
  phoneNumberId: string,
  apiVersion: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string,
  components: TemplateComponent[],
): Promise<CloudSendResult> {
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length ? { components } : {}),
    },
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; code?: number; error_data?: { details?: string } };
    };
    if (res.ok && json.messages?.[0]?.id) {
      return { ok: true, metaMessageId: json.messages[0].id };
    }
    return {
      ok: false,
      errorCode: json.error?.code != null ? String(json.error.code) : String(res.status),
      errorDetail: json.error?.error_data?.details || json.error?.message || `HTTP ${res.status}`,
    };
  } catch (err) {
    return { ok: false, errorCode: 'NETWORK', errorDetail: (err as Error).message };
  }
}

interface WhatsAppTransport {
  phoneNumberId: string;
  apiVersion: string;
  accessToken: string;
}

/** Cloud API send settings, or null when WhatsApp Cloud isn't switched on. */
async function getWhatsAppTransport(): Promise<WhatsAppTransport | null> {
  const c = await prisma.configuration.findFirst();
  if (!c) return null;
  const token = env.whatsappAccessToken || c.whatsappAccessToken || '';
  if (!c.whatsappCloudEnabled || !c.whatsappPhoneNumberId || !token) return null;
  return {
    phoneNumberId: c.whatsappPhoneNumberId,
    apiVersion: c.whatsappApiVersion || 'v22.0',
    accessToken: token,
  };
}

/** Resolve `metaName` / `language` / `isActive` for a template key: the DB row
 *  (admin-editable, status-synced) wins, else the code constant. */
async function resolveTemplate(key: string): Promise<{ metaName: string; language: string; hasOtpButton: boolean } | null> {
  const def = waTemplateByKey(key);
  const row = await prisma.whatsappTemplate.findUnique({ where: { key } }).catch(() => null);
  if (row && row.isActive === false) return null;
  const metaName = row?.metaName || def?.metaName;
  if (!metaName) return null;
  return {
    metaName,
    language: row?.language || def?.language || 'en_US',
    hasOtpButton: (row?.buttonType ? row.buttonType === 'OTP' : def?.hasOtpButton) ?? false,
  };
}

interface TemplateSendResult {
  delivered: boolean;
  channel: PhoneChannel;
  metaMessageId?: string;
  errorCode?: string;
  errorDetail?: string;
}

/**
 * Send any registered WhatsApp template. Fills the template body with
 * `bodyParams` in order; authentication templates also get Meta's copy-code
 * button (with a body-only retry if Meta reports a component mismatch). Writes a
 * WhatsappMessageLog row and returns what happened — callers decide whether to
 * fall back to SMS (OTP does; order updates don't).
 */
export async function sendWhatsAppTemplate(
  key: string,
  phone: string,
  bodyParams: string[],
  opts: { purpose?: PhonePurpose; userId?: string | null; userType?: string | null } = {},
): Promise<TemplateSendResult> {
  const purpose = opts.purpose ?? 'GENERIC';
  const to = toWhatsAppNumber(phone);

  if (!phone || to.length < 10) {
    return { delivered: false, channel: 'CONSOLE', errorDetail: 'no/invalid recipient phone' };
  }

  const transport = await getWhatsAppTransport();
  const tpl = await resolveTemplate(key);
  if (!transport || !tpl) {
    console.log(`[dev] WhatsApp template ${key} to ${to}: [${bodyParams.join(' | ')}]`);
    await logPhoneMessage({
      toPhone: to, userId: opts.userId, userType: opts.userType,
      channel: 'CONSOLE', purpose, templateKey: key, status: 'FALLBACK',
      errorDetail: !transport ? 'whatsapp cloud not configured' : `template ${key} inactive/unknown`,
    });
    return { delivered: false, channel: 'CONSOLE' };
  }

  const bodyComponent: TemplateComponent = {
    type: 'body',
    parameters: bodyParams.map((text) => ({ type: 'text', text: String(text ?? '') })),
  };
  const otpButton: TemplateComponent = {
    type: 'button',
    sub_type: 'url',
    index: '0',
    parameters: [{ type: 'text', text: String(bodyParams[0] ?? '') }],
  };
  const send = (components: TemplateComponent[]) =>
    postWhatsAppTemplate(transport.phoneNumberId, transport.apiVersion, transport.accessToken, to, tpl.metaName, tpl.language, components);

  let result = await send(tpl.hasOtpButton ? [bodyComponent, otpButton] : [bodyComponent]);
  if (!result.ok && tpl.hasOtpButton && /132000|132001|component|parameter/i.test(result.errorDetail ?? '')) {
    result = await send([bodyComponent]);
  }

  if (result.ok) {
    await logPhoneMessage({
      toPhone: to, userId: opts.userId, userType: opts.userType,
      channel: 'WHATSAPP_CLOUD', purpose, templateKey: key,
      metaMessageId: result.metaMessageId, status: 'SENT',
    });
    return { delivered: true, channel: 'WHATSAPP_CLOUD', metaMessageId: result.metaMessageId };
  }

  console.error(`[whatsapp-cloud] ${key} send failed (${result.errorCode}): ${result.errorDetail}`);
  await logPhoneMessage({
    toPhone: to, userId: opts.userId, userType: opts.userType,
    channel: 'WHATSAPP_CLOUD', purpose, templateKey: key, status: 'FAILED',
    errorCode: result.errorCode, errorDetail: result.errorDetail,
  });
  return { delivered: false, channel: 'WHATSAPP_CLOUD', errorCode: result.errorCode, errorDetail: result.errorDetail };
}

/** Fire-and-forget wrapper for non-critical sends (order updates) — never throws,
 *  never blocks the caller's response. */
export function sendWhatsAppTemplateAsync(
  key: string,
  phone: string | null | undefined,
  bodyParams: string[],
  opts: { purpose?: PhonePurpose; userId?: string | null; userType?: string | null } = {},
): void {
  if (!phone) return;
  void sendWhatsAppTemplate(key, phone, bodyParams, opts).catch((err) =>
    console.error(`[whatsapp-cloud] ${key} async send threw:`, (err as Error).message),
  );
}

// ---------------------------------------------------------------------------
// Twilio (SMS + legacy WhatsApp channel)
// ---------------------------------------------------------------------------

export async function sendSms(phone: string, message: string): Promise<boolean> {
  const config = await prisma.configuration.findFirst();
  if (!config?.twilioEnabled || !config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
    console.log(`[dev] SMS to ${phone}: ${message}`);
    return false;
  }
  try {
    const client = twilio(config.twilioAccountSid, config.twilioAuthToken);
    await client.messages.create({ body: message, from: config.twilioPhoneNumber, to: toE164(phone) });
    return true;
  } catch (err) {
    console.error('[sms] Twilio send failed:', (err as Error).message);
    console.log(`[dev-fallback] SMS to ${phone}: ${message}`);
    return false;
  }
}

// Twilio's WhatsApp Business channel — kept as a secondary path. New installs use
// the Meta Cloud API above instead.
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const config = await prisma.configuration.findFirst();
  if (!config?.twilioEnabled || !config.twilioAccountSid || !config.twilioAuthToken || !config.twilioWhatsAppNumber) {
    console.log(`[dev] WhatsApp to ${phone}: ${message}`);
    return false;
  }
  try {
    const client = twilio(config.twilioAccountSid, config.twilioAuthToken);
    await client.messages.create({
      body: message,
      from: `whatsapp:${config.twilioWhatsAppNumber}`,
      to: `whatsapp:${toE164(phone)}`,
    });
    return true;
  } catch (err) {
    console.error('[whatsapp] Twilio send failed:', (err as Error).message);
    console.log(`[dev-fallback] WhatsApp to ${phone}: ${message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Deliver a one-time code to a phone number. Prefers the Meta WhatsApp Cloud
 * `otp_verify` template, falls back to Twilio SMS, then a console log. Always
 * writes a WhatsappMessageLog row describing what happened.
 */
export async function sendPhoneOtp(
  phone: string,
  code: string,
  opts: { purpose?: PhonePurpose; userId?: string | null; userType?: string | null } = {},
): Promise<{ delivered: boolean; channel: PhoneChannel }> {
  const purpose = opts.purpose ?? 'GENERIC';

  const wa = await sendWhatsAppTemplate('otp_verify', phone, [code], { ...opts, purpose });
  if (wa.delivered) return { delivered: true, channel: 'WHATSAPP_CLOUD' };

  // SMS fallback (only worth it once a WhatsApp transport exists but the send
  // failed, or when Cloud isn't configured at all).
  const sms = await sendSms(phone, `${code} is your LocalSell verification code. It expires in 5 minutes.`);
  if (sms) {
    await logPhoneMessage({
      toPhone: toWhatsAppNumber(phone),
      userId: opts.userId,
      userType: opts.userType,
      channel: 'SMS',
      purpose,
      status: wa.channel === 'WHATSAPP_CLOUD' ? 'FALLBACK' : 'SENT',
    });
    return { delivered: true, channel: 'SMS' };
  }

  return { delivered: false, channel: wa.channel };
}

// Generic free-text phone message (non-OTP). Twilio WhatsApp if configured, else
// SMS, else console. Cloud API is template-only so it isn't used here.
export async function sendPhoneMessage(phone: string, message: string): Promise<boolean> {
  const config = await prisma.configuration.findFirst();
  if (config?.twilioEnabled && config.twilioWhatsAppNumber) return sendWhatsApp(phone, message);
  return sendSms(phone, message);
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const config = await prisma.configuration.findFirst();
  if (!config?.enableEmail) {
    console.log(`[dev] Email to ${to} (${subject}): ${text}`);
    return false;
  }
  try {
    const from = config.emailName && config.email ? `${config.emailName} <${config.email}>` : config.email ?? undefined;

    // Generic SMTP (any provider) once a host is configured.
    if (config.smtpHost) {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort ?? 587,
        secure: config.smtpSecure ?? false,
        auth: { user: config.smtpUser || config.email || undefined, pass: config.emailPassword || undefined },
      });
      await transporter.sendMail({ from, to, subject, text });
      return true;
    }

    // Fallback: Gmail via email/emailPassword (an app password), no SMTP host needed.
    if (config.email && config.emailPassword) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: config.email, pass: config.emailPassword },
      });
      await transporter.sendMail({ from, to, subject, text });
      return true;
    }

    console.log(`[dev] Email to ${to} (${subject}): ${text}`);
    return false;
  } catch (err) {
    console.error('[email] send failed:', (err as Error).message);
    console.log(`[dev-fallback] Email to ${to} (${subject}): ${text}`);
    return false;
  }
}
