# Padharo — Store, product & location operations (Batch C)

Built 2026‑09‑04. Everything here is additive.

## Store documents (C1)

`StoreDocument` model — one row per `(restaurantId, kind)` where
`kind ∈ {FSSAI, GST, PAN, BANK}`. Each carries `number`, `fileUrl`, `holderName`,
`extra` (BANK: `{ifsc, bankName}`; FSSAI: `{expiryDate}`), and
`status ∈ {PENDING, VERIFIED, REJECTED}` + `reviewNote`. **Not a launch
blocker** — a store trades normally with docs still PENDING; this is a records +
review workflow.

- `upsertStoreDocument(restaurantId, kind, number, fileUrl, holderName, ifsc,
  bankName, expiryDate)` (ADMIN or the store's owner) — any change resets
  `status` to PENDING.
- `reviewStoreDocument(id, status, note)` (ADMIN) — VERIFIED / REJECTED, audited.
- `deleteStoreDocument(id)`.
- `storeDocuments(restaurantId)`, `pendingStoreDocuments(page, limit)` (review
  queue), and `Restaurant.documentSummary { required, submitted, verified,
  rejected, pending }`.
- Admin: **Management → Store Documents** — a *Review queue* tab (verify/reject
  per doc) and a *By store* tab (per‑kind cards, add/edit/verify/delete). The
  **Stores** list shows a `verified/required` compliance chip.
- **Fast‑follow (not built):** a vendor‑facing upload flow in the store Expo app
  — for launch the admin enters documents on the store's behalf.

## Item / variation out of stock (C2)

Already one‑click in the admin **Products → Food** list (`updateFoodOutOfStock`).
Added `updateVariationOutOfStock(id, restaurant)` for per‑size sell‑outs (backend
+ verify; admin UI toggle is a fast‑follow — the item‑level toggle covers the
common case).

## Clone menu (C3)

`cloneMenu(fromRestaurantId, toRestaurantId, replace)` (ADMIN) copies every
category → item → variation and every add‑on/option (re‑linking
variation↔add‑on) into another store. `replace: true` clears the target's menu
first — but a food that appears on a past order can't be deleted, so in that
case the target's existing items are **deactivated** (`isActive: false`) instead
and only order‑free categories/add‑ons are dropped. Audited. Admin: **Stores**
list row action *Clone menu from here* → pick target + replace toggle.

## Serviceability fix (C4)

`serviceability(lat, lng)` now (a) only considers `approvalStatus: 'APPROVED'`
stores and (b) caps `nearestArea` reporting at `MAX_NEAREST_KM = 150` — a
visitor hundreds of km from every store just gets "not available, join the
waitlist" instead of a nonsensical "nearest area: <far city>". This retires the
parked `ahm-*` stale‑seed bug.

## Store performance (C5)

`storePerformance(startDate, endDate, page, limit, search)` (ADMIN) — per store
over a date range: `orders`, `delivered`, `cancelled`, `cancelRate`, `gmv`,
`avgOrderValue`, `commissionEarned`, `avgRating` + `reviewCount`,
`walletBalance`, `approvalStatus`. Admin: **Management → Store Performance**
(date range + search + paginated table; cancel‑rate > 15% flagged red).

## Verification

`npm run verify` → **62/62** (10 new Batch C checks). `tsc` clean on API +
admin. Two `prisma db push` for `StoreDocument` (fully additive).
