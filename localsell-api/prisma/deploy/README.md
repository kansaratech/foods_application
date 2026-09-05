# prisma/deploy — one command to bring the database up to date

This project has **no Prisma migration history** (see `../SEED.md` for why). All
schema and data bootstrapping goes through one idempotent entry point so a
production deploy can't miss a step.

```bash
# from enatega-multivendor-api-mysql/
npm run db:deploy            # schema + client + config defaults + backfill
npm run db:deploy -- --demo  # ... and load demo data (base + Deogarh seed)
```

In Docker (production):

```bash
docker compose exec padharo_api npm run db:deploy
```

## What it does, in order (`run.ts`)

| # | Step | Idempotent? | Notes |
|---|------|-------------|-------|
| 1 | `prisma db push --skip-generate` | yes | Additive schema sync. Never `migrate dev` here. |
| 2 | `prisma generate` | yes | Typed client. No-op if the image already built it. |
| 3 | `ensureConfigDefaults` (`config-defaults.ts`) | yes, **non-destructive** | Creates the singleton `Configuration` row if missing; otherwise only fills fields still at null/`USD`/`$`/`0`. Never touches API keys or an admin-tuned rate. |
| 4 | `backfill-commission.ts` | yes | Stores at `commissionRate = 0` → default; stores with no `deliveryDistance` → circle radius or 60 km; a `CommissionRecord` for every already-`DELIVERED` order. |
| 5 | *(with `--demo`)* `npm run seed` + `npm run seed:deogarh` | yes | Demo accounts + 8 Deogarh stores + festival campaign. **Skip on real production.** |

## Configuration overrides

Set before running to change the launch defaults applied in step 3:

| Env var | Default |
|---------|---------|
| `CURRENCY` / `CURRENCY_SYMBOL` | `INR` / `₹` |
| `DEFAULT_COMMISSION_RATE` | `20` |
| `COMMISSION_CYCLE` | `MONTHLY` (`YEARLY` allowed) |
| `MARKETPLACE_LAT` / `MARKETPLACE_LNG` | `25.534` / `73.899` (Deogarh) |

## If it fails on `query_engine*.dll` (Windows dev)

The API dev server locks the Prisma engine. Stop it, then re-run.
