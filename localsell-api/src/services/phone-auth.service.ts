/**
 * Phone-number OTP: issue / verify, decoupled from User so a code can be sent
 * to a number that has no account yet (signup) as well as one that does (login,
 * password reset). Backed by the `PhoneVerification` table; delivery goes out
 * over WhatsApp (Cloud API) with an SMS/console fallback via `sendPhoneOtp`.
 */
import type { User } from '@prisma/client';
import { prisma } from '../prisma/client';
import { generateOtp } from './auth.service';
import { sendPhoneOtp, toWhatsAppNumber, toE164 } from '../utils/notifications';
import { userInputError } from '../utils/errors';

const OTP_TTL_MS = 5 * 60 * 1000; // matches the "expires in 5 minutes" template footer
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
// How long a freshly verified phone stays usable to complete signup / reset.
const VERIFIED_GRACE_MS = 30 * 60 * 1000;

export type PhoneOtpPurpose = 'SIGNUP' | 'LOGIN' | 'PASSWORD_RESET' | 'PHONE_CHANGE';

/** Canonical stored form for User.phone and PhoneVerification.phone. */
export const canonicalPhone = (raw: string): string => toE164(raw);

/** Find a user by phone tolerating +91 / 91 / bare-10-digit stored variants. */
export async function findUserByPhone(raw: string): Promise<User | null> {
  const digits = toWhatsAppNumber(raw);
  const candidates = [...new Set([canonicalPhone(raw), digits, digits.slice(-10), raw])].filter(Boolean);
  for (const phone of candidates) {
    const u = await prisma.user.findUnique({ where: { phone } });
    if (u) return u;
  }
  return null;
}

/** Create + send a fresh OTP for a phone number. Enforces a resend cooldown. */
export async function issuePhoneOtp(rawPhone: string, purpose: PhoneOtpPurpose): Promise<void> {
  const phone = toWhatsAppNumber(rawPhone);
  if (phone.length < 11) throw userInputError('Enter a valid mobile number.');

  const existing = await prisma.phoneVerification.findUnique({ where: { phone } });
  if (existing && !existing.verifiedAt && Date.now() - existing.updatedAt.getTime() < RESEND_COOLDOWN_MS) {
    throw userInputError('Please wait a few seconds before requesting another code.');
  }

  const code = generateOtp();
  await prisma.phoneVerification.upsert({
    where: { phone },
    update: { code, purpose, expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0, verifiedAt: null },
    create: { phone, code, purpose, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  const user = await findUserByPhone(rawPhone);
  await sendPhoneOtp(rawPhone, code, {
    purpose:
      purpose === 'PASSWORD_RESET' ? 'PASSWORD_RESET' : user ? 'OTP_LOGIN' : 'OTP_SIGNUP',
    userId: user?.id,
    userType: user?.userType,
  });
}

/** Check a code. On success marks the phone verified (for the grace window).
 *  The admin `testOtp` bypass still works. Throws on any failure. */
export async function verifyPhoneOtp(rawPhone: string, code: string): Promise<void> {
  const phone = toWhatsAppNumber(rawPhone);
  const config = await prisma.configuration.findFirst();
  const isTestOtp = Boolean(config?.testOtp && config.testOtp === code);

  if (!isTestOtp) {
    const row = await prisma.phoneVerification.findUnique({ where: { phone } });
    if (!row) throw userInputError('Request a verification code first.');
    if (row.expiresAt < new Date()) throw userInputError('This code has expired. Request a new one.');
    if (row.attempts >= MAX_ATTEMPTS) throw userInputError('Too many attempts. Request a new code.');
    if (row.code !== code) {
      await prisma.phoneVerification.update({ where: { phone }, data: { attempts: { increment: 1 } } });
      throw userInputError('Incorrect code. Please check and try again.');
    }
  }

  await prisma.phoneVerification.upsert({
    where: { phone },
    update: { verifiedAt: new Date(), attempts: 0 },
    create: {
      phone,
      code,
      purpose: 'SIGNUP',
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      verifiedAt: new Date(),
    },
  });
}

/** Guard for createUser / resetPassword: the phone must have been verified in
 *  the last VERIFIED_GRACE_MS. */
export async function assertPhoneRecentlyVerified(rawPhone: string): Promise<void> {
  const phone = toWhatsAppNumber(rawPhone);
  const row = await prisma.phoneVerification.findUnique({ where: { phone } });
  if (!row?.verifiedAt || Date.now() - row.verifiedAt.getTime() > VERIFIED_GRACE_MS) {
    throw userInputError('Please verify your phone number first.');
  }
}

/** Consume the verified marker so a code can't be reused after login/reset. */
export async function consumePhoneVerification(rawPhone: string): Promise<void> {
  const phone = toWhatsAppNumber(rawPhone);
  await prisma.phoneVerification.deleteMany({ where: { phone } });
}
