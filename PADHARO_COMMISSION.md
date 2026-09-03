# Padharo — Platform commission

How the platform earns and collects money from vendors, and how delivery areas
are enforced. Built 2026‑09‑03.

## The model

- The platform runs a **COD‑only** marketplace. It never touches order money —
  the customer pays cash to whoever delivers.
- The platform earns a **commission** on every completed order and **invoices
  each vendor per period**. The vendor pays the platform out‑of‑band (bank / UPI
  transfer); an admin marks the invoice paid.
- **Commission = rate % of the food subtotal** of a `DELIVERED`/`COMPLETED`
  order. Food subtotal = `orderAmount − deliveryCharges − tipping − tax`.
  Delivery fee, tip and tax are **not** commissionable.
- **Rate resolution:** the store's own `Restaurant.commissionRate` if set (> 0),
  otherwise `Configuration.defaultCommissionRate` (default **20%**).
- **Billing cycle:** `Configuration.commissionBillingCycle` = `MONTHLY` (default)
  or `YEARLY`. Informational — it labels bills and drives the "current period"
  window shown to vendors.

## Data

| Table | What it is |
|-------|-----------|
| `CommissionRecord` | Immutable per‑order ledger row. Written **once**, the moment an order is first marked `DELIVERED` (`order.resolvers.ts` → `recordOrderCommission`). Snapshots the rate so later rate changes never rewrite history. `billId` is null until it's rolled into a bill. |
| `CommissionBill` | One invoice per vendor per close. `status` = `PENDING` → `PAID` \| `WAIVED`. |
| `RiderCashEntry` | One per COD delivery that had a rider. `owedToPlatform = orderAmount − (deliveryCharges + tipping)` — the cash the rider is holding for the platform. `remittanceId` links it to the settlement it was cleared in. |
| `RiderCashRemittance` | A rider handing collected cash back. Clears `RiderCashEntry` rows oldest‑first, up to `amount` (or all). |

`Configuration` gained `defaultCommissionRate`, `commissionBillingCycle`,
`defaultLatitude`, `defaultLongitude`.

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

Because the rider physically collects the customer's cash, the platform must
track what each rider is holding on its behalf.

- On every COD delivery with a rider, a `RiderCashEntry` is written:
  `owedToPlatform = orderAmount − deliveryFee − tip` (the rider keeps the fee +
  tip; the rest belongs to the store + platform).
- **Rider Cash** screen: per‑rider outstanding table → open a rider for the list
  of unremitted deliveries + remittance history. **Record remittance** (cash /
  bank / UPI, optional amount cap — clears oldest deliveries first) when the
  rider hands the money over.
- The rider's own Expo app has a **My Cash** screen (home drawer): what they
  owe, the unsettled deliveries behind it, lifetime collected / handed‑over, and
  handover history. Read‑only — recording a handover stays with the admin.
- The rider/store wallet crediting on delivery is unchanged — this ledger is the
  *cash* side that was previously untracked.

## Consolidated report (super‑admin → **Management → Finance Report**)

Date‑range report with `platformFinanceReport`: order volume, store/rider
payouts, commission (accrued / billed / paid / outstanding), COD cash
(collected / remitted / outstanding with riders), plus per‑vendor and per‑rider
breakdown tables.

## GraphQL

- `commissionPeriodPreview` (ADMIN), `commissionBills(status,vendorId,page,limit)`
  (ADMIN), `commissionBill(id)` (ADMIN), `myCommissionSummary` (VENDOR)
- `closeCommissionPeriod(periodStart,periodEnd)` (ADMIN),
  `updateCommissionBillStatus(id,status,paidAmount,note)` (ADMIN)
- `saveCommissionConfiguration(configurationInput)` (ADMIN)
- `riderCashOutstanding` (ADMIN), `riderCashSummary(riderId)` (ADMIN | that RIDER),
  `recordRiderCashRemittance(riderId,amount,method,note)` (ADMIN)
- `platformFinanceReport(startDate,endDate)` (ADMIN)
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

## Known follow‑ups

- The rider **My Cash** screen ships in the Expo JS bundle but needs a Metro
  reload / fresh EAS dev build to reach an already-installed rider app.
