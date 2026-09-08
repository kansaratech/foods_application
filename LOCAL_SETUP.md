# LocalSell — Local Setup Guide (for a new teammate)

How to get the LocalSell stack running on your own machine. For **server /
production** deployment, see [LOCALSELL_DEPLOYMENT.md](LOCALSELL_DEPLOYMENT.md)
instead — this doc is dev-machine only.

---

## The apps in this repo

| Folder | What it is | Stack | Local URL |
|---|---|---|---|
| `localsell-api` | GraphQL API + `/uploads` + `/maps` proxy + WebSocket subscriptions | Node + Apollo + Prisma/MySQL | http://localhost:4000 |
| `localsell-web` | Customer ordering website | Next.js 16 | http://localhost:3000 |
| `localsell-admin` | Admin / vendor dashboard | Next.js 14 | http://localhost:3007 |
| `localsell-store` | Merchant (store owner) app | Expo / React Native (SDK 54) | Expo / `w` for web |
| `localsell-rider` | Delivery rider app | Expo / React Native (SDK 53) | Expo / `w` for web |
| `localsell-app` | Customer mobile app | Expo / React Native (SDK 53) | Expo |

**You almost never need all six.** Pick a track:

- **Track A — frontend only.** You want to work on the web, admin, or a mobile
  app and are fine talking to the **live** API at `api.localsell.in`. No
  database, no API on your machine. Fastest.
- **Track B — full stack.** You're changing the API / database schema / seed
  data, or you need to work offline. Run MySQL + the API + whatever frontend.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | **20.16.0** | pinned in every `.nvmrc`. Use `nvm` (`nvm install 20.16.0 && nvm use`) or [Volta](https://volta.sh). Newer Node 20.x is usually fine; Node 22+ is not tested. |
| **npm** | ≥ 10 | ships with Node 20 |
| **Git** | any | |
| **MySQL** | **8.0** | Track B only. Easiest is Docker (below). A native install works too. |
| **Docker** | any recent | optional — only used here to run MySQL |
| **Expo tooling** | — | mobile only. `npx expo` is enough to start; native builds need an [EAS](https://expo.dev) account (see the mobile section). |

Ask the team lead for:

- the shared **dev Google Maps API key** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).
  Optional for local dev — without it the app runs but map/location pickers stay
  blank.
- the **`SMTP_PASSWORD`** (Gmail app password) — only if you need outgoing email
  locally; otherwise leave it blank.

```bash
git clone <REPO_URL> foods_application
cd foods_application
git checkout feat/platform-hardening      # current working branch
```

---

## Track A — frontend against the live API

The mobile apps and the `.env` templates already default to
`https://api.localsell.in`. You only need to set that up for **web / admin**
(their local env points at `localhost:4000`).

### Web

```bash
cd localsell-web
nvm use
npm install
cp .env.dev .env.local
# edit .env.local:
#   NEXT_PUBLIC_SERVER_URL="https://api.localsell.in/"
#   NEXT_PUBLIC_WS_SERVER_URL="wss://api.localsell.in/"
#   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="<dev key from team lead>"
npm run dev            # http://localhost:3000
```

### Admin

```bash
cd localsell-admin
nvm use
npm install
cp .env.dev .env.local
# same three NEXT_PUBLIC_* values as above
npm run dev:preview    # http://localhost:3007  (see the port note below)
```

Log in with the default accounts in the [Default logins](#default-logins) table.

> The live API rejects `http://localhost` origins for some flows, so a few
> things (e.g. certain uploads) only work fully in Track B. For UI work it's
> fine.

---

## Track B — full local stack

### 1. Database — install MySQL 8

The API uses **MySQL 8.0** through Prisma. You need a running server and one
empty database named `localsell`. Pick **one** of the options below.

#### Option A — Docker (recommended, nothing to install but Docker)

```bash
docker run --name localsell-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=localsell \
  -p 3306:3306 \
  -v localsell-mysql-data:/var/lib/mysql \
  -d mysql:8.0
```

- Creates the `localsell` database automatically; root password is `root`.
- `-v localsell-mysql-data:…` keeps the data across restarts.
- Day to day: `docker start localsell-mysql` / `docker stop localsell-mysql`.
- Logs: `docker logs -f localsell-mysql`. Wait for `ready for connections`
  before running the API.
- Shell into it: `docker exec -it localsell-mysql mysql -uroot -proot`
- Start over from scratch: `docker rm -f localsell-mysql && docker volume rm localsell-mysql-data`, then re-run the command above.

Matching `.env` line: `DATABASE_URL="mysql://root:root@localhost:3306/localsell"`

#### Option B — native install on Windows

1. Install with winget (or the [MySQL Installer](https://dev.mysql.com/downloads/installer/)):
   ```powershell
   winget install --id Oracle.MySQL -e
   ```
   In the installer pick **Server only** (or Developer Default), set a **root
   password** you'll remember, and let it run as a **Windows service** (starts
   on boot).
2. Create the database — open *MySQL 8.0 Command Line Client* (or
   `mysql -u root -p`) and run:
   ```sql
   CREATE DATABASE localsell CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Matching `.env` line (use the root password you chose):
   `DATABASE_URL="mysql://root:<YOUR_PASSWORD>@localhost:3306/localsell"`

> If the password has `@ : / ?` or spaces, URL-encode it in `DATABASE_URL`
> (`@` → `%40`), or make a dedicated user (Option D).

#### Option C — native install on macOS / Linux

```bash
# macOS
brew install mysql@8.0 && brew services start mysql@8.0
# Debian/Ubuntu
sudo apt install mysql-server && sudo systemctl enable --now mysql
```

Then:

```sql
CREATE DATABASE localsell CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Option D — dedicated user instead of root (any native install)

```sql
CREATE DATABASE localsell CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'localsell'@'localhost' IDENTIFIED BY 'localsell';
GRANT ALL PRIVILEGES ON localsell.* TO 'localsell'@'localhost';
FLUSH PRIVILEGES;
```

`DATABASE_URL="mysql://localsell:localsell@localhost:3306/localsell"`

#### Verify the connection

```bash
# any option:
mysql -h 127.0.0.1 -P 3306 -u root -p -e "SHOW DATABASES LIKE 'localsell';"
# Docker, without a local mysql client:
docker exec localsell-mysql mysql -uroot -proot -e "SHOW DATABASES LIKE 'localsell';"
```

You should see `localsell` listed. A GUI client (TablePlus, DBeaver, MySQL
Workbench, or the *Database* tab in your IDE) pointed at
`127.0.0.1:3306` is handy for inspecting data later.

#### How the schema gets there

There are **no migration files** — `localsell-api/prisma/migrations/` is stale
on purpose. The schema is applied with `prisma db push`, wrapped inside
`npm run db:deploy` (step 3). So: install MySQL → create the empty `localsell`
database → the API's `db:deploy` builds every table.

> ⚠️ Don't import a `mysqldump` from someone else's Windows machine — Prisma's
> tables are PascalCase and a Windows dump lowercases them, which breaks on
> Linux/CI. Always **seed** (step 3).

### 2. API

```bash
cd localsell-api
nvm use
npm install
```

Create `localsell-api/.env` (it's git-ignored, so you won't get it from the
clone):

```dotenv
DATABASE_URL="mysql://root:root@localhost:3306/localsell"

PORT=4000
JWT_SECRET="<run: openssl rand -hex 32>"
JWT_EXPIRES_IN="30d"
REFRESH_TOKEN_SECRET="<run: openssl rand -hex 32>"
REFRESH_TOKEN_EXPIRES_IN="90d"

# dev only — never "*" on a server
CORS_ORIGIN="*"

UPLOAD_DIR="uploads"
PUBLIC_UPLOAD_URL="http://localhost:4000/uploads"

# optional: Gmail app password for outgoing email
SMTP_PASSWORD=""
```

(`openssl` is available in Git Bash on Windows. Any random string works for a
local dev secret.)

Create the schema and load demo data:

```bash
npm run db:deploy -- --demo
```

This runs, idempotently: `prisma db push` (schema) → `prisma generate` (client)
→ Configuration defaults → commission/delivery backfill → **wipe + reseed the
marketplace** from `prisma/seed-data.json` (4 Deogarh stores, menus, a few demo
orders). Re-run **without** `--demo` after any later schema change; re-run
**with** `--demo` whenever you want a clean marketplace.

> `--demo` is a **full data wipe**. Never point `.env` at a shared/production DB
> and run it.

Start the API:

```bash
npm run dev            # ts-node-dev, restarts on change — http://localhost:4000
```

Check it: `curl http://localhost:4000/health` → `{"status":"ok"}`.

### 3. Web

```bash
cd localsell-web
nvm use
npm install
cp .env.dev .env.local          # already points at http://localhost:4000
# add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local if you have the dev key
npm run dev                     # http://localhost:3000
```

### 4. Admin

```bash
cd localsell-admin
nvm use
npm install
cp .env.dev .env.local
npm run dev:preview             # http://localhost:3007
```

**Port note:** `localsell-web` and `localsell-admin` both default to port
**3000**. Keep web on 3000 and start admin with `npm run dev:preview` (port
**3007**), or `npm run dev -- -p <port>` for either.

### 5. Smoke test

- http://localhost:3000 loads, shows the Deogarh stores
- Admin login works, Management → Configuration shows currency `INR` / `₹`
- Place a test order as the customer, watch it appear in the store app

Optional end-to-end check (writes test orders/bills — demo DB only):

```bash
cd localsell-api && npm run verify
```

---

## Mobile apps (Expo)

Each of `localsell-store`, `localsell-rider`, `localsell-app`:

```bash
cd localsell-store          # or -rider / -app
nvm use
npm install
npx expo start -c           # -c clears the Metro cache
```

**Which API do they hit?**

- Default (no `.env`): `https://api.localsell.in` — the live server. Good enough
  to click around.
- To hit your **local** API, create `.env` in the app folder:

  ```dotenv
  EXPO_PUBLIC_GRAPHQL_URL=http://<YOUR-LAN-IP>:4000/graphql
  EXPO_PUBLIC_WS_GRAPHQL_URL=ws://<YOUR-LAN-IP>:4000/graphql
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID=<dev key>
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS=<dev key>
  ```

  Use your machine's **LAN IP**, not `localhost` — on a phone or emulator
  `localhost` is the device itself. The API's `CORS_ORIGIN="*"` allows it.

**How to run them:**

- **Web preview** (fastest, no device): in the Metro terminal press `w`.
  `store` and `rider` render on web (maps are stubbed out). `localsell-app` is
  less reliable on web.
- **Native on a device:** these apps use custom native modules, so **Expo Go is
  not enough** — you need an **EAS dev build** (`eas build --profile development`)
  installed on the device, then `npx expo start` and open the project from that
  dev build. Ask the team lead for an EAS account seat; builds are gated by the
  free-plan quota.

---

## Default logins

After `npm run db:deploy -- --demo` (or against the live API):

| Role | Login | Password |
|---|---|---|
| Admin (super) | `admin@localsell.in` | `Admin@123` |
| Vendor (in admin panel) | `<store-slug>-owner@localsell.in` | `Vendor@123` |
| Store app | `<store-slug>@store.localsell.in` | `Store@123` |
| Customer | `customer@localsell.in` | `Customer@123` |
| Rider | `rider1` / `rider2` | `Rider@123` |

Store slugs: `hot-pizza-corner`, `devshree-kitchen`, `deogarh-mahal-rasoi`,
`shrinath-sweets-namkeen`. Example store-app login:
`hot-pizza-corner@store.localsell.in`.

Test OTP for email/phone verification: `1234` (verification is skipped by
default anyway).

---

## Common issues

| Symptom | Fix |
|---|---|
| API: `Missing required environment variable: DATABASE_URL` | `localsell-api/.env` missing or not in `localsell-api/` |
| API: `Can't reach database server at localhost:3306` | MySQL container not running (`docker start localsell-mysql`) or wrong password in `DATABASE_URL` |
| API: `The table Configuration does not exist` | you skipped `npm run db:deploy` |
| `prisma db push` wants to DROP a lot of lowercase tables | a Windows `mysqldump` was imported — let it drop, then `npm run db:deploy -- --demo` |
| Web/admin both fail with `Port 3000 is in use` | run admin on another port (`npm run dev:preview`) |
| Web loads but no data / CORS error | `NEXT_PUBLIC_SERVER_URL` in `.env.local` wrong, or API not running |
| Maps / location pickers blank | no `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — get the dev key from the team lead |
| Mobile app can't reach local API | used `localhost` instead of your LAN IP in the app's `.env` |
| `npm install` native-module errors on an Expo app | wrong Node — `nvm use` (must be 20.x) |
| Order tracking / new-order list doesn't update live | WebSocket blocked — check the API is on `:4000` and `NEXT_PUBLIC_WS_SERVER_URL` uses `ws://` (not `wss://`) locally |

---

## Daily workflow, once set up

```bash
# terminal 1
cd localsell-api   && npm run dev
# terminal 2
cd localsell-web   && npm run dev
# terminal 3
cd localsell-admin && npm run dev:preview
```

After pulling changes that touch `localsell-api/prisma/schema.prisma`:

```bash
cd localsell-api && npm run db:deploy        # no --demo → keeps your data
```

After pulling changes to `prisma/seed-data.json` and you want them:

```bash
cd localsell-api && npm run db:deploy -- --demo   # wipes + reseeds
```
