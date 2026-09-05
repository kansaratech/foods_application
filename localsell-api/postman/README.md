# Enatega Backend · Postman Collections

Postman collections for the MySQL/GraphQL backend, one per client app, so each
surface can be checked independently.

| File | Client | Auth mutation | Login used |
|------|--------|---------------|------------|
| `admin.postman_collection.json` | `enatega-multivendor-admin` | `ownerLogin` | `admin@enatega.local` / `Admin@123` |
| `customer-web.postman_collection.json` | `enatega-multivendor-web` | `login(type:"default")` | `customer@enatega.local` / `Customer@123` |
| `customer-app.postman_collection.json` | `enatega-multivendor-app` | `login` (default / google / apple) | same customer |
| `rider.postman_collection.json` | `enatega-multivendor-rider` | `riderLogin` | username `rider1` / `Rider@123` |
| `store.postman_collection.json` | `enatega-multivendor-store` | `restaurantLogin` | `FalafelTmeer@yopmail.com` / `Yalla0014yalla0014@` |
| `enatega-backend-local.postman_environment.json` | — | shared environment (baseUrl, seed credentials) |

Every request is `POST {{baseUrl}}/graphql` with a JSON GraphQL body. Collection
auth is `Bearer {{token}}`.

## Usage

1. Import the 5 collections + the environment into Postman. Select the
   **Enatega Backend · Local** environment.
2. Start the backend (`npm run dev`, needs MySQL + `npm run seed`).
3. In a collection, run **`01 · Auth …` → the login request first**. Its test
   script stores `token` (and `refreshToken` / `ownerId` / `restaurantId` /
   `riderId`) into collection variables.
4. Run the `… list / paginated` queries next — their test scripts capture the
   first returned id into the matching variable (`restaurantId`, `orderId`,
   `categoryId`, `foodId`, `couponId`, …) so downstream requests resolve.
5. Or use the **Collection Runner** top-to-bottom. Every request has a test
   asserting `HTTP 200` + `no GraphQL errors`.

## Notes / expected non-2xx

- Requests whose variables read `REPLACE_WITH_DISPOSABLE_*` are **destructive
  deletes** left unwired on purpose — set the id by hand against a throwaway
  record.
- Order-lifecycle mutations (`acceptOrder`, `orderPickedUp`, `cancelOrder`,
  `updateOrderStatusRider`, `abortOrder`, `reviewOrder`) require an order in the
  right prior state; run the customer `placeOrder` first and walk the state
  machine in order.
- `createWithdrawRequest` fails unless the rider/store wallet has a balance.
- `store` → `restaurantOrders` only works when the owner has exactly one
  restaurant; otherwise use `ordersByRestId` / `getActiveOrders`.
- `resetPassword` / `verifyOtp` need a real OTP (seed config test OTP is `1234`
  with verification skipped).
- Subscriptions are listed as `[SUB]` reference items only — connect a
  WebSocket client to `{{wsUrl}}/graphql` with
  `connectionParams: { "authorization": "Bearer <token>" }`.

## Regenerating / checking

```bash
node postman/generate.js    # rebuild all collections from the schema
node postman/validate.js    # parse + validate every operation against the schema (no DB)
node postman/run.js [name]  # lightweight live smoke run (needs the server up)
```
