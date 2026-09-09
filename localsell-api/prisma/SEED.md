# Seeding the LocalSell database

There is **one** seed now — config-driven, defined by
[`prisma/seed-data.json`](./seed-data.json).

```bash
npm run seed
```

It **wipes every data table** (users, stores, menus, add-ons, options, orders,
commission / payout / rider-cash ledgers, reviews, riders, customers, zones,
cuisines, the Configuration row) and rebuilds the whole marketplace from the
JSON. The one thing it keeps: **infra secrets** already on the Configuration row
(Google Maps / Stripe / PayPal / Sentry / Cloudinary / Firebase keys) are
read back before the wipe and merged into the fresh Configuration, so a reseed
never loses your API keys.

### Email (SMTP)

`seed-data.json` → `configuration` carries the **non-secret** SMTP settings
(`enableEmail`, `email`, `smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`). The
password is **never** in the JSON — the seed reads it from **`SMTP_PASSWORD`**
in the env (`localsell-api/.env` locally, `deploy/localsell.env` on the server).
If `SMTP_PASSWORD` is unset, the seed keeps whatever `emailPassword` was already
on the Configuration row. The seed prints `email ready` / `email NOT configured`.
Default: Gmail (`smtp.gmail.com:465` SSL, `localsell.dgh@gmail.com`).

New machine: `cp localsell-api/.env.example localsell-api/.env`, then paste the
Gmail app password (get it from the team lead — it is not in git) into
`SMTP_PASSWORD`. Leave it blank to run without outgoing email.

> ⚠️ **Never run `npm run seed` (or `db:deploy -- --demo`) against a live
> production database.** It is a full reset.

## Editing the data

Open `prisma/seed-data.json` and change what you need, then `npm run seed`:

| Section | What it defines |
|---|---|
| `marketplace` | town name + map centre (`center.lat/lng`) — everything is placed around this |
| `configuration` | currency, commission %, billing cycle, rider cash limit, verification skips, T&C / privacy text |
| `zones` | delivery zones (a `radiusKm` becomes a square boundary around the centre) |
| `admin` | the super-admin login |
| `customers` | customer accounts + their default address |
| `riders` | rider accounts + rider profiles (username login) |
| `images` | named image URLs; a food's `image` is a key here or a full `https://…` URL |
| `addonGroups` | reusable add-on groups; a food's `addons` entry is a key here or an inline group |
| `vendors[]` → `stores[]` → `categories[]` → `foods[]` | the marketplace itself |
| `coupons`, `banners` | optional — seeded if present |
| `demoOrders` | a few DELIVERED + reviewed orders per store so ratings / earnings / commission / reports have data (`enabled: false` for an empty ledger) |

A food has either a flat `price` or a `variations: [{title, price}]` array.
`combo: { worth: N }` marks a build-your-own / value combo (shows a struck-through
"worth ₹N" on the card). An add-on group is `{ title, min?, max, options: [{title, price}] }`
— `min ≥ 1` makes it a required choice.

## Default logins (after an unedited seed)

| Role | Login | Password |
|---|---|---|
| Admin | `admin@localsell.in` | `Admin@123` |
| Vendor (admin panel) | `<store-slug>-owner@localsell.in` | `Vendor@123` |
| Store app (merchant) | `<store-slug>@store.localsell.in` | `Store@123` |
| Customer | `customer@localsell.in` | `Customer@123` |
| Rider | `rider1` / `rider2` | `Rider@123` |

Default stores: `hot-pizza-corner`, `devshree-kitchen`, `deogarh-mahal-rasoi`,
`shrinath-sweets-namkeen` (all in Deogarh, Rajsamand, Rajasthan).

## One-command bring-up (any environment)

```bash
npm run db:deploy            # schema sync + client + config defaults + backfill
npm run db:deploy -- --demo  # ... and then WIPE + reseed from seed-data.json
```

Every `db:deploy` step is idempotent. The `--demo` flag is the only destructive
part — omit it on production.

## Commission / rider-cash backfill (after a schema upgrade, no reseed)

```bash
npm run db:backfill
```

Fills `commissionRate` / `deliveryDistance` on stores that lack them, writes a
`CommissionRecord` for every already-DELIVERED order, a `RiderCashEntry` for
every historical COD delivery, and mints delivery OTPs for in-flight orders.
Safe to re-run. `db:deploy` runs it automatically.

## Point a frontend at this API

```
NEXT_PUBLIC_SERVER_URL="http://localhost:4000/"
NEXT_PUBLIC_WS_SERVER_URL="ws://localhost:4000/"
```

(`localsell-web` and `localsell-admin` `.env.local`; the Expo apps use
`EXPO_PUBLIC_*` in `environment.config.js`.)
