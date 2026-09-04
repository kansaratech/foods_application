# Padharo — Product model, combos & upsell (Batch D)

Started 2026‑09‑04. Swiggy/Zomato‑style menu building.

## Model additions (all on `Food` / `Addon`, no new tables)

- `Food.isCombo` + `Food.comboItems` (Json: `[{ foodId, variationId?, quantity }]`)
  + `Food.compareAtPrice` — a **combo is a Food** with `isCombo = true` and one
  Variation carrying the bundle price. It flows through cart → order → kitchen
  ticket like any item, no special order plumbing.
- `Food.pairedFoodIds` (Json: `[foodId]`) — merchant‑curated "frequently bought
  together", surfaced as a cart upsell.
- `Addon.isRequired` — explicit "customer must choose from this group". Kept in
  sync with `quantityMinimum` on every save (`normalizeAddonRules`): required ⇒
  min ≥ 1; not required ⇒ min 0. The storefront reads `isRequired` to show a
  "Required" badge and block add‑to‑cart until satisfied.

## API

- `restaurantCombos(restaurantId): [Food!]!` — combo Foods for a store.
- `Food` type gains `isCombo`, `compareAtPrice`, `comboItems { foodId,
  variationId, title, quantity, image, isOutOfStock }` (hydrated live from the
  referenced Foods), `pairedFoods { _id, title, image, price, isOutOfStock }`
  (hydrated, cheapest variation price, merchant order preserved).
- `Addon` type gains `isRequired`.
- `FoodInput` gains `isCombo`, `comboItems: [ComboItemInput]`, `compareAtPrice`,
  `pairedFoodIds: [ID]`; `AddonInput` gains `isRequired`. `createFood` /
  `editFood` / `createAddon` / `editAddon` handle them.

## Admin

- New **Product Management → Combos** screen (`/admin/store/product-management/
  combos`) — list + create/edit dialog: name, category, combo price,
  compare‑at price (auto‑suggests the sum of the picked items), description,
  image, and an item picker (food + optional variation + quantity, ≥ 2 items).
  Saves as a combo Food via `createFood`/`editFood`.
- Add‑on "required" is controlled today through the existing `quantityMinimum`
  field (min ≥ 1 = required); the API now derives and stores `isRequired` from
  it and echoes it back.

## C4 / C5 follow‑ups (from Batch C)

- **C4 customer‑facing serviceability** — already wired: web
  (`useServiceability` → `AreaUnavailable`) and the customer app
  (`Main.js` → `AreaUnavailable`) both read `serviceability.serviceable`. The
  Batch C resolver fix (APPROVED‑only + 150 km nearest cap) flows straight
  through — no client change needed.
- **C5 vendor‑scoped performance** — `storePerformance` now accepts VENDOR and
  auto‑scopes to `ownerId` (a store‑app login is the owner USER, so this covers
  it). Verified: a vendor sees only their own store(s).

## Verification

`npm run verify` → **66/66** (5 new Batch D checks: combo create/read, paired‑food
hydration, required‑addon normalisation, vendor‑scoped performance). tsc clean
API + admin. One `prisma db push` (additive columns only).

## Phase 2 — storefronts (2026‑09‑04) — DONE

**Web** (`enatega-multivendor-web`):
- `GET_RESTAURANT_BY_ID_SLUG` now pulls `isCombo`, `compareAtPrice`, `comboItems`,
  `pairedFoods`, `addons.isRequired`. `IFood` / `IAddon` interfaces updated.
- Menu card: a **Combo** badge, contents line (`2× A + 1× B`), and the
  compare‑at price struck through next to the combo price.
- Item modal: a "What's in this combo" panel (per‑item, with out‑of‑stock flags)
  + a "You save ₹X" line.
- Required customisation: `isFormValid()` and the required/optional tag now honour
  `isRequired` even when the legacy `quantityMinimum` was left at 0 (Add‑to‑cart
  stays disabled until required groups are satisfied — this already worked via
  `quantityMinimum`; the change just makes `isRequired` authoritative too).
- Cart: a **Frequently bought together** strip built from the `pairedFoods` of
  every item in the cart (excludes items already in the cart / out of stock /
  combos); falls back to the old auto `relatedItems` when the merchant set none.

**Customer app** (`enatega-multivendor-app`):
- `restaurantFragment` pulls the same new fields.
- Restaurant menu row: `COMBO` chip + contents line + compare‑at strike‑through.
- `ItemDetail`: a "What's in this combo" card + "You save ₹X".
- `components/ItemDetail/Section.js` (the existing "frequently bought together"
  block) now prefers the merchant's `pairedFoods` for the current item, falling
  back to auto `relatedItems`.
- Required addons already enforced via `quantityMinimum` (unchanged).

**Vendor performance (C5):** `StorePerformanceScreen` is reused at
`/admin/vendor/performance` (new vendor‑sidebar entry) — the `storePerformance`
resolver auto‑scopes to the vendor's own stores.

## Still not built (low priority)

- Admin "frequently bought together" picker on the regular food form (the field
  exists on `FoodInput.pairedFoodIds`; no UI yet — set via API / a future form
  section).
- An explicit "required" toggle on the add‑on form (cosmetic — the
  `quantityMinimum` field already drives it and the API keeps `isRequired` in
  sync).
- Store Expo app vendor‑performance screen (the admin vendor portal covers it).
- **Variant matrix** (Size × Crust): today = author one Variation per
  combination; a bulk generator is a possible later convenience.
