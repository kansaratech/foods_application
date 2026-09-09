# LocalSell — QA Punch List (round 1)

Client / QA review of **localsell-web** (customer site) + **localsell-admin**.
37 reported items (numbering as received — `09` was used twice, `32` was skipped).

**Status: all items fixed except 17 (deferred).** Split across two Claude sessions.
Verify against a QA build — several fixes need a re-deploy and one needs a **DB re-seed**.

| Commit | Items |
|---|---|
| `212e19cc` | 36, 37 |
| `1e0cdeb6` | 30, 31, 33, 34, 35 |
| `f35098d7` | 01, 02, 03, 04, 10, 20, 21, 22, 23, 24 |
| `616e0373` | 05, 06, 08, 16, 25, 26 |
| `d83d7cd8` | 11, 18, 19, 27, 28, 29, 31 |
| `48094c1a` | 09, 09b, 10, 12, 13, 14, 15 |
| `2f6c9c6e` | merge `fix/inr-currency-phone` — ₹/INR + +91 lockdown (22-24) across all apps |

> ⚠️ **Re-seed required for #29** — `npm run seed` in `localsell-api` (this **wipes and
> rebuilds every table**). A new grocery store ("Deogarh Daily Mart") was added to
> `prisma/seed-data.json`; until the DB is re-seeded, `/store` stays empty.

---

## A · Auth & registration  (`f35098d7`)

- [x] **01 / 02 / 04 — email accepted without a real domain / TLD, incl. "Become a Rider".**
  New shared `lib/utils/methods/validation.ts` (`isValidEmail`) — rejects `x@gmail`,
  `x@gmailcom`, `x@a.b`. Wired into signup, login, save-email, forgot-password, reset,
  change-password, and the partner form's Yup schema.
- [x] **03 — registration fails with no reason.** `handleCreateUser` now surfaces the real
  `graphQLErrors[0].message` instead of always "phone number already associated"; the
  email-OTP step no longer reports success + closes when account creation actually failed.
- [x] **20 — strong password everywhere.** One `isStrongPassword` rule (8+, upper/lower/
  digit/special) applied to signup, partner apply, reset and change-password.
- [x] **21 — "Sign in with Google" → not configured.** `IS_GOOGLE_LOGIN_ENABLED` gates every
  Google button; hidden entirely until a valid web client id is present.
- [x] **22 / 23 / 24 — country code editable / dropdown / mismatch.** India-only lockdown:
  phone inputs get `disableDropdown` + `countryCodeEditable={false}`. No country to
  mismatch, `+91` fixed. (Merge `fix/inr-currency-phone` for the rest of the ₹/phone work.)

## B · Address, location & "Start Ordering"  (`616e0373`, `1e0cdeb6`)

- [x] **05 — "Notify me" enabled without a valid phone.** Phone now required + validated as a
  10-digit Indian mobile client-side; `joinWaitlist` resolver validates email/phone too.
- [x] **06 — no way forward after entering an address.** "Start ordering" CTA on
  profile › addresses once an address exists; landing CTAs all route into the order flow.
- [x] **07 — "Change Delivery Location" opened the order page.** Current architecture opens
  the header `LocationPopover` / fires `OPEN_LOCATION_PICKER_EVENT` — no redirect. **QA: re-verify.**
- [x] **08 — current location can't be fetched.** `useLocation` / `useSetUserCurrentLocation`
  now guard for missing geolocation + insecure origin, give real permission-denied /
  timeout messages, and drop the leftover `"ABCCCC"` / empty toasts.
- [x] **16 — address field before order confirmation.** "Change" / "Add delivery address"
  button on the checkout delivery block.
- [x] **25 — "Start Ordering" went to the location page.** All hero / footer CTAs land on
  `/discovery` (or `/search/<area>`); the location step is only a fallback.
- [x] **26 — screen blinks twice on first "Current location".** Removed the duplicate
  on-mount geolocation request (the header owns first-visit locate); button navigates
  only after the fix resolves.
- [x] **27 — "Leave location" needs Area / City / State / Pincode; pincode required.**
  Added the fields to the add-address form; 6-digit PIN required before Save; auto-filled
  from the geocode / place components. *(d9 owns the current-location preview part.)*
- [x] **33 — fetched location should populate the address page.** *(d9, `1e0cdeb6`.)*
- [x] **34 — radio buttons for saved addresses.** *(d9, `1e0cdeb6`.)*
- [x] **35 — "Add New Address" modal auto-close on save.** *(d9, `1e0cdeb6`.)*

## C · Maps & pins  (`d83d7cd8`, `1e0cdeb6`, `212e19cc`)

- [x] **18 — drop a pin when an area is selected (add-address map).** Marker drops as soon
  as a city or searched area resolves to coordinates; map recentres and zooms.
- [x] **19 — same for "Delivery areas near you".** Hover / focus a zone in the list → pin
  at its centroid + highlighted polygon.
- [x] **30 — map missing in mobile view.** *(d9, `1e0cdeb6`.)*
- [x] **37 — admin "Add Zone" drop-a-pin.** *(d9, `212e19cc`.)*

## D · Restaurant / grocery listings  (`d83d7cd8`)

- [x] **11 — pagination on grocery stores.** The old `document.body` scroll listener never
  fired (the home layout scrolls an inner div). Replaced with an `IntersectionObserver`
  sentinel in `MainSection` + a "Load more" fallback button; wired to store + restaurants.
- [x] **28 — footer "Restaurants" link.** Now → `/restaurants` (was `/discovery`).
- [x] **29 — "Grocery stores" blank.** Root cause: **every seeded store was `shopType:
  restaurant`** — no grocery stores existed. Seed script now honours a per-store
  `shopType`; added a grocery store. **Needs a re-seed** (see banner above).
- [x] **31 — "Restaurants" shows no data.** *(d9 added the serviceability gate;* this pass
  adds an **error / retry** state so a failed query never blanks the whole page.) If a
  populated DB still shows nothing, it's location/radius — check the tester is near Deogarh.

## E · Admin — store / vendor  (`48094c1a`)

- [x] **09 — random id after creating a store.** The store list printed the raw cuid
  (`ID: cml3x…`) under the name — removed; shows the shop type instead.
- [x] **09b — "Replace" → "Upload".** Photo-upload button and the vendor-registration
  document card now say "Upload".
- [x] **10 — wrong error for a duplicate phone.** Global `formatError` maps Prisma `P2002`
  → "This phone number is already registered to another account." `saveVendorDraft` also
  validates/normalises the phone up front.
- [x] **12 — store edit not password-protected.** Editing a store now opens a `ReauthGate`
  first — the admin must re-enter their password (verified server-side by
  `verifyMyPassword`) before the wizard is usable.
- [x] **13 — delete blocked with "only in Paid Version".** Removed the `isPaidVersion` gate
  on zone delete; it now runs and surfaces the real error on failure. Vendor + store
  deletes already worked (their cards call the real mutations).
- [x] **36 — admin login icon alignment.** *(d9, `212e19cc` + the login redesign already
  on this branch.)*

## F · Admin — rider approval  (`48094c1a`)

- [x] **14 — rider still "pending" after approval.** The API + admin refetch were fine; the
  gap was the **rider app** — it never fetched `approvalStatus`. Now it does: the tab
  layout redirects an unapproved rider to the pending screen, which **polls every 15 s and
  moves them on automatically** the moment an admin approves.
- [x] **15 — riders auto-approved.** API already creates riders `PENDING` (admin + self-
  register). The bug was the admin list column defaulting a missing status to
  **"Approved"** — now defaults to "Pending".

## G · Checkout — payments

- [ ] **17 — online payment methods.** **Deferred** by the user — stays COD-only. Needs a
  product decision (Razorpay vs the existing Stripe scaffold) plus API order-flow,
  webhook and prepaid-commission changes. Track as its own piece of work.

---

## Not in this list
- `32` — skipped in the source numbering.
- `09` appeared twice — tracked as **09** (random id) and **09b** (Replace→Upload).

## Follow-ups / to verify in a QA build
1. **Re-seed the API DB** so the grocery store (#29) exists — `cd localsell-api && npm run seed`.
2. Re-deploy web + admin + API + rider app.
3. Spot-check #07 (change-location opens the picker, not a redirect) and #31 (restaurants
   list populates when the tester's location is inside the Deogarh service radius).
4. ~~`fix/inr-currency-phone` still needs merging~~ — **merged** (`2f6c9c6e`). The
   customer app (`localsell-app`) is included; rebuild/export it too.
5. `npm install` in `localsell-admin` is not required by the merge (no dependency
   change survived — `dev:preview` was already present).
