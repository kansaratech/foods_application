/**
 * One ordered, idempotent database bring-up / upgrade for ANY environment.
 *
 *   npm run db:deploy            schema sync + client + config defaults + backfill
 *   npm run db:deploy -- --demo  ... and then the demo data (base + Deogarh seed)
 *
 * Every step is safe to re-run. Run it on a fresh production database and on
 * every redeploy after a schema change — see PADHARO_DEPLOYMENT.md.
 *
 * In Docker: `docker compose exec padharo_api npm run db:deploy`
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { ensureConfigDefaults } from './config-defaults';

const withDemo = process.argv.includes('--demo');
const prisma = new PrismaClient();

function sh(cmd: string) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
}

async function step(name: string, fn: () => void | Promise<void>) {
  console.log(`\n=== ${name} ===`);
  await fn();
}

async function main() {
  console.log(`DB deploy — ${withDemo ? 'with demo data' : 'schema + config only'}`);

  // 1. Schema. This repo keeps NO migration history on purpose — `db push` is
  //    the supported path (`migrate dev` would offer to wipe the database).
  await step('Sync schema (prisma db push)', () => sh('npx prisma db push --skip-generate'));

  // 2. Typed client. Best-effort: in production it was generated at image build
  //    time; on a dev box the engine file can be locked by a running server.
  //    Only a hard failure when there is no usable client at all.
  await step('Generate Prisma client', () => {
    try {
      sh('npx prisma generate');
    } catch {
      const hasClient = existsSync('node_modules/.prisma/client/index.js');
      if (!hasClient) throw new Error('prisma generate failed and no client exists — cannot continue');
      console.log('  · generate failed (engine likely locked) — existing client is present, continuing');
    }
  });

  // 3. Operational config row (currency, commission billing, map centre, skip
  //    flags). Non-destructive — never overwrites admin-set values or secrets.
  await step('Ensure Configuration defaults', () => ensureConfigDefaults(prisma));

  // 4. Backfill: stores still at commissionRate 0, stores with no
  //    deliveryDistance, and commission records for already-delivered orders.
  await step('Backfill commission + delivery radius', () =>
    sh('npx ts-node --transpile-only prisma/backfill-commission.ts'),
  );

  if (withDemo) {
    await step('Seed base data', () => sh('npm run seed'));
    await step('Seed Deogarh marketplace + campaign', () => sh('npm run seed:deogarh'));
  }

  console.log('\n✅ DB deploy complete.');
}

main()
  .catch((e) => {
    console.error('\n❌ DB deploy failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
