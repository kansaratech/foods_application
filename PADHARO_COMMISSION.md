# Padharo — Platform money model

How the platform earns, how COD cash settles, and how delivery areas are
enforced. Built 2026‑09‑03; money model reworked to the four‑path design in
`Padharo Money Model` (design brief).

## The model

**Every order** `total = food subtotal + delivery fee + tip + tax`. The split
never changes:

- **Store** keeps `food subtotal − commission`, **plus the tax** it remits as GST.
- **Rider** gets `delivery fee + tip` (into their wallet).
- **Platform** keeps the **commission** = `rate% × food subtotal`.
  Rate = the store's own `Restaurant.commissionRate` if > 0, else
  `Configuration.defaultCommissionRate` (default **20%**).

**How the platform actually collects the commission** depends on who first holds
the customer's money:

| Order | First holder | Who owes the platform | Commission collected via |
|-------|-------------|-----------------------|--------------------------|
| **Online** (delivery or pickup) | payment gateway → platform | nobody | platform already holds it |
| **COD · delivery** | the **rider** | rider — the **full order total** | the rider's deposit |
| **COD · pickup** | the **store** | store — the **commission only** | the monthly bill |

So the **commission bill exists only for COD‑pickup orders**. On online and
COD‑delivery orders the commission is `selfCollected` — it's kept through the
money flow and only counts toward "commission earned" in reports.

## Data

| Table | What it is |
|-------|-----------|
| `CommissionRecord` | Immutable per‑order ledger row, written once on first `DELIVERED` (`recordOrderCommission`). `selfCollected` = true (online / COD‑delivery — never invoiced) or false (COD‑pickup — the store owes it, `billId` null until billed). Snapshots the rate + `paymentMethod` + `isPickedUp`. |
| `CommissionBill` | One invoice per vendor per close, over `selfCollected = false` records. `status` = `PENDING` → `PAID` \| `WAIVED`. |
| `RiderCashEntry` | One per COD‑**delivery** order. `owedToPlatform = orderAmount` (the rider deposits **100%**; their fee + tip is paid back into their wallet). `remittanceId` links it to the deposit that cleared it. |
| `RiderCashRemittance` | A rider handing collected cash back. Clears `RiderCashEntry` rows oldest‑first, up to `amount` (or all). |

`Configuration` gained `defaultCommissionRate`, `commissionBillingCycle`,
`riderCashLimit` (default ₹3000), `defaultLatitude`, `defaultLongitude`.

## Admin workflow (super‑admin → **Management → Commission Bills**)

1. **Commission settings** — set the default rate and billing cycle.
2. **Current period (unbilled)** — live totals per vendor for every delivered
   order not yet billed. Button: **Close period & generate bills** → bills
   *everything* right now, including the in‑progress period.
3. **Bills** — filter by status, open a row for the line‑item breakdown (every
   order, its food subtotal, rate and commission). **Mark paid** (records
   `paidAt` + `paidAmount`) or **Waive**.

### Auto‑close (scheduled)

`src/scheduler.ts` runs every 6 hours (and ~15 s after boot) and calls
`autoCloseCompletedPeriods()` — it bills **only records from a period that has
fully ended**, leaving the current month/year open. So bills appear on their own
shortly after each period boundary; the admin button is just a "do it now"
override. Disable with `COMMISSION_AUTOCLOSE=off`. Manual equivalent:
`closeCompletedCommissionPeriods` mutation.

Per‑store rate overrides still live on the old **Management → Commission Rate**
screen.

**Vendor view** — the vendor's own admin login has **Commission** in the sidebar
(`admin/vendor/commission`): current‑period running total, outstanding balance,
and their past bills with status. Backed by `myCommissionSummary`.

## Rider COD cash (super‑admin → **Management → Rider Cash**)

The rider collects the customer's cash and **deposits 100% of it**; their fee +
tip is paid back into their wallet (Swiggy/Zomato model).

- On every COD‑delivery order a `RiderCashEntry` is written with
  `owedToPlatform = orderAmount`.
- **Cash limit** — `Configuration.riderCashLimit` (default ₹3000). Once a rider's
  undeposited COD cash + a new order would exceed it, `assignOrder` /
  `assignRider` refuse the order until they deposit. The rider's **My Cash**
  screen shows the progress bar.
- **Net settlement** — a rider can only withdraw `wallet − undeposited cash`
  (`createWithdrawRequest` enforces it). Their earnings are held against the
  cash they still owe.
- **Rider Cash** screen: per‑rider outstanding table → open a rider for the
  unremitted deliveries, cash limit, wallet balance, available‑to‑withdraw and
  remittance history. **Record remittance** (cash / bank / UPI, optional amount
  cap — clears oldest deliveries first) when the rider hands the money over.
- The rider's own Expo app has a **My Cash** screen (home drawer): what they
  owe, the cash‑limit progress bar, wallet vs available‑to‑withdraw, the
  unsettled deliveries, and handover history. Read‑only.

## Admin — one **Finance** section (super‑admin → **Management → Finance**)

Five tabs, all mounting the existing screen components:

| Tab | What | Backed by |
|-----|------|-----------|
| **Overview** | order volume, payouts, commission, COD cash, per‑vendor + per‑rider | `platformFinanceReport(startDate,endDate)` |
| **Vendor settlements** | commission settings (rate / cycle / rider cash limit), current‑period preview, bills — mark paid / waive | `commissionPeriodPreview`, `commissionBills`, `closeCommissionPeriod` |
| **Commission rates** | per‑store rate overrides | `commissionRate` / `updateCommission` |
| **Rider cash** | per‑rider outstanding, cash limit, wallet vs available, record a deposit | `riderCashOutstanding`, `riderCashSummary`, `recordRiderCashRemittance` |
| **Payouts** | store & rider withdrawal requests | withdraw‑request screen |

The old routes (`/management/commission-bills`, `/rider-cash`, `/finance-report`,
`/commission-rates`) still resolve; they're just gone from the sidebar.

## Order changes — `modifyOrder` (customer, PENDING only)

`modifyOrder(id, isPickedUp, paymentMethod, address, deliveryCharges)`:

- Owner (or admin), and **only while `orderStatus === 'PENDING'`** — after the
  store accepts, it's locked ("This order can no longer be changed…").
- → pickup: delivery fee → 0, rider cleared, total recomputed.
- → delivery: re‑checks the delivery‑area radius; fee = caller's value, else the
  order's, else `restaurant.deliveryFee` / `Configuration.deliveryRate`.
- COD ↔ online: flips `paymentMethod` (no gateway wired — nominal for this launch).
- No accounting to unwind because money only moves on `DELIVERED`.
- Web: a "Change this order" panel on the tracking page while PENDING. App:
  `modifyOrder` mutation string is in `src/apollo/mutations.js`; screen is a
  fast‑follow.

## GraphQL

- `commissionPeriodPreview` (ADMIN), `commissionBills(status,vendorId,page,limit)`
  (ADMIN), `commissionBill(id)` (ADMIN), `myCommissionSummary` (VENDOR)
- `closeCommissionPeriod(periodStart,periodEnd)` (ADMIN),
  `updateCommissionBillStatus(id,status,paidAmount,note)` (ADMIN)
- `saveCommissionConfiguration(configurationInput)` (ADMIN)
- `riderCashOutstanding` (ADMIN), `riderCashSummary(riderId)` (ADMIN | that RIDER
  — returns `cashLimit`, `walletBalance`, `availableToWithdraw`),
  `recordRiderCashRemittance(riderId,amount,method,note)` (ADMIN)
- `platformFinanceReport(startDate,endDate)` (ADMIN) — includes `taxCollected`
  (GST that flows to stores)
- `closeCompletedCommissionPeriods` (ADMIN) — manual equivalent of the scheduler
- `createRestaurant` now accepts `commissionRate`; when omitted the store
  inherits `Configuration.defaultCommissionRate`.

## Delivery area (related change)

The delivery **radius in km** a vendor sets on the store‑location map
(**admin → store → General → Location**) is now the single enforced concept:

- Saving the map writes `Restaurant.deliveryDistance` (was only saving an unused
  `circleBounds` polygon).
- `serviceability`, the storefront "out of range" banner **and `placeOrder`**
  all read `deliveryDistance` (60 km fallback). A delivery order outside the
  radius is rejected server‑side; pickup orders are exempt.
- The map centres on the store pin → else `Configuration.defaultLatitude/Longitude`
  → else Deogarh (was hard‑coded to the middle of Australia).

## Ops

- **One command for the whole DB, prod‑safe & idempotent:**
  `npm run db:deploy` (schema push → client → Configuration defaults → commission
  + delivery‑radius backfill). `npm run db:deploy -- --demo` also loads the demo
  Deogarh stores. Details in `prisma/deploy/README.md`.
- This repo has **no migration history** — never `prisma migrate dev`.
- **Verify it works:** with the API running, `npm run verify`
  (`scripts/verify-launch.mjs`) exercises every commission + delivery‑area
  operation against the live API and the language files, and prints a
  pass/fail table.

## Batch B — finance operations (2026‑09‑04)

Everything below is additive; the money model above is unchanged.

### Store approval gate

`Restaurant.approvalStatus` = `PENDING | APPROVED | REJECTED | SUSPENDED`
(default **APPROVED** — every pre‑existing store and every admin‑created store).
A store a **vendor** self‑onboards starts **PENDING** and is invisible to
customers (all `nearBy*` / `mostOrdered*` / `topRated*` / recent‑order lists now
filter `approvalStatus: 'APPROVED'`) and cannot take orders (`placeOrder`
rejects). `setStoreApproval(id, status, note)` (ADMIN) flips it and audits;
REJECTED/SUSPENDED also set `isActive = false`. Admin: **Stores** list shows an
Approval column + row actions Approve / Suspend / Reject; `restaurantsPaginated`
takes an `approvalStatus` filter.

### Manual wallet adjustments

`WalletAdjustment` (signed `amount`, `reason` ∈ goodwill|chargeback|correction|
penalty|other). `adjustWallet(subjectType, subjectId, amount, reason, note)`
(ADMIN) moves `currentWalletAmount` immediately (credits also bump
`totalWalletAmount`), writes the row + an audit line. Admin: **Finance →
Adjustments** (form + ledger table).

### Weekly payout runs

`PayoutRun` + `PayoutRunItem`. `createPayoutRun(label, periodStart, periodEnd,
minAmount, includeStores, includeRiders)` snapshots every store with
`currentWalletAmount ≥ minAmount` and every rider with
`walletBalance − heldCOD ≥ minAmount` into PENDING line items.
`markPayoutItemPaid(id, method, reference, note)` decrements the wallet, bumps
`withdrawnWalletAmount`, writes a `Transaction`, stamps the line PAID.
`skipPayoutItem`, `completePayoutRun` (blocked while any line is PENDING).
`payoutRunCsv(id)` returns CSV text (one row per payee). Admin: **Finance →
Payout runs** (list → detail dialog with per‑line Pay/Skip, CSV download,
Complete run).

### Rider self‑deposit

`RiderCashRemittance.status` = `PENDING | CONFIRMED | REJECTED` (+ `reference`,
`confirmedAt`). `riderReportDeposit(amount, method, reference, note)` (RIDER or
ADMIN) files a **PENDING** claim — it does **not** touch cash entries and is
capped at what the rider still owes minus already‑pending claims.
`confirmRiderCashDeposit(id, approve, note)` (ADMIN): approve → clears oldest
entries up to the amount, snapshots `amount` to what actually cleared, status
CONFIRMED; reject → status REJECTED. Admin‑entered `recordRiderCashRemittance`
is still immediate (CONFIRMED). `riderCashOutstanding` / `riderCashSummary` now
also surface `pendingDeposit*`. Rider app **My Cash**: "I deposited cash" →
amount/method/reference modal.

### Reconciliation

`reconciliationReport(startDate, endDate)` (ADMIN) — five balance checks
(commission accrued = self‑collected + store‑owed; store‑owed = invoiced +
awaiting; invoices raised = paid + waived + pending; COD collected = remitted +
held; all‑time confirmed remittances = cleared entries) each with
expected/actual/delta/ok, plus store & rider wallet outstanding, negative‑wallet
counts, and pending rider deposits. Admin: **Finance → Reconciliation**.

### Vendor commission invoice

`CommissionBill.invoiceNumber` = `PDR-INV-<YYYYMM>-<seq>` (stamped at close;
backfilled onto old bills). `Configuration.platformLegalName / platformAddress /
platformGstin` are the billing entity (set in **Finance → Vendor settlements →
Invoice billing entity**). `commissionBill(id)` now also returns a pre‑composed
`invoice { … }` and is readable by the bill's own VENDOR. Admin: **Print
invoice** button on the bill‑detail dialog opens a print view.

## Known follow‑ups

- The rider **My Cash** screen ships in the Expo JS bundle but needs a Metro
  reload / fresh EAS dev build to reach an already-installed rider app.
- Payout runs settle wallets but do not yet create per‑payee PDF statements
  (CSV only); a vendor‑facing "my payouts" screen is not built.
