# LocalSell — QA Punch List (round 2)

Client / QA review — items 38–60 (continuation of round 1's 1–37).
Branch: `feat/platform-hardening`.

Decisions taken with the user (2026-09-09):
- **Auth polish (#38/#40/#43/#45/#46/#47)** applies to **all apps** (web, admin, store, rider).
- **#42** — keep admin-created stores auto-approved; only vendor/partner self-signup waits.
- **#59** — store login email not globally unique; `restaurantLogin` matches on
  username **+ password**, so one vendor runs multiple outlets on one email.
- **#49** — keyboard-activate custom clickables + Enter-to-submit in the touched flows.

## Status

| # | Fix | Where | State |
|---|---|---|---|
| 38 | eye icon moved inside the password field (was `right:-35px`) | web `global.css` + `CustomPasswordTextField` | ✅ |
| 39 | vendor step of store wizard shows validation errors + summary; photo optional | admin `vendor-details.tsx`, `schema/vendor.ts` | ✅ |
| 40 | same eye-icon fix (2nd screen) | shared component | ✅ |
| 41 | strict email (`x@gmail` rejected) | admin vendor/store/rider/staff/sign-up schemas + API guard util | ✅ |
| 42 | verified: admin-created stores auto-approve by design; vendor self-signup already `PENDING` | — | ✅ no change |
| 43 | real Forgot Password / OTP reset | admin login (new panel), store app (modal), rider **native** (modal); web already had it | ⚠️ rider **web** (`index.web.tsx`) still shows a help dialog — TODO |
| 44 | ReauthGate (confirm password) before Edit Rider | admin `rider-registration/index.tsx` | ✅ |
| 45 | eye icon inside field on Edit Rider | shared `CustomPasswordTextField` + `form-controls.css` | ✅ |
| 46 | no "suggest strong password" / strength popup on login | web `enter-password` (`autoComplete=current-password`, `feedback=false`) | ✅ |
| 47 | one "login successful" toast, not two | web `enter-password` (drop dup; `onLoginCompleted` owns it) | ✅ |
| 48 | language switch reloads the whole page | web `landing-header` / `app-header` / `app-bar` | ✅ |
| 49 | Enter submits; custom clickables keyboard-activatable | web auth panels (email/password/phone/otp), forgot-password link → `<button>` | ✅ (touched flows) |
| 50 | "List your restaurant" no longer autofills admin creds | web partner form — password fields removed (were unused), `autoComplete=off`, `enableReinitialize` | ✅ |
| 51 | notification "Invalid date" + 404 | `timeAgo` parses ISO strings; partner-app notification → `/management/notifications`; withdraw → `/wallet/withdraw-requests`; null-safe href | ✅ |
| 52 | Save Draft only blocks a truly-empty form | admin `vendor-registration` + API `saveVendorDraft` (blank email → null) | ✅ |
| 53 | "Business type" (+ other wizard fields) clear Required error on change | admin `account-step` / `business-kyc-step` | ✅ |
| 54 | cuisine description said "1500 characters" while capped at 40 → 200 + right message; notification textarea hard-capped | admin `schema/cuisine.ts`, `notifications/form` | ✅ |
| 55 | super-admin sidebar = one-open accordion | admin `side-bar/*` | ✅ |
| 56 | grocery list no longer loops the same store | web `store` screen + `MainSection` de-dupe | ✅ |
| 57 | same fix for the restaurant list | web `restaurants` screen | ✅ |
| 58 | Back button on the wizard's vendor step | admin `vendor-details.tsx` | ✅ |
| 59 | one vendor → multiple outlets on the same login email | Prisma schema + migration + `restaurantLogin` + `createRestaurant` guard | ✅ |
| 60 | re-entering the matching password no longer trips "Incorrect" | admin `CustomPasswordTextField` blur handler kept `name`/`id` and only fires on real change | ✅ |

## Follow-ups
- **#43 rider web** (`localsell-rider/.../login/index.web.tsx`) — its "Forgot password?" still opens the
  contact-support `<dialog>`. The native rider screen has the real reset flow; the web
  variant needs the same wired into its DOM dialog.
- **DB migration** — `localsell-api`: `npx prisma migrate deploy` (or `migrate dev`) for
  `20260909120000_restaurant_username_unique_per_owner` before this ships.
- Re-deploy web + admin + API; rebuild/export store + rider.
- Existing bad `WebNotification.navigateTo` rows (`/general/notification`) stay 404 until
  re-seeded or manually fixed — only new notifications get the corrected link.
