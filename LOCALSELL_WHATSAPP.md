# LocalSell — WhatsApp Cloud API (Meta)

Phone OTP + transactional order messages over the **Meta WhatsApp Cloud API**.

## Meta account (as wired)

| | |
|---|---|
| App | "JK Mall" · `2066038020504857` |
| Access token | System User, **permanent**. In `localsell-api/.env` → `WHATSAPP_ACCESS_TOKEN` (git-ignored). **Rotate after go-live** — it was shared in chat and covers the whole WABA. |
| Phone Number ID | `551380631388343` (`+91 80786 81521`, display name "JK-Mall") |
| WABA ID | `567424539778633` |
| Sending health | **LIMITED** until the JK-Mall display name is approved by Meta |
| API version | `v22.0` (configurable — `Configuration.whatsappApiVersion`) |

The code reads these from the `Configuration` row (`whatsapp*` columns); non-secret IDs are seeded from
`prisma/seed-data.json`, the token from the env var. `whatsappCloudEnabled` is the master on/off.

---

## Templates to create in WhatsApp Manager

Create each at **business.facebook.com → WhatsApp Manager → Message templates → Create template**.

Rules baked into the copy below (don't change without re-checking):
- **Category** must be exactly as stated. `UTILITY` = triggered by the customer's own order (cheap, no
  opt-in). Don't let Meta auto-switch them to `MARKETING`.
- **Language:** `English (US)` / `en_US` for all (matches the existing `localsell_otp`).
- **Body variables** are positional `{{1}} {{2}} …` — create them in the exact order below and paste the
  sample values (Meta requires a sample for every variable).
- Header / footer / buttons are **optional** — listed as "nice to have". Skip them for the fastest
  approval; we can add buttons later once the tracking URL is final.
- Our code fills the variables from the mapping in the **Fills with** column. If Meta forces you to
  reword a body, keep the number and order of variables the same and tell us the new wording.

### 0. `localsell_otp` — ALREADY LIVE ✅

`AUTHENTICATION` · `en_US` · APPROVED. Used for signup, phone login, and password reset. No action needed.

---

### 1. `localsell_order_placed`  ·  UTILITY  ·  to the customer

> **Body**
> Hi {{1}}, we have received your order {{2}} from {{3}}. Order total: {{4}}. We will notify you as soon as the store confirms it.

| Var | Fills with | Sample |
|---|---|---|
| {{1}} | customer first name | Rahul |
| {{2}} | order number | D2504 |
| {{3}} | store name | Sharma Kirana |
| {{4}} | order total (₹) | ₹450 |

Optional header (Text): `Order received` · Optional footer: `LocalSell`

---

### 2. `localsell_order_confirmed`  ·  UTILITY  ·  to the customer

> **Body**
> Hi {{1}}, your order {{2}} from {{3}} has been confirmed and is being prepared. Estimated time: {{4}} minutes. We will let you know when it is on the way.

| Var | Fills with | Sample |
|---|---|---|
| {{1}} | customer first name | Rahul |
| {{2}} | order number | D2504 |
| {{3}} | store name | Sharma Kirana |
| {{4}} | preparation time in minutes | 30 |

Optional header (Text): `Order confirmed`

---

### 3. `localsell_order_out_for_delivery`  ·  UTILITY  ·  to the customer

> **Body** (as created & live)
> Hi {{1}},
>
> Your order {{2}} from {{3}} is on the way.
>
> Open the LocalSell app for delivery details. Once you receive your order, follow the handover instructions shown in the app to complete the delivery.

| Var | Fills with | Sample |
|---|---|---|
| {{1}} | customer first name | Rahul |
| {{2}} | order number | D2504 |
| {{3}} | store name | Sharma Kirana |

Header (Text): `Out for delivery` · Footer: `LocalSell`

> **Why no code in the message:** Meta auto-classifies any "here is your code" template as
> AUTHENTICATION, and those have a fixed body you can't edit. The 4-digit proof-of-delivery code
> already shows on the customer's order screen (app + web) — this message points them to it.

---

### 4. `localsell_order_delivered`  ·  UTILITY  ·  to the customer

> **Body**
> Hi {{1}}, your order {{2}} from {{3}} has been delivered. Amount: {{4}}. Thank you for ordering with LocalSell.

| Var | Fills with | Sample |
|---|---|---|
| {{1}} | customer first name | Rahul |
| {{2}} | order number | D2504 |
| {{3}} | store name | Sharma Kirana |
| {{4}} | amount (₹) + payment note | ₹450, paid |

Optional header (Text): `Order delivered`

---

### 5. `localsell_order_cancelled`  ·  UTILITY  ·  to the customer

> **Body**
> Hi {{1}}, your order {{2}} from {{3}} has been cancelled. Reason: {{4}}. If a payment was made, it will be refunded to the original payment method.

| Var | Fills with | Sample |
|---|---|---|
| {{1}} | customer first name | Rahul |
| {{2}} | order number | D2504 |
| {{3}} | store name | Sharma Kirana |
| {{4}} | cancellation reason | Store is closed |

Optional header (Text): `Order cancelled`

---

### 6. `localsell_vendor_new_order`  ·  UTILITY  ·  to the store owner

> **Body**
> New order {{1}} on LocalSell. Items: {{2}}. Order total: {{3}}. Payment: {{4}}. Please open the LocalSell Store app to accept or decline this order.

| Var | Fills with | Sample |
|---|---|---|
| {{1}} | order number | D2504 |
| {{2}} | item count | 3 |
| {{3}} | order total (₹) | ₹450 |
| {{4}} | payment method | Cash on delivery |

Optional header (Text): `New order`

---

### 7. `localsell_rider_assigned`  ·  UTILITY  ·  to the delivery rider

> **Body**
> Hi {{1}}, a new delivery has been assigned to you. Order {{2}} — pick up from {{3}}, deliver to {{4}}. Open the LocalSell Rider app for details and navigation.

| Var | Fills with | Sample |
|---|---|---|
| {{1}} | rider first name | Sunil |
| {{2}} | order number | D2504 |
| {{3}} | store name + area | Sharma Kirana, Main Market |
| {{4}} | delivery area / locality | Civil Lines |

Optional header (Text): `New delivery`

---

## Status (2026-09-09)

| Template | Meta status | Test-sent |
|---|---|---|
| `localsell_otp` | APPROVED | ✅ live (OTP already in use) |
| `localsell_order_placed` | APPROVED | ✅ |
| `localsell_order_confirmed` | APPROVED | ✅ |
| `localsell_order_delivered` | APPROVED | ✅ |
| `localsell_order_cancelled` | APPROVED | ✅ |
| `localsell_vendor_new_order` | APPROVED | ✅ |
| `localsell_rider_assigned` | APPROVED | ✅ |
| `localsell_order_out_for_delivery` | **PENDING** Meta review | ⏳ auto-works on approval |

All 8 are registered in the `WhatsappTemplate` table and wired to their order events. Nothing else
to build — `order_out_for_delivery` starts sending the moment Meta approves it.

## Webhook (delivery/read receipts + template status)

`GET|POST /webhooks/whatsapp` is live in the API. Wire it in **Meta App → WhatsApp → Configuration → Webhook**:

- Callback URL: `https://api.localsell.in/webhooks/whatsapp`
- Verify token: the value of `WHATSAPP_VERIFY_TOKEN` (env)
- Subscribe to fields: **messages**, **message_template_status_update**
- Optional: set `WHATSAPP_APP_SECRET` (Meta App → Settings → Basic) to enforce `X-Hub-Signature-256`

Delivery/read receipts then advance `WhatsappMessageLog.status` (SENT → DELIVERED → READ, or FAILED);
template approval/pause events update the `WhatsappTemplate` table automatically.

## Admin screen

**Configuration → WhatsApp (Meta Cloud API)** — enable toggle, phone number ID, WABA ID, API version,
OTP template name/language, access-token field (blank = keep current), a live template-status table
with a **Sync from Meta** button, and a 30-day usage summary.

## Phone-first auth (API ready, app UI pending)

Backend done and tested: `login(type:"phone", phone, otp)` (passwordless) or `+ password`;
`sendOtpToPhoneNumber` → `verifyOtp(phone)`; `forgotPassword`/`resetPassword` accept `phone`.
Codes live in the `PhoneVerification` table (5-min expiry, 30-sec resend cooldown, 5-attempt lock).
**Still to do:** reorder the customer web + mobile-app signup/login screens to ask for phone first.

## To go live

1. Re-run **Sync from Meta** after `order_out_for_delivery` approves.
2. Flip `whatsappCloudEnabled` on (admin screen, or seed-data.json).
3. Wire the webhook in the Meta dashboard (above).
4. Ship the phone-first app screens, then flip `skipMobileVerification` off.
5. Rotate the access token.

## Phase 2 (later)

- Hindi (`hi`) versions of templates 1–7 for Deogarh.
- URL "Track order" button on templates 1–4 once the tracking URL is finalised.
- `localsell_store_approved`, `localsell_rider_approved`, `localsell_payout_processed`.
- Inbound webhook (`/webhooks/whatsapp`) for delivery/read receipts + template-status updates.

## Internal mapping (code ↔ Meta)

| Code key | Meta template | Trigger | Recipient |
|---|---|---|---|
| `otp_verify` | `localsell_otp` | signup / login / password reset | customer |
| `order_placed` | `localsell_order_placed` | `placeOrder` | customer |
| `vendor_new_order` | `localsell_vendor_new_order` | `placeOrder` | store owner |
| `order_confirmed` | `localsell_order_confirmed` | `acceptOrder` | customer |
| `order_out_for_delivery` | `localsell_order_out_for_delivery` | order → `PICKED` | customer (code stays in-app) |
| `order_delivered` | `localsell_order_delivered` | delivery confirmed | customer |
| `order_cancelled` | `localsell_order_cancelled` | `cancelOrder` / reject | customer |
| `rider_assigned` | `localsell_rider_assigned` | order assigned to a rider | rider |
