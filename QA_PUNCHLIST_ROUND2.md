# LocalSell — QA Punch List (round 2)

Client / QA review — items 38–60 (continuation of round 1's 1–37).
Branch: `feat/platform-hardening`.

Decisions taken with the user (2026-09-09):
- **Auth polish (#38/#40/#43/#45/#46/#47)** applies to **all apps** (web, admin, store, rider).
- **#42** — keep admin-created stores auto-approved; only vendor/partner self-signup waits.
- **#59** — store login email unique **per-owner**, not globally.
- **#49** — keyboard-activate custom clickables + Enter-to-submit in the touched flows (not an app-wide sweep).

| # | Area | Fix | Status |
|---|---|---|---|
| 38 | Password field — eye icon inside | shared password component | ☐ |
| 39 | Admin store wizard — "Save & Next" dead on vendor step | surface validation errors | ☐ |
| 40 | Password field — eye icon inside (2nd screen) | shared password component | ☐ |
| 41 | Email accepted without TLD (`x@gmail`) | strict validator in admin schemas | ☐ |
| 42 | Store auto-approved | verify vendor self-signup stays PENDING | ☐ |
| 43 | No real "Forgot password" | admin + store + rider reset flow | ☐ |
| 44 | Edit Rider not password-gated | ReauthGate before edit | ☐ |
| 45 | Edit Rider — eye icon inside password field | shared password component | ☐ |
| 46 | Browser "suggest strong password" on login | autocomplete=current-password | ☐ |
| 47 | Two "login successful" toasts (web) | drop duplicate in enter-password | ☐ |
| 48 | Language switch only partially applies | full reload on locale change | ☐ |
| 49 | Buttons not Enter-activatable | keyboard handlers + submit types | ☐ |
| 50 | "List your restaurant" autofills super-admin creds | disable autofill on partner form | ☐ |
| 51 | Notification "Invalid date" + 404 on click | fix date + link target | ☐ |
| 52 | Save Draft runs full validation | only block truly-empty draft | ☐ |
| 53 | "Business type" required error stays after select | clear error on change | ☐ |
| 54 | 1500-char error shown wrongly | fix schema/limit wiring | ☐ |
| 55 | Multiple modules expand at once | one-open accordion | ☐ |
| 56 | Grocery list repeats store infinitely | drop fake pagination | ☐ |
| 57 | Restaurant list — same loop | drop fake pagination | ☐ |
| 58 | No "Back" button on a wizard page | add Back | ☐ |
| 59 | Same email can't open 2nd outlet | per-owner unique username | ☐ |
| 60 | Re-entering correct password still "Incorrect" | fix trim/verify | ☐ |
