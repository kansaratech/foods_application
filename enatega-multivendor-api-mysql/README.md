# Enatega Multivendor API (Node.js + Apollo GraphQL + Prisma/MySQL)

A self-hosted replacement backend for the Enatega multivendor frontends (`enatega-multivendor-app`, `-admin`, `-rider`, `-store`, `-web`) in this workspace. The original Enatega backend is closed-source (GraphQL + MongoDB); this project re-implements the GraphQL surface the frontends already call, backed by MySQL via Prisma.

This is a **core MVP**: authentication, restaurant/menu browsing & management, cart/order placement, order tracking, and basic admin. See "Deferred / follow-up work" below for what's intentionally not built yet.

## Setup

1. Install MySQL locally (or point at a remote instance) and create a database:
   ```sql
   CREATE DATABASE enatega_multivendor;
   ```
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET` (use long random strings for the secrets in any non-local environment).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create the schema:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Seed sample data (admin/vendor/customer accounts + a sample restaurant & menu item):
   ```bash
   npm run seed
   ```
6. Start the dev server:
   ```bash
   npm run dev
   ```
   GraphQL endpoint: `http://localhost:4000/graphql` (Apollo Sandbox in-browser). Subscriptions run over the same path via WebSocket.

## Seeded accounts

| Role     | Email                   | Password      |
|----------|--------------------------|---------------|
| Admin    | admin@enatega.local      | Admin@123     |
| Vendor   | vendor@enatega.local     | Vendor@123    |
| Customer | customer@enatega.local   | Customer@123  |

Admin/vendor accounts authenticate via the `ownerLogin` mutation (used by `enatega-multivendor-admin`). Customer accounts use `login`/`createUser` (used by `enatega-multivendor-app`).

## Pointing a frontend at this backend

Set the frontend's server URL env vars to this server, e.g. for `enatega-multivendor-admin`:
```
NEXT_PUBLIC_SERVER_URL="http://localhost:4000/"
NEXT_PUBLIC_WS_SERVER_URL="ws://localhost:4000/"
```

## Authentication

JWT bearer tokens (`Authorization: Bearer <token>`). `login`/`createUser` (customer) and `ownerLogin` (admin/vendor) both return a `token`; `ownerLogin` also returns a longer-lived `refreshToken` used with the `refreshToken` mutation. A single `User` table backs all roles, differentiated by `userType` (`CUSTOMER` / `VENDOR` / `ADMIN` / `RIDER`).

## Deferred / follow-up work

Not built in this pass — flagged here rather than silently skipped:

- **Coupons, zones/geofencing & delivery-bound polygons, reviews/ratings, banners, chat/support tickets** — no schema or resolvers yet.
- **Rider live-location subscriptions** — `Order.rider` exists but there's no location-tracking subscription.
- **Payments** — `paymentMethod`/`paymentStatus` are recorded, but there's no real Stripe/payment-gateway integration; all orders are marked `PENDING` payment regardless of method.
- **Push notifications** — `notificationToken` is stored but nothing sends notifications.
- **Social login** — `login(type: "google"|"apple")` trusts the client-supplied email/appleId without verifying the token cryptographically against Google/Apple. Must be hardened (verify `idToken` server-side) before production use.
- **OTP delivery** — OTP codes are generated and stored, but not actually emailed/texted; they're logged to the server console for local testing. Wire up a real provider (e.g. SMTP, Twilio) before production use.
- **Granular RBAC** — `permissions`/`hasOwnerPermission` are simplified to ADMIN=all, VENDOR=own-restaurant-only, rather than the fine-grained permission list the original admin panel supports.
- **DataLoader / N+1 queries** — nested field resolvers (e.g. `Restaurant.categories`, `Order.items`) each issue their own Prisma query rather than batching; fine for MVP traffic, worth revisiting under load.

## Project structure

```
prisma/schema.prisma   Data model
prisma/seed.ts          Sample data
src/index.ts             Server bootstrap (Express + Apollo Server + graphql-ws)
src/context.ts            JWT auth -> GraphQL context
src/middleware/auth.ts     requireAuth/requireRole resolver guards
src/services/               auth (JWT/bcrypt/OTP), order (totals/snapshotting), upload (local disk)
src/graphql/typeDefs/        GraphQL SDL, split by domain
src/graphql/resolvers/       Resolvers, split by domain
```
