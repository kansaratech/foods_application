# Padharo — Admin operations spine (Batch A)

Batch A hardens the admin console so money and access are auditable and the
day-to-day operator has a single place to look. Nothing here is customer-facing.

## 1. Audit log

Every money or access mutation now writes an `AuditLog` row.

- **Schema:** `AuditLog` model — `actorId`, `actorEmail`, `actorType`, `action`
  (dotted slug, e.g. `commission.rate.update`), `targetType`, `targetId`,
  `summary` (human sentence), `changes` (JSON), `createdAt`. Indexed on actor,
  target, and time.
- **Helper:** `src/utils/audit.ts` → `recordAudit(context, { action, targetType,
  targetId, summary, changes })`. Reads the actor from `context.user`. Never
  throws (failures are logged to console only) and strips any key matching
  `/key|secret|token|password|sid/i` from `changes` before writing.
- **Wired at:** commission rate change, restaurant create/delete, config save,
  commission period close (manual + auto), commission bill status change, rider
  cash remittance, withdraw-request status change, staff create/edit/delete,
  password change (ADMIN/STAFF only).
- **It is explicit calls, not middleware** — a new money mutation must add its
  own `recordAudit(...)` line.
- **API:** `auditLogs(page, limit, action, targetType, search): AuditLogsResult!`
  (ADMIN). Result shape: `{ auditLogs[], totalCount, currentPage, totalPages }`.
- **Admin screen:** *Audit Logs* (already in the sidebar; it was calling a
  non-existent field before Batch A). Card shows the summary as the title, the
  action slug as a mono subtitle, actor email, and a JSON diff of `changes`.

## 2. Ops snapshot (home dashboard)

`adminOpsSnapshot: AdminOpsSnapshot!` (ADMIN) — one parallel-query resolver
powering a KPI strip at the top of the super-admin home screen
(`home/ops-snapshot`). Tiles: orders today / this week (+ GMV), active orders,
stores live / total, riders online / total, pending payouts (+ amount), COD cash
held by riders. Secondary line: unbilled commission, waitlist entries still to
notify. Tiles click through to the relevant screen.

## 3. Configuration declutter

The super-admin Configuration screen now leads with the settings that matter for
this launch (Currency, Delivery rate, Google Maps key, Verification toggles, App
config, App versions). Everything else (NodeMailer, Stripe, PayPal, Twilio,
Sentry, Cloudinary, Amplitude, Google client, Firebase admin) is behind a
collapsed **"Advanced integrations (not used for this launch)"** section. The
Google Maps key form existed but was never rendered anywhere — it is now wired
in.

## 4. Permission gate

`routes.ts` and `permissions.ts` were missing entries for several live screens
(Finance, Commission Bills, Rider Cash, Finance Report, Audit Logs, Waitlist,
Shop Type, Zone, Dispatch, Transaction History, Earnings) and had a wrong path
for Withdraw Requests. A route absent from the `ROUTES` constant is visible to
**every** staff user regardless of their permission list, so these gaps meant
finance screens were ungated for staff. All known screens are now listed and
matched to a permission code. (ADMIN userType still bypasses all checks by
design.)

## 5. Admin account & password

- `changePassword(oldPassword, newPassword)` now enforces min-8 characters,
  bumps `tokenVersion` (signs the user out of every other device), and writes an
  audit row for ADMIN/STAFF.
- The admin **Settings** screen (was a "Coming Soon" placeholder) now shows the
  signed-in account (email / name / role) and a change-password form. On success
  it clears the local session and redirects to the login page.
- **Launch task:** sign in with the seeded `admin@enatega.local` / `Admin@123`,
  change the password here immediately, and record the new credential in the
  team vault.

## Verification

- `npx tsc --noEmit` clean in `enatega-multivendor-admin` and
  `enatega-multivendor-api-mysql`.
- `npm run verify` (API up) → 41/41.
- `auditLogs` query resolves against the live API and is ADMIN-gated.
