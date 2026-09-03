# Seeding the Padharo database

Everything here is **idempotent** — safe to run again any time. Run from
`enatega-multivendor-api-mysql/`.

## 0. One-time setup

```bash
cp .env.example .env          # then set DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET
npm install
npx prisma db push            # create/sync all tables (see note below)
npx prisma generate           # regenerate the typed client
```

> **Why `db push` and not `prisma migrate dev`?**
> This project does not keep a migration history — `prisma migrate dev` detects
> "drift" and offers to wipe the database. Always use `npx prisma db push` for
> schema changes. If `db push` or `generate` fails with `EPERM ... query_engine
> .dll.node`, stop the API dev server first (it locks the file), then retry.

## 1. Base accounts + one sample store

```bash
npm run seed
```

| Role     | Email                   | Password     | Used by            |
|----------|-------------------------|--------------|--------------------|
| Admin    | `admin@enatega.local`   | `Admin@123`  | admin panel (`ownerLogin`) |
| Vendor   | `vendor@enatega.local`  | `Vendor@123` | admin panel (`ownerLogin`) |
| Customer | `customer@enatega.local`| `Customer@123`| customer app (`login`) |

## 2. Padharo Deogarh marketplace + demo festival campaign

```bash
npm run seed:deogarh
```

Creates (or refreshes) 8 Deogarh (Rajasthan) stores with menus, reviews, opening
hours and images, a "Deogarh Town" delivery zone, and then the **Festive Week
campaign** (step 3).

Per-store logins:

| Purpose | Email / username | Password |
|---------|------------------|----------|
| Store owner (admin panel) | `dgh-<slug>-owner@padharo.local` | `Vendor@123` |
| Store app (merchant) | `dgh-<slug>@store.padharo` | `Store@123` |
| Demo customer (reviews, test orders) | `deogarh-diner@padharo.local` | `Customer@123` |

`<slug>` examples: `dgh-shrinath-mishthan-bhandar`, `dgh-deogarh-mahal-rasoi`,
`dgh-rathore-bhojanalaya`, `dgh-deogarh-chaat-bhandar`, …

## 3. Festival campaign only (refresh the demo)

```bash
npm run seed:campaign
```

Same block that runs at the tail of `seed:deogarh`. Use this to slide the
14-day window forward again without re-touching the stores. It sets up:

- **Coupon `FESTIVE20`** — global, 20% off, enabled, window = *now − 1 day* …
  *now + 14 days*. The code *is* the coupon title.
- **Three scheduled banners**, one per storefront placement:
  - `HOME` → shows on the web `/discovery` page
  - `STORE` → shows on every restaurant / store page
  - `LANDING` → shows on the web `/` marketing page
  Each carries `couponCode: "FESTIVE20"` and the same 14-day window.
- **`badge: "Festive Special"`** on the dishes *Deogarh Special Thali* and
  *Mawa Kachori (2 pcs)*.

### How the storefront reacts (no code changes needed)

- Banners appear **only while `now` is inside `[startDate, endDate]`** and
  `isActive` is true. Past the end date they vanish on the next page load.
- The banner shows a tap-to-copy **"Use code FESTIVE20"** chip.
- Store cards and menu items show a **"20% OFF"** sticker whenever a
  date-bounded campaign coupon is live (evergreen/"lifetime" coupons are
  ignored, so old test coupons don't leak stickers).
- Dishes with a `badge` show a maroon **"Festive Special"** pill.

### Running your own campaign

From the admin panel: **Management → Banners → Add Banner**. Set *Placement*,
*Start/End date*, *Priority*, upload artwork, and put a coupon code in *Coupon
Code* (create the coupon first under **Management → Coupons** with matching
dates). The table's *Status* column shows Live / Scheduled / Expired.

## 4. Platform commission backfill (one-off, after upgrading)

```bash
npx ts-node prisma/backfill-commission.ts
```

Run this **once** after deploying the commission-billing feature. It:

1. sets `commissionRate` = the Configuration default (20%) on every store still
   at 0 — otherwise the platform earns nothing;
2. sets `deliveryDistance` on every store missing one (from the delivery circle
   the vendor drew, else a 60 km fallback) — this is the radius serviceability
   and order placement enforce;
3. writes a `CommissionRecord` for every already-`DELIVERED` order so the first
   generated bill is not empty;
4. writes a `RiderCashEntry` for every historical COD delivery that had a rider,
   so the Rider Cash screen shows the real outstanding balance.

Safe to re-run. See `PADHARO_COMMISSION.md` for the billing workflow.

## Point a frontend at this API

```
NEXT_PUBLIC_SERVER_URL="http://localhost:4000/"
NEXT_PUBLIC_WS_SERVER_URL="ws://localhost:4000/"
```

(`enatega-multivendor-web` and `enatega-multivendor-admin` `.env.local`;
the Expo apps use `EXPO_PUBLIC_*` / `environment.config.js`.)

## Known issues

- `seed:ahmedabad` adds ~45 legacy Ahmedabad stores that stay **active** in the
  DB. They don't show on the Deogarh landing but do count as the "nearest
  serviceable area" for far-away visitors. Deactivate them if that's confusing:
  `UPDATE Restaurant SET isActive = 0 WHERE slug LIKE 'ahm-%';`
