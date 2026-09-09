import { PrismaClient } from '@prisma/client';

/**
 * Ensures the singleton `Configuration` row exists and carries the operational
 * defaults this platform needs to function (currency, commission billing,
 * marketplace map centre, verification skips for a COD/no-SMTP launch).
 *
 * Idempotent and non-destructive:
 *   - creates the row if missing;
 *   - only fills a field that is null / empty / zero — it NEVER overwrites a
 *     value an admin already set (API keys, secrets, a tuned commission rate…).
 *
 * Override any default via env before running `db:deploy`:
 *   CURRENCY, CURRENCY_SYMBOL, DEFAULT_COMMISSION_RATE, COMMISSION_CYCLE,
 *   MARKETPLACE_LAT, MARKETPLACE_LNG, PLATFORM_LEGAL_NAME
 */
export async function ensureConfigDefaults(prisma: PrismaClient): Promise<void> {
  const defaults = {
    currency: process.env.CURRENCY || 'INR',
    currencySymbol: process.env.CURRENCY_SYMBOL || '₹',
    defaultCommissionRate: Number(process.env.DEFAULT_COMMISSION_RATE || 20),
    commissionBillingCycle: (process.env.COMMISSION_CYCLE || 'MONTHLY').toUpperCase(),
    riderCashLimit: Number(process.env.RIDER_CASH_LIMIT || 3000),
    defaultLatitude: process.env.MARKETPLACE_LAT ? Number(process.env.MARKETPLACE_LAT) : 25.534,
    defaultLongitude: process.env.MARKETPLACE_LNG ? Number(process.env.MARKETPLACE_LNG) : 73.899,
    // Billing entity shown on commission invoices + payout statements.
    // GST number / address deliberately not defaulted — an admin fills the
    // real ones in via Finance -> Vendor settlements -> Invoice billing entity.
    platformLegalName: process.env.PLATFORM_LEGAL_NAME || 'Maekotech Solutions LLP',
    // COD-only launch, no SMTP/WhatsApp wired — users are born verified.
    skipEmailVerification: true,
    skipMobileVerification: true,
    skipWhatsAppOTP: true,
    // Transactional email (Gmail SMTP). Non-secret parts default here; the
    // password comes from SMTP_PASSWORD in the env (deploy/localsell.env).
    // Only applied when SMTP_PASSWORD is set — leaves email off otherwise.
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: Number(process.env.SMTP_PORT || 465),
    smtpSecure: (process.env.SMTP_SECURE || 'true') === 'true',
    smtpUser: process.env.SMTP_USER || 'localsell.dgh@gmail.com',
    email: process.env.SMTP_FROM || process.env.SMTP_USER || 'localsell.dgh@gmail.com',
    emailName: process.env.SMTP_FROM_NAME || 'LocalSell',
  };
  const smtpPassword = process.env.SMTP_PASSWORD?.trim();
  const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();

  const existing = await prisma.configuration.findFirst();

  if (!existing) {
    await prisma.configuration.create({
      data: {
        ...defaults,
        ...(smtpPassword ? { enableEmail: true, emailPassword: smtpPassword } : {}),
        ...(whatsappToken ? { whatsappAccessToken: whatsappToken } : {}),
      },
    });
    console.log(
      `  · Configuration row created with launch defaults${smtpPassword ? ' (+ SMTP)' : ''}`,
    );
    return;
  }

  const patch: Record<string, unknown> = {};

  // SMTP — fill the non-secret fields + turn email on, but only once a
  // SMTP_PASSWORD is present and the row doesn't already have a password an
  // admin set. Never overwrites an existing emailPassword.
  if (smtpPassword && !existing.emailPassword) {
    patch.smtpHost = defaults.smtpHost;
    patch.smtpPort = defaults.smtpPort;
    patch.smtpSecure = defaults.smtpSecure;
    patch.smtpUser = defaults.smtpUser;
    patch.email = defaults.email;
    patch.emailName = defaults.emailName;
    patch.emailPassword = smtpPassword;
    patch.enableEmail = true;
  }

  if (!existing.currency || existing.currency === 'USD') patch.currency = defaults.currency;
  if (!existing.currencySymbol || existing.currencySymbol === '$') patch.currencySymbol = defaults.currencySymbol;
  if (!existing.defaultCommissionRate || existing.defaultCommissionRate <= 0)
    patch.defaultCommissionRate = defaults.defaultCommissionRate;
  if (!existing.commissionBillingCycle) patch.commissionBillingCycle = defaults.commissionBillingCycle;
  if (!existing.riderCashLimit || existing.riderCashLimit <= 0) patch.riderCashLimit = defaults.riderCashLimit;
  if (existing.defaultLatitude == null) patch.defaultLatitude = defaults.defaultLatitude;
  if (existing.defaultLongitude == null) patch.defaultLongitude = defaults.defaultLongitude;
  if (!existing.platformLegalName) patch.platformLegalName = defaults.platformLegalName;

  // WhatsApp Cloud API token from env — fill only when the row has none, never
  // overwrite an admin-set token. Doesn't flip whatsappCloudEnabled (that's a
  // deliberate switch once a Meta-approved template is live).
  if (whatsappToken && !existing.whatsappAccessToken) patch.whatsappAccessToken = whatsappToken;

  if (Object.keys(patch).length === 0) {
    console.log('  · Configuration already complete — nothing to fill');
    return;
  }

  await prisma.configuration.update({ where: { id: existing.id }, data: patch });
  console.log(`  · Configuration filled: ${Object.keys(patch).join(', ')}`);
}
