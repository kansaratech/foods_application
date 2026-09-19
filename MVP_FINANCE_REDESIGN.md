# Admin/vendor MVP finance and UI mission

Scope: admin and vendor/store dashboards. Customer and mobile UI redesign is outside this mission.

## MVP money flow

Customer pays the store directly, whether pickup or store delivery. Localsell earns commission on the food subtotal of delivered orders. Commission becomes a vendor bill; Localsell records actual cash, UPI or bank-transfer receipts against it. A partial receipt reduces the balance; only a fully covered bill is Paid. Recording a receipt does not initiate a bank transfer.

Historical fleet accounting and old paid bills remain intact. New orders use pickup or store delivery. Fleet dispatch, rider cash and platform payouts are absent from MVP navigation.

## Dashboard workflow

- Finance overview: outstanding, unbilled and received commission, with clear next actions.
- Collect commission: search vendors/invoices, filter status and bill issue dates, review a bill, record received payments.
- Generate bills: review unbilled delivered orders and confirm generation, grouped by vendor and billing period.
- Receipts: filter by payment dates and inspect payment references.
- Commission settings: billing terms, invoice issuer and store rate overrides. Store rate 0 means use the default; default 0 means no commission.
- Vendor Bills & payments: own balances, invoices, order breakdown and payment receipts. No payment-edit permission.

## Shared presentation

40px fields, common dropdown menus, one date/range calendar, shared action buttons, form shells, table headers and pagination. Range dates use civil dates rather than UTC truncation. Tables scroll inside their container on narrow screens; forms stack. Finance has separate routes rather than rendering unrelated operational tools together.

## Validation

`localsell-api/scripts/verify-collections.cjs` exercises commission classification, Indian billing dates, amount validation, partial/final payments, idempotency, concurrent collection, vendor ownership, date-filtered billing, repeat billing, atomic delivery completion, no platform payable for store delivery, and no rider cash entry. It creates uniquely identified local fixtures and removes them in finally. Run after `npm run build`, from localsell-api. No notifications are sent by these tests.

Browser validation covers admin finance routes, shared dropdown/range interaction, mobile layout, payment dialog and receipts. Temporary browser fixtures must be cleaned before delivery.

## Database upgrade

The only additive table is CommissionPayment. Before upgrading another environment, review Prisma schema diff and apply the additive schema with `prisma db push --skip-generate`, then generate the client and build. No historical commission classification, bills or wallet values are rewritten by this change. Existing paid amounts remain visible even where no old receipt was stored.

Production has not been deployed by this mission. Payment routing credentials and vendor collection instructions are existing business arrangements; the dashboard records confirmed receipts, it does not execute transfers.

## Completed verification (15 September 2026)

- API TypeScript build passed.
- Admin TypeScript check passed; targeted lint checks for finance and shared controls passed.
- 40 isolated finance integration checks passed; fixtures cleaned.
- Browser: Customers dropdown and date-range selection/reset; admin overview, collections, billing, receipts and settings; vendor bills and bill detail; mobile (390px) and desktop; dark-mode settings.
- Browser test recorded INR 25 against a temporary INR 100 bill: remaining INR 75, Part paid, receipt reference visible to the owning vendor. Vendor had no payment mutation controls. Temporary vendor, bill, receipt and related test audit entry were removed.
- Running local endpoints: website :3000, dashboard :3007, API /health :4000, customer Expo :8081, store Expo :8082, rider Expo :8083. Fleet remains outside dashboard MVP navigation.
- Existing locale/Firebase configuration messages remain in development logs; no full production deployment was performed.
