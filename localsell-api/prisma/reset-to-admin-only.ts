/**
 * One-off reset: wipes every data table (same tables `npm run seed` wipes —
 * users, stores, menus, orders, ledgers, riders, customers, zones, cuisines,
 * shop types, the Configuration row) and rebuilds ONLY the platform
 * essentials — Configuration, the WhatsApp template registry, and the admin
 * account — with no shop types, zones, vendors, stores, menus, or customers.
 * Everything else is meant to be created by hand through the app from here.
 *
 * Run once:  npx ts-node prisma/reset-to-admin-only.ts
 *
 * Reuses the exact same wipe/config/whatsapp logic as prisma/seed-from-config.ts
 * (kept as its own file rather than refactoring that one, since this is a
 * one-off operational script, not part of the ongoing config-driven seed).
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/services/auth.service';

const prisma = new PrismaClient();

const CONFIG_PATH = join(__dirname, 'seed-data.json');
const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const CENTER = cfg.marketplace.center;

const CONFIG_OPERATIONAL_KEYS = [
  'currency', 'currencySymbol', 'deliveryRate', 'defaultCommissionRate',
  'commissionBillingCycle', 'riderCashLimit', 'platformLegalName', 'platformAddress',
  'platformGstin', 'skipEmailVerification', 'skipMobileVerification', 'skipWhatsAppOTP',
  'testOtp', 'termsAndConditions', 'privacyPolicy', 'defaultLatitude', 'defaultLongitude',
  'costType', 'isPaidVersion', 'enableCustomerDemoMode',
  'enableEmail', 'email', 'emailName', 'smtpHost', 'smtpPort', 'smtpSecure',
  'smtpUser', 'formEmail',
  'whatsappCloudEnabled', 'whatsappPhoneNumberId', 'whatsappWabaId',
  'whatsappApiVersion', 'whatsappOtpTemplate', 'whatsappOtpLang',
];

async function wipeEverything(): Promise<Record<string, unknown> | null> {
  const existingConfig = await prisma.configuration.findFirst();

  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT TABLE_NAME as name
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`;
  const KEEP = ['_prisma_migrations', 'WhatsappTemplate'];
  const tables = rows.map((r) => r.name).filter((n) => !KEEP.includes(n));

  await prisma.$transaction([
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0'),
    ...tables.map((t) => prisma.$executeRawUnsafe(`DELETE FROM \`${t}\``)),
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1'),
  ]);
  console.log(`  · cleared ${tables.length} tables`);

  return existingConfig as unknown as Record<string, unknown> | null;
}

async function seedConfiguration(preserved: Record<string, unknown> | null) {
  const kept: Record<string, unknown> = {};
  if (preserved) {
    for (const [k, v] of Object.entries(preserved)) {
      if (k === 'id' || k === 'customerDemoZoneId') continue;
      if (CONFIG_OPERATIONAL_KEYS.includes(k)) continue;
      kept[k] = v;
    }
  }
  const fromJson: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cfg.configuration)) {
    if (k.startsWith('_')) continue;
    fromJson[k] = v;
  }
  if (fromJson.defaultLatitude == null) fromJson.defaultLatitude = CENTER.lat;
  if (fromJson.defaultLongitude == null) fromJson.defaultLongitude = CENTER.lng;

  const smtpPass = process.env.SMTP_PASSWORD?.trim();
  if (smtpPass) fromJson.emailPassword = smtpPass;
  const waToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (waToken) fromJson.whatsappAccessToken = waToken;

  await prisma.configuration.create({ data: { ...kept, ...fromJson } as Prisma.ConfigurationCreateInput });
  console.log('  · Configuration rebuilt');
}

async function seedWhatsappTemplates() {
  const { WA_TEMPLATES } = await import('../src/utils/whatsappTemplates');
  for (const t of WA_TEMPLATES) {
    await prisma.whatsappTemplate.upsert({
      where: { key: t.key },
      update: { metaName: t.metaName, language: t.language, category: t.category },
      create: {
        key: t.key,
        metaName: t.metaName,
        language: t.language,
        category: t.category,
        status: 'PENDING',
      },
    });
  }
  console.log(`  · ${WA_TEMPLATES.length} WhatsApp templates`);
}

async function main() {
  console.log('LocalSell reset — wipe to admin-only\n');

  console.log('=== Wipe ===');
  const preservedConfig = await wipeEverything();

  console.log('\n=== Platform essentials ===');
  await seedConfiguration(preservedConfig);
  await seedWhatsappTemplates();

  console.log('\n=== Admin account ===');
  await prisma.user.create({
    data: {
      email: cfg.admin.email,
      name: cfg.admin.name,
      password: await hashPassword(cfg.admin.password),
      userType: 'ADMIN',
      emailIsVerified: true,
    },
  });
  console.log(`  · admin: ${cfg.admin.email} / ${cfg.admin.password}`);

  console.log('\nDone. No shop types, zones, vendors, stores, menus, or customers — build them from the admin panel.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
