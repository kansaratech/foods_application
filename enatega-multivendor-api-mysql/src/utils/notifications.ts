import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { prisma } from '../prisma/client';

/**
 * Real SMS + email delivery for OTPs and password resets, backed by whatever
 * the admin has configured in Configuration → Twilio / Email. Both functions
 * fall back to a console log (unchanged dev behavior) when the provider
 * isn't configured or fails, so a store that hasn't set up Twilio/Gmail yet
 * keeps working exactly as before via the `skipMobileVerification` /
 * `skipEmailVerification` toggles and the `testOtp` bypass.
 */

export async function sendSms(phone: string, message: string): Promise<boolean> {
  const config = await prisma.configuration.findFirst();
  if (!config?.twilioEnabled || !config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
    console.log(`[dev] SMS to ${phone}: ${message}`);
    return false;
  }
  try {
    const client = twilio(config.twilioAccountSid, config.twilioAuthToken);
    await client.messages.create({ body: message, from: config.twilioPhoneNumber, to: phone });
    return true;
  } catch (err) {
    console.error('[sms] Twilio send failed:', (err as Error).message);
    console.log(`[dev-fallback] SMS to ${phone}: ${message}`);
    return false;
  }
}

// Twilio's WhatsApp Business channel — same account, `whatsapp:`-prefixed
// from/to numbers instead of the plain SMS endpoint.
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
      to: `whatsapp:${phone}`,
    });
    return true;
  } catch (err) {
    console.error('[whatsapp] Twilio send failed:', (err as Error).message);
    console.log(`[dev-fallback] WhatsApp to ${phone}: ${message}`);
    return false;
  }
}

// OTP/notification delivery to a phone number: WhatsApp when a WhatsApp
// sender is configured (this is what the business is launching with), else
// plain SMS, else the console-log dev fallback.
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
