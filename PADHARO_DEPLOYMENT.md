# Padharo — Production Deployment Runbook

Deploy target: **`padharo.kansaratech.com`** (Sentora server, Docker, shared MySQL).

This document is self-contained. Follow the phases in order. Every command is
copy‑paste ready; replace the `CHANGE_ME` / `<...>` placeholders.

---

## 1. What gets deployed

| Component | Repo folder | Container | Container port | Host port (127.0.0.1) | Public hostname |
|---|---|---|---|---|---|
| Customer web (storefront) | `enatega-multivendor-web` | `padharo_web` | 3000 | **6000** | `padharo.kansaratech.com` |
| Admin panel | `enatega-multivendor-admin` | `padharo_admin` | 3000 | **6001** | `padharo-admin.kansaratech.com` |
| GraphQL API + WS + `/uploads` | `enatega-multivendor-api-mysql` | `padharo_api` | 4000 | **6002** | `padharo-api.kansaratech.com` |

- All three run from one **`docker-compose.yml`** (repo root).
- Host ports bind to `127.0.0.1` only. Apache (Sentora) reverse‑proxies each
  public hostname to its local port and terminates TLS.
- `padharo_api` also joins the **existing** `mysql_config_dev_default` Docker
  network so it can reach the shared MySQL container by name — the same pattern
  used for `ams_container`.
- The 3 mobile apps (customer / rider / store) are **out of scope** for this
  deployment — see §12.

**Architecture:**

```
                      Internet (HTTPS / WSS)
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
  padharo.kansaratech.com  padharo-admin...   padharo-api...
              │               │                   │
        Apache / Sentora reverse proxy (TLS, ws upgrade)
              │               │                   │
      127.0.0.1:6000   127.0.0.1:6001      127.0.0.1:6002
        padharo_web      padharo_admin        padharo_api
                                                  │
                            docker network: mysql_config_dev_default
                                                  │
                                       shared MySQL container
                                        DB `padharo` / user `padharo`
```

---

## 2. Prerequisites checklist

Gather these **before** starting. The build will stop without them.

- [ ] SSH / root access to the Sentora server
- [ ] Docker + Docker Compose v2 installed (`docker compose version`)
- [ ] DNS management access for the `kansaratech.com` zone
- [ ] Shared MySQL container name and its `root` password
      (`docker network inspect mysql_config_dev_default`)
- [ ] Sentora admin login
- [ ] Apache modules available: `proxy`, `proxy_http`, `proxy_wstunnel`, `rewrite`, `headers`
- [ ] Google Cloud Console access for the Maps API key `AIzaSy…RYN-Q`
      (referrer allow‑list must be updated — see §11)
- [ ] Decide the production super‑admin email + password

Secrets to generate on the server (no account needed):

```bash
openssl rand -hex 32     # -> JWT_SECRET
openssl rand -hex 32     # -> REFRESH_TOKEN_SECRET
openssl rand -base64 24  # -> padharo MySQL user password
```

---

## 3. DNS

Add three records in the `kansaratech.com` zone, pointing at the server's public IP:

```
padharo         A   <server-public-ip>
padharo-api     A   <server-public-ip>
padharo-admin   A   <server-public-ip>
```

Wait for propagation (`dig +short padharo.kansaratech.com` returns the IP)
before requesting TLS certificates in §10.

---

## 4. Get the code onto the server

```bash
# pick a stable location, e.g. alongside the other Sentora hostdata apps
cd /var/sentora/hostdata/kansaratech/public_html/
git clone <REPO_URL> padharo_kansaratech_com
cd padharo_kansaratech_com
git checkout <BRANCH>          # the branch that contains the Dockerfiles + docker-compose.yml
```

Confirm these files exist (they are committed in the repo):

```
docker-compose.yml
deploy/padharo.env.example
enatega-multivendor-api-mysql/Dockerfile
enatega-multivendor-web/Dockerfile
enatega-multivendor-admin/Dockerfile
```

---

## 5. Database — create `padharo` on the shared MySQL

```bash
# 1. find the MySQL container name on the shared network
docker network inspect mysql_config_dev_default \
  --format '{{range .Containers}}{{.Name}} {{end}}'

# 2. open a MySQL shell (replace <mysql_container>)
docker exec -it <mysql_container> mysql -uroot -p
```

```sql
CREATE DATABASE padharo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'padharo'@'%' IDENTIFIED BY 'CHANGE_ME_DB_PASSWORD';
GRANT ALL PRIVILEGES ON padharo.* TO 'padharo'@'%';
FLUSH PRIVILEGES;
EXIT;
```

The API connects container‑to‑container, so the DB host in `DATABASE_URL` is the
**MySQL container name**, not `localhost`:

```
DATABASE_URL=mysql://padharo:CHANGE_ME_DB_PASSWORD@<mysql_container>:3306/padharo
```

### 5b. Load data

**Recommended: import the verified local database** (already has the Deogarh
stores, INR configuration, the Google Maps key in the `Configuration` row, the
curated discovery images, and the test accounts). This is lower risk than
re‑seeding a blank DB.

```bash
# On the development machine:
mysqldump -uroot -ppass enatega_multivendor > padharo_seed.sql
scp padharo_seed.sql <server>:/tmp/

# On the server:
docker exec -i <mysql_container> mysql -upadharo -p padharo < /tmp/padharo_seed.sql
```

**Alternative: seed from scratch** (only if you do not want the local data).
Run these *after* the API container is up (§7):

```bash
docker compose --env-file deploy/padharo.env exec api npm run seed
docker compose --env-file deploy/padharo.env exec api npm run seed:deogarh
```

> ⚠️ `npm run seed` also inserts demo restaurants/orders and defaults currency
> to USD. `seed:deogarh` flips `Configuration` to INR / ₹. Clean up the demo
> rows afterwards if you go this route.

---

## 6. Fill in the environment file

```bash
cp deploy/padharo.env.example deploy/padharo.env
nano deploy/padharo.env
```

Set every value:

| Key | Value |
|---|---|
| `DATABASE_URL` | `mysql://padharo:<db-pw>@<mysql_container>:3306/padharo` |
| `JWT_SECRET` | output of `openssl rand -hex 32` |
| `REFRESH_TOKEN_SECRET` | a **different** `openssl rand -hex 32` |
| `CORS_ORIGIN` | `https://padharo.kansaratech.com,https://padharo-admin.kansaratech.com` |
| `PUBLIC_UPLOAD_URL` | `https://padharo-api.kansaratech.com/uploads` |
| `NEXT_PUBLIC_SERVER_URL` | `https://padharo-api.kansaratech.com/` (keep trailing slash) |
| `NEXT_PUBLIC_WS_SERVER_URL` | `wss://padharo-api.kansaratech.com/` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `AIzaSyByQslS8CFpwauY6LgcfOqdhWUohLRYN-Q` |

`deploy/padharo.env` is git‑ignored. It serves **two** purposes:
`docker compose --env-file` uses it to (a) fill the frontend build ARGs and
(b) provide the API container's runtime environment.

> The `NEXT_PUBLIC_*` values are **compiled into** the web/admin JavaScript
> bundles at build time. If you change the API URL later you must **rebuild**
> the web + admin images, not just restart them.

---

## 7. Build and start the stack

```bash
cd /var/sentora/hostdata/kansaratech/public_html/padharo_kansaratech_com

docker compose --env-file deploy/padharo.env build
docker compose --env-file deploy/padharo.env up -d
docker compose --env-file deploy/padharo.env ps
```

First build takes a while (three Node images). Watch logs:

```bash
docker compose --env-file deploy/padharo.env logs -f api
docker compose --env-file deploy/padharo.env logs -f web admin
```

### 7b. Reconcile the Prisma schema

The `prisma/migrations/` folder is stale for this database. Use `db push`
(additive, no data loss):

```bash
docker compose --env-file deploy/padharo.env exec api npx prisma db push --skip-generate
```

### 7c. Local smoke test (before touching Apache)

```bash
curl -s http://127.0.0.1:6002/health          # -> {"status":"ok"}
curl -sI http://127.0.0.1:6000/ | head -n1     # -> HTTP/1.1 200 OK  (web)
curl -sI http://127.0.0.1:6001/ | head -n1     # -> HTTP/1.1 200 OK  (admin)
```

If all three respond, the containers are healthy — move to the proxy layer.

---

## 8. Sentora — create the subdomains

In the Sentora panel, under **Domains → Sub Domains** (account `kansaratech`),
create three subdomains of `kansaratech.com`:

| Sub domain | Full hostname |
|---|---|
| `padharo` | `padharo.kansaratech.com` |
| `padharo-api` | `padharo-api.kansaratech.com` |
| `padharo-admin` | `padharo-admin.kansaratech.com` |

This makes Sentora generate an Apache vhost + a docroot for each. The docroot
content is irrelevant (we proxy everything), but the docroot path is used for
Let's Encrypt webroot validation in §10, so note each one, e.g.
`/var/sentora/hostdata/kansaratech/public_html/padharo_kansaratech_com`.

Then let Sentora rebuild its Apache config (panel: **Admin → Services →
restart Apache**, or wait for the `sentora-cron` cycle).

---

## 9. Apache reverse‑proxy config

Sentora's generated vhosts must be extended with proxy directives. **Use the
same custom‑vhost mechanism you already use for `ams_kansaratech_com`** (the
per‑domain "Custom Apache configuration" panel field, or the custom include
file your setup uses). Add one block per hostname.

### 9a. Web — `padharo.kansaratech.com`

```apache
ProxyPreserveHost On
ProxyRequests Off
RequestHeader set X-Forwarded-Proto "https"

ProxyPass        / http://127.0.0.1:6000/
ProxyPassReverse / http://127.0.0.1:6000/
```

### 9b. Admin — `padharo-admin.kansaratech.com`

```apache
ProxyPreserveHost On
ProxyRequests Off
RequestHeader set X-Forwarded-Proto "https"

ProxyPass        / http://127.0.0.1:6001/
ProxyPassReverse / http://127.0.0.1:6001/
```

### 9c. API — `padharo-api.kansaratech.com` (needs WebSocket upgrade)

GraphQL subscriptions (order tracking, live order lists) run over WebSocket at
`/graphql`. The `RewriteRule … [P]` handles the `Upgrade: websocket` handshake;
plain HTTP falls through to `ProxyPass`.

```apache
ProxyPreserveHost On
ProxyRequests Off
RequestHeader set X-Forwarded-Proto "https"

RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule ^/?(.*) ws://127.0.0.1:6002/$1 [P,L]

ProxyPass        / http://127.0.0.1:6002/
ProxyPassReverse / http://127.0.0.1:6002/

# uploaded images can be large
LimitRequestBody 26214400
```

### 9d. Enable modules + reload

```bash
a2enmod proxy proxy_http proxy_wstunnel rewrite headers   # Debian/Ubuntu
apachectl configtest
systemctl reload apache2      # or: httpd
```

> If your Sentora runs CentOS/httpd, the module names are `mod_proxy`,
> `mod_proxy_http`, `mod_proxy_wstunnel`, `mod_rewrite`, `mod_headers` — usually
> already loaded via `/etc/httpd/conf.modules.d/`.

---

## 10. TLS certificates

One certificate per hostname (flat subdomains → no wildcard needed).

**Option A — certbot webroot** (does not disturb Sentora's Apache config):

```bash
certbot certonly --webroot \
  -w /var/sentora/hostdata/kansaratech/public_html/padharo_kansaratech_com \
  -d padharo.kansaratech.com

certbot certonly --webroot -w <api-docroot>   -d padharo-api.kansaratech.com
certbot certonly --webroot -w <admin-docroot> -d padharo-admin.kansaratech.com
```

Then point each Sentora SSL vhost (port 443) at the issued cert
(`/etc/letsencrypt/live/<host>/fullchain.pem` + `privkey.pem`) — add
`SSLCertificateFile` / `SSLCertificateKeyFile` in the same custom‑vhost field,
or use the Sentora Let's Encrypt module if installed.

**Option B — Sentora Let's Encrypt module:** request a cert for each of the
three subdomains from the module UI, then re‑apply the proxy blocks from §9 to
the regenerated `:443` vhosts.

Set up auto‑renew: `certbot renew --dry-run` and confirm the cron/timer exists.

---

## 11. Post‑deploy configuration

1. **Google Maps API key referrer allow‑list** (Google Cloud Console →
   *APIs & Services → Credentials →* the key):
   - Add HTTP referrers: `https://padharo.kansaratech.com/*` and
     `https://padharo-admin.kansaratech.com/*`
   - The API's server‑side `/maps/*` proxy also uses this key. If the key is
     referrer‑restricted it will reject server calls — either add the server's
     public IP under a separate key, or relax to "None" for testing.
   - The key is stored in the DB `Configuration.googleMapsApiKey` (from the
     imported dump) **and** baked into the frontends via `NEXT_PUBLIC_*`.

2. **Change the super‑admin password.** Log in to
   `https://padharo-admin.kansaratech.com` with the imported credentials
   (`admin@enatega.local` / `Admin@123`) and change email + password
   immediately, or update it directly in the DB `User` table (bcrypt hash).

3. **Verify `Configuration`** in Admin → Management → Configuration:
   currency `INR` / `₹`, delivery settings, `skipEmailVerification` /
   `skipMobileVerification` both **on** (no SMTP/OTP wired yet).

---

## 12. Smoke tests (through the public URLs)

```bash
curl -s https://padharo-api.kansaratech.com/health           # {"status":"ok"}
curl -s https://padharo-api.kansaratech.com/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ __typename }"}'                             # {"data":{"__typename":"Query"}}
```

In a browser:

- [ ] `https://padharo.kansaratech.com` loads; Deogarh stores show on the landing
- [ ] Setting a Deogarh delivery location shows restaurants; an out‑of‑area
      location shows the "area unavailable" waitlist screen
- [ ] Customer login works (`deogarh-diner@padharo.in` / `Customer@123` if the
      dump was imported)
- [ ] Place a test order → the tracking page updates **live** (this proves the
      WebSocket proxy in §9c works)
- [ ] Admin login works; upload an image on any store → it renders from
      `https://padharo-api.kansaratech.com/uploads/...`
- [ ] Admin → Management → Waitlist shows entries

---

## 13. Day‑2 operations

### Redeploy after a code change

```bash
cd /var/sentora/hostdata/kansaratech/public_html/padharo_kansaratech_com
git pull
docker compose --env-file deploy/padharo.env up -d --build
# if the Prisma schema changed:
docker compose --env-file deploy/padharo.env exec api npx prisma db push --skip-generate
```

### Changed an API URL / Maps key

The frontends must be rebuilt (values are compile‑time):

```bash
docker compose --env-file deploy/padharo.env build web admin
docker compose --env-file deploy/padharo.env up -d web admin
```

### Logs / status / restart

```bash
docker compose --env-file deploy/padharo.env ps
docker compose --env-file deploy/padharo.env logs -f --tail=200 api
docker compose --env-file deploy/padharo.env restart api
```

### Backups

```bash
# database
docker exec <mysql_container> mysqldump -upadharo -p'<db-pw>' padharo \
  | gzip > /var/backups/padharo-db-$(date +%F).sql.gz

# uploaded images (named volume)
docker run --rm -v padharo_padharo_uploads:/data -v /var/backups:/out \
  busybox tar czf /out/padharo-uploads-$(date +%F).tar.gz -C /data .
```

### Rollback

```bash
git checkout <previous-good-commit>
docker compose --env-file deploy/padharo.env up -d --build
# restore DB only if a migration/dump caused the problem:
gunzip < /var/backups/padharo-db-<date>.sql.gz \
  | docker exec -i <mysql_container> mysql -upadharo -p'<db-pw>' padharo
```

---

## 14. Mobile apps (separate task — not part of this deploy)

The customer / rider / store Expo apps currently point at a temporary
cloudflared tunnel. Once the API is live at `padharo-api.kansaratech.com`:

1. Update the `environment` config in each app
   (`enatega-multivendor-app`, `-rider`, `-store`) to
   `https://padharo-api.kansaratech.com` (+ `wss://…` for subscriptions).
2. Rebuild via EAS (`eas build --profile <demo|development> --platform android`).
   Note: the EAS free‑plan build quota resets monthly.

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `web`/`admin` build fails on `npm run build` | missing `NEXT_PUBLIC_*` build arg | ensure all keys set in `deploy/padharo.env`; rebuild with `--env-file` |
| API container restarts / `Missing required environment variable` | `DATABASE_URL` / `JWT_SECRET` / `REFRESH_TOKEN_SECRET` blank | fill `deploy/padharo.env`, `up -d` again |
| API up but DB errors | wrong MySQL host (used `localhost`) or user lacks grant | host must be the **container name**; re‑check §5 GRANT |
| `P1001: Can't reach database server` | api not on `mysql_config_dev_default` | `docker network inspect mysql_config_dev_default` — confirm `padharo_api` is listed |
| Site loads but no data / CSP errors in console | `NEXT_PUBLIC_SERVER_URL` wrong, or `CORS_ORIGIN` missing the site origin | fix env, rebuild frontends (URL) or restart api (CORS) |
| Order tracking / live lists frozen | WebSocket not proxied | add the `RewriteRule … [P]` block (§9c); `a2enmod proxy_wstunnel` |
| Maps / address search broken | Maps key referrer restriction | add `https://padharo*.kansaratech.com/*` referrers (§11) |
| Uploaded images 404 | `PUBLIC_UPLOAD_URL` wrong, or `LimitRequestBody` too small on upload | set `PUBLIC_UPLOAD_URL=https://padharo-api.kansaratech.com/uploads`; raise `LimitRequestBody` |
| Admin `/uploads` images blocked by Next | host not in `next.config.mjs` `remotePatterns` | admin derives it from `NEXT_PUBLIC_SERVER_URL` automatically; for web add `padharo-api.kansaratech.com` |
| 502 from Apache | container down or wrong port | `docker compose ps`; port in `ProxyPass` must match §1 table |

---

## 16. File reference

Created in the repo for this deployment:

| Path | Purpose |
|---|---|
| `docker-compose.yml` | the 3‑service stack; joins external `mysql_config_dev_default` |
| `deploy/padharo.env.example` | template — copy to `deploy/padharo.env` and fill |
| `enatega-multivendor-api-mysql/Dockerfile` + `.dockerignore` | API image (keeps Prisma CLI for `db push` / seeds) |
| `enatega-multivendor-web/Dockerfile` + `.dockerignore` | customer web image (Next 16) |
| `enatega-multivendor-admin/Dockerfile` + `.dockerignore` | admin image (Next 14) |
| `.gitignore` | now excludes `deploy/padharo.env` |

Key facts for reviewers:

- API listens on `0.0.0.0:4000`, exposes `GET /health`, serves `/graphql`
  (HTTP + `ws`), `/maps/*`, `/client-logs`, and static `/uploads`.
- API required env: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`
  (startup throws if any is missing). Optional: `PORT`, `CORS_ORIGIN`,
  `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `UPLOAD_DIR`, `PUBLIC_UPLOAD_URL`.
- Web & admin are **not** `output: standalone` — the images run `next start`
  with full `node_modules`.
- Node 20.16.0 across all three (`.nvmrc`).
