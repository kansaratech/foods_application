# LocalSell — Deployment Runbook

Reusable procedure for deploying the LocalSell stack (customer web, admin, GraphQL
API, store merchant web) behind Apache on a Docker host with a **shared MySQL
container**. First run: `localsell.in`, Sep 2026 — every step below is
what actually worked, with the traps folded in.

To deploy to a **new domain or server**, fill in §0. Unlike the hyphenated
scheme an earlier deployment of this stack used
(`prefix-admin.zone.tld`), LocalSell hosts on **dot‑prefixed subdomains** of
its own apex domain, so search‑replace the container/DB name prefix
(`localsell` → your prefix) and the four hostnames directly — they aren't
built from a single "prefix + zone" token pair.

---

## 0. Parameters — fill in per deployment

| Token | This deployment | Notes |
|---|---|---|
| Name prefix | `localsell` | used in container names, DB name, image tags |
| DNS zone (apex) | `localsell.in` | |
| Customer web host | `localsell.in` | the apex — no subdomain |
| Admin host | `admin.localsell.in` | |
| API host | `api.localsell.in` | HTTP **and** WebSocket |
| Store host | `store.localsell.in` | |
| Server public IP | `103.92.235.209` | for DNS + Maps key IP restriction — confirm on the actual box this deploys to |
| Project dir on server | `/var/sentora/hostdata/<host>/public_html/localsell/server` | where `docker-compose.yml` lives — adjust `<host>` to the real Sentora account |
| Shared MySQL container | `mysql_dev_3308` | `mysql:8.0`, internal port **3306** |
| Shared Docker network | `mysql_config_dev_default` | the API joins this to reach MySQL by name |
| DB name / user | `localsell` / `localsell` | |
| Host ports | web `6000`, admin `6001`, api `6002`, store `6004` | 6003 was taken on this host; pick any free `ss -ltn` ports |

---

## 1. What gets deployed

| Service | Repo folder | Container | Cont. port | Host port (127.0.0.1) | Public host |
|---|---|---|---|---|---|
| Customer web (Next 16) | `localsell-web` | `localsell_web` | 3000 | 6000 | `localsell.in` |
| Admin (Next 14) | `localsell-admin` | `localsell_admin` | 3000 | 6001 | `admin.localsell.in` |
| API (Apollo + `ws` + Prisma/MySQL + `/uploads`) | `localsell-api` | `localsell_api` | 4000 | 6002 | `api.localsell.in` |
| Store merchant web (Expo web export → nginx) | `localsell-store` | `localsell_store` | 80 | 6004 | `store.localsell.in` |

- One `docker-compose.yml` at repo root runs all four.
- Host ports bind to `127.0.0.1` only — Apache reverse‑proxies each public host
  to its local port and terminates TLS.
- `localsell_api` joins the **external** `mysql_config_dev_default` network so
  `DATABASE_URL` can use the MySQL **container name** as host.
- Browsers talk to `localsell-api` directly for data + subscriptions; web/admin/store
  are otherwise independent.

```
                          Internet (HTTPS / WSS)
   ┌───────────────┬──────────────────┼──────────────────┬──────────────┐
   ▼               ▼                  ▼                  ▼
localsell.in  admin.localsell.in  store.localsell.in  api.localsell.in  (browser → api.* for data + WS)
   │               │                  │                  │
        Apache vhosts in /etc/httpd/conf.d/  (TLS, ws upgrade on api.*)
   │               │                  │                  │
 :6000           :6001              :6004              :6002
localsell_web  localsell_admin   localsell_store   localsell_api ── mysql_config_dev_default ── mysql_dev_3308
                                                                    DB localsell / user localsell
```

---

## 2. Prerequisites

- SSH/root on the Docker host; `docker compose version` ≥ v2
- DNS control for the zone
- Shared MySQL container name + its **root** password
- Apache with `mod_proxy`, `mod_proxy_http`, `mod_proxy_wstunnel`, `mod_rewrite`,
  `mod_headers`, `mod_ssl`; `certbot` installed
- A Google Maps API key (see §10 — server proxy needs it un‑restricted or IP‑restricted)

Generate per deployment:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # REFRESH_TOKEN_SECRET
openssl rand -hex 24   # MySQL password for the localsell user  (hex = URL-safe)
```

---

## 3. DNS (one‑time)

Four `A` records → server public IP. LocalSell uses **dot‑prefixed**
subdomains (`admin.localsell.in`), not the hyphenated style
(`localsell-admin...`) an earlier deployment of this stack used — so the
apex record covers the customer site and each other service gets its own
subdomain label:

```
@       A   103.92.235.209   (localsell.in itself)
admin   A   103.92.235.209   (admin.localsell.in)
api     A   103.92.235.209   (api.localsell.in)
store   A   103.92.235.209   (store.localsell.in)
```

Confirm before requesting certs: `dig +short localsell.in`.

---

## 4. Database — create `localsell` on the shared MySQL

```bash
docker network inspect mysql_config_dev_default \
  --format '{{range .Containers}}{{.Name}} {{end}}'      # find the MySQL container

DBPW=$(openssl rand -hex 24); echo "$DBPW" > /root/localsell_db_pw.txt; echo "$DBPW"

docker exec -it mysql_dev_3308 mysql -uroot -p -e "
  CREATE DATABASE IF NOT EXISTS localsell CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'localsell'@'%' IDENTIFIED BY '$DBPW';
  ALTER USER 'localsell'@'%' IDENTIFIED BY '$DBPW';
  GRANT ALL PRIVILEGES ON localsell.* TO 'localsell'@'%';
  FLUSH PRIVILEGES;"

docker exec -it mysql_dev_3308 mysql -ulocalsell -p"$DBPW" localsell -e 'SELECT 1;'   # verify
```

`DATABASE_URL` host = the **container name**, port = **3306** (container‑internal,
even though this one publishes 3308 on the host):

```
mysql://localsell:<DBPW>@mysql_dev_3308:3306/localsell
```

> ⚠️ **Do NOT import a `mysqldump` taken from a Windows / case‑insensitive MySQL.**
> Prisma's models are PascalCase (`Configuration`, `User`, …); a Windows dump
> writes lowercase `CREATE TABLE` statements, and on a case‑sensitive Linux MySQL
> Prisma then can't find its tables (`The table Configuration does not exist`).
> **Seed instead** (§8). Importing real data cross‑platform needs the dump's
> identifiers rewritten to PascalCase first — separate task.

---

## 5. Get the code onto the server

Docker rebuilds every dependency from `package-lock.json`, so **never ship
`node_modules` or build output** (also: Windows‑built native modules are useless
in a Linux container).

### Zip + FTP (primary method)

**One command on the dev machine** builds the bundle (right excludes, sanity
check, and a `SERVER-DEPLOY.sh` helper dropped into the zip root):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\make-deploy-zip.ps1
#   -> <Desktop>\localsell-deploy.zip   (~58 MB)
#
# add -Lean to also drop web/public/assets/images/png (~44 MB of unoptimised
# marketing images not referenced by any rendered component) -> ~14 MB zip;
# eyeball the web marketing pages after deploying.
#
# add -Out <path> to write it elsewhere.
```

It excludes `node_modules` / build output / `.git` / the customer & rider Expo
apps / root `assets|brand|lib|scripts|.github` / every real `.env`, and **keeps**
every `package-lock.json`, all `Dockerfile`s, `docker-compose.yml`,
`deploy/localsell.env.example`, each app's `prisma/` + its own `lib/`, and
`api-mysql/scripts/` (so `npm run verify` runs on the server). It aborts if any
required file is missing.

Upload the zip **in binary mode**, then on the server:

```bash
cd <project dir>
unzip -o ~/localsell-deploy.zip     # -o overwrites; keeps deploy/localsell.env
bash SERVER-DEPLOY.sh             # build + start + db:deploy + checks  (redeploys)
#   first ever deploy: create deploy/localsell.env first (section 6), then also
#   run section 8 for the Maps key + demo data.
```

### git clone (alternative, if the host has git)

```bash
git clone <REPO_URL> <project dir> && cd <project dir> && git checkout <BRANCH>
```

---

## 6. Environment file

```bash
cd <project dir>
cp deploy/localsell.env.example deploy/localsell.env
nano deploy/localsell.env          # fill every CHANGE_ME
chmod 600 deploy/localsell.env
```

`deploy/localsell.env` did **not** survive the zip transfer on the first run — if
`ls deploy/` is empty, recreate it with a heredoc (`cat > deploy/localsell.env <<'EOF' … EOF`).

Keys and where each is used:

| Key | Used by | Value |
|---|---|---|
| `DATABASE_URL` | api runtime | `mysql://localsell:<DBPW>@mysql_dev_3308:3306/localsell` |
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET` | api runtime | fresh `openssl rand -hex 32` each — **unique per deployment** |
| `CORS_ORIGIN` | api runtime | the web + admin + store origins, comma‑separated, no `*` |
| `PUBLIC_UPLOAD_URL` | api runtime | `https://api.localsell.in/uploads` |
| `NEXT_PUBLIC_SERVER_URL` / `_WS_SERVER_URL` | web + admin **build** | `https://…` / `wss://…` (trailing slash) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | web + admin **build** | browser Maps key |
| `EXPO_PUBLIC_GRAPHQL_URL` / `_WS_GRAPHQL_URL` | store **build** | `https://…/graphql` / `wss://…/graphql` |

> Build‑time values (`NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`) are **compiled into the
> bundles**. Changing a URL later means rebuilding that image, not restarting it.

---

## 7. Build & start

```bash
cd <project dir>
docker compose --env-file deploy/localsell.env up -d --build
docker compose --env-file deploy/localsell.env ps
```

Four images build (three Node apps + the Expo web export — the `store` build runs
`expo export` and is the slowest). Logs: `… logs -f api` / `… logs -f web admin store`.

Local smoke test (before Apache):

```bash
curl -s  http://127.0.0.1:6002/health       ; echo   # {"status":"ok"}
curl -sI http://127.0.0.1:6000/ | head -n1           # 200  web
curl -sI http://127.0.0.1:6001/ | head -n1           # 200  admin
curl -sI http://127.0.0.1:6004/ | head -n1           # 200  store
```

---

## 8. Schema + data

`prisma/migrations/` is stale for this DB — use `db push`, then seed (see the
§4 warning about not importing a Windows dump). **All of it is wrapped in one
idempotent command**, `npm run db:deploy` (`prisma/deploy/` — see its README):
schema sync → client → Configuration defaults (currency, commission billing, map
centre, verification skips — non‑destructive) → commission/delivery backfill.

```bash
cd <project dir>
DBPW=$(cat /root/localsell_db_pw.txt)

# 1. schema + config defaults + backfill (safe to re-run on every redeploy)
docker compose --env-file deploy/localsell.env exec api npm run db:deploy
#    first launch only — also load the 8 demo Deogarh stores:
docker compose --env-file deploy/localsell.env exec api npm run db:deploy -- --demo

# 2. the deploy does NOT set the Maps key — add it once
docker exec -it mysql_dev_3308 mysql -ulocalsell -p"$DBPW" localsell \
  -e "UPDATE Configuration SET googleMapsApiKey='<MAPS_KEY>';"

# 3. pick up the config change
docker compose --env-file deploy/localsell.env restart api
```

`db:deploy -- --demo` runs `npm run seed` (prints base logins — admin
`admin@localsell.in` / `Admin@123`, etc.) and `seed:deogarh` (8 stores, flips
`Configuration` to INR / ₹, commission 20% / MONTHLY, map centre Deogarh).
Store‑app logins: `dgh-<slug>@store.localsell.in` / `Store@123`
(e.g. `dgh-shrinath-mishthan-bhandar@store.localsell.in`).

**On every later redeploy after a schema change:** just
`docker compose … exec api npm run db:deploy` (no `--demo`).

---

## 9. Apache vhosts + TLS

This host uses plain per‑domain files in **`/etc/httpd/conf.d/`** + certbot
webroot + HTTP→HTTPS redirect (matching the existing `moneyvisors` / `ams`
setup). Two phases: HTTP‑only first (so certbot can validate), then add TLS.

### 9a. Phase 1 — HTTP vhosts

```bash
mkdir -p /var/www/letsencrypt/.well-known/acme-challenge

# host = the full public hostname (dot-subdomain, apex for web), not a prefix
for pair in "localsell.in:6000" "admin.localsell.in:6001" "store.localsell.in:6004"; do
  host=${pair%:*}; port=${pair#*:}
  cat > /etc/httpd/conf.d/${host}.conf <<EOF
<VirtualHost *:80>
    ServerName ${host}
    Alias /.well-known/acme-challenge/ "/var/www/letsencrypt/.well-known/acme-challenge/"
    <Directory "/var/www/letsencrypt/.well-known/acme-challenge/">
        Require all granted
    </Directory>
    ProxyPreserveHost On
    ProxyRequests Off
    RequestHeader set X-Forwarded-Proto "http"
    ProxyTimeout 60
    ProxyPass /.well-known/acme-challenge/ !
    ProxyPass        / http://127.0.0.1:${port}/ retry=0
    ProxyPassReverse / http://127.0.0.1:${port}/
    ErrorLog  /var/log/httpd/${host}-error.log
    CustomLog /var/log/httpd/${host}-access.log combined
</VirtualHost>
EOF
done

# API — adds the WebSocket upgrade rule for GraphQL subscriptions
cat > /etc/httpd/conf.d/api.localsell.in.conf <<'EOF'
<VirtualHost *:80>
    ServerName api.localsell.in
    Alias /.well-known/acme-challenge/ "/var/www/letsencrypt/.well-known/acme-challenge/"
    <Directory "/var/www/letsencrypt/.well-known/acme-challenge/">
        Require all granted
    </Directory>
    ProxyPreserveHost On
    ProxyRequests Off
    RequestHeader set X-Forwarded-Proto "http"
    ProxyTimeout 60
    LimitRequestBody 26214400
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/?(.*) ws://127.0.0.1:6002/$1 [P,L]
    ProxyPass /.well-known/acme-challenge/ !
    ProxyPass        / http://127.0.0.1:6002/ retry=0
    ProxyPassReverse / http://127.0.0.1:6002/
    ErrorLog  /var/log/httpd/localsell-api-error.log
    CustomLog /var/log/httpd/localsell-api-access.log combined
</VirtualHost>
EOF

httpd -M | grep -E 'proxy_module|proxy_http|proxy_wstunnel|rewrite_module|headers_module'
apachectl configtest && systemctl reload httpd
```

If `proxy_wstunnel` is missing: `echo 'LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so' > /etc/httpd/conf.modules.d/00-proxy-wstunnel.conf && systemctl reload httpd`.

Test over HTTP: `curl -sI http://localsell.in/ | head -n1` etc.

### 9b. Certificates (certbot webroot, one per host)

```bash
for d in localsell.in admin.localsell.in store.localsell.in api.localsell.in; do
  certbot certonly --webroot -w /var/www/letsencrypt \
    -d ${d} --non-interactive --agree-tos -m you@example.com \
    || echo "FAILED: $d"
done
ls -d /etc/letsencrypt/live/*localsell.in
certbot renew --dry-run
```

### 9c. Phase 2 — HTTP→HTTPS redirect + TLS proxy

> **Apache 2.4.6 (CentOS 7) — MUST also set `SSLCertificateChainFile`.** Reading the
> intermediate + cross-sign out of `fullchain.pem` via `SSLCertificateFile` needs
> httpd ≥ 2.4.8. On 2.4.6 the server sends **only the leaf**; desktop browsers
> tolerate it (AIA fetch / cached intermediates) but **Android okhttp fails the
> handshake** — worse now that the Let's Encrypt chain runs
> `leaf → YR1 → ISRG Root YR → ISRG Root X1` and `ISRG Root YR` (2026) isn't in
> device trust stores yet. Every `*:443` block below includes
> `SSLCertificateChainFile .../chain.pem`. Verify after reload (**must use
> `-showcerts`** — plain `s_client` output only ever contains the leaf, so
> `grep -c "BEGIN CERTIFICATE"` on it always says `1` and proves nothing):
> `echo | openssl s_client -connect <host>:443 -servername <host> -showcerts 2>/dev/null | grep -c "BEGIN CERTIFICATE"` → **3**, and `Verify return code: 0 (ok)`.
>
> **Duplicate vhost note:** if the domain was also added through the Sentora panel,
> there is a second auto-generated `*:443` vhost at
> `/etc/sentora/configs/apache/domains/ssl_<host>.conf`. `conf.d/*.conf` loads first
> (httpd.conf line ~354) so the hand-written vhost wins, but keep the SSL block in
> both correct (Sentora's regenerates with `cert.pem`+`chain.pem` already).

```bash
# host = the full public hostname (dot-subdomain, apex for web), not a prefix
for pair in "localsell.in:6000" "admin.localsell.in:6001" "store.localsell.in:6004"; do
  host=${pair%:*}; port=${pair#*:}
  cat > /etc/httpd/conf.d/${host}.conf <<EOF
<VirtualHost *:80>
    ServerName ${host}
    Alias /.well-known/acme-challenge/ "/var/www/letsencrypt/.well-known/acme-challenge/"
    <Directory "/var/www/letsencrypt/.well-known/acme-challenge/">
        Require all granted
    </Directory>
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
    RewriteRule ^ https://${host}%{REQUEST_URI} [R=301,L]
    ErrorLog  /var/log/httpd/${host}-error.log
    CustomLog /var/log/httpd/${host}-access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName ${host}
    SSLEngine On
    SSLCertificateFile      /etc/letsencrypt/live/${host}/cert.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/${host}/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/${host}/chain.pem
    ProxyPreserveHost On
    ProxyRequests Off
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-SSL "on"
    ProxyTimeout 60
    Timeout 60
    ProxyPass        / http://127.0.0.1:${port}/ retry=0
    ProxyPassReverse / http://127.0.0.1:${port}/
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    ErrorLog  /var/log/httpd/${host}-error.log
    CustomLog /var/log/httpd/${host}-access.log combined
</VirtualHost>
EOF
done

cat > /etc/httpd/conf.d/api.localsell.in.conf <<'EOF'
<VirtualHost *:80>
    ServerName api.localsell.in
    Alias /.well-known/acme-challenge/ "/var/www/letsencrypt/.well-known/acme-challenge/"
    <Directory "/var/www/letsencrypt/.well-known/acme-challenge/">
        Require all granted
    </Directory>
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
    RewriteRule ^ https://api.localsell.in%{REQUEST_URI} [R=301,L]
    ErrorLog  /var/log/httpd/localsell-api-error.log
    CustomLog /var/log/httpd/localsell-api-access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName api.localsell.in
    SSLEngine On
    SSLCertificateFile      /etc/letsencrypt/live/api.localsell.in/cert.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/api.localsell.in/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/api.localsell.in/chain.pem
    ProxyPreserveHost On
    ProxyRequests Off
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-SSL "on"
    ProxyTimeout 60
    Timeout 60
    LimitRequestBody 26214400
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/?(.*) ws://127.0.0.1:6002/$1 [P,L]
    ProxyPass        / http://127.0.0.1:6002/ retry=0
    ProxyPassReverse / http://127.0.0.1:6002/
    Header always set X-Content-Type-Options "nosniff"
    ErrorLog  /var/log/httpd/localsell-api-error.log
    CustomLog /var/log/httpd/localsell-api-access.log combined
</VirtualHost>
EOF

apachectl configtest && systemctl reload httpd
```

`certbot renew` deploy‑hook: add `--deploy-hook "systemctl reload httpd"` on the
first issue, or install a global one:

```bash
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload httpd\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-httpd.sh
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-httpd.sh
```

The `chain.pem` / `fullchain.pem` paths under `live/` stay valid across renewals,
so the `SSLCertificateChainFile` lines never need re‑editing.

**Retrofit an already‑deployed box** (adds the missing `SSLCertificateChainFile`
to all 4 vhosts in place):

```bash
cd /etc/httpd/conf.d
for h in localsell.in admin.localsell.in store.localsell.in api.localsell.in; do
  f=${h}.conf
  grep -q SSLCertificateChainFile "$f" || sed -i \
    "\|SSLCertificateKeyFile /etc/letsencrypt/live/${h}/privkey.pem|a\\    SSLCertificateChainFile /etc/letsencrypt/live/${h}/chain.pem" "$f"
done
apachectl configtest && systemctl reload httpd
```

---

## 10. Post‑deploy

1. **Google Maps key.** The `/maps/*` proxy in the API calls Google
   **server‑side** using `Configuration.googleMapsApiKey`. An HTTP‑referrer
   restriction blocks server calls entirely (`REQUEST_DENIED`). Options:
   - one key, **no restriction** (simplest for a test box), or
   - restrict by the **server IP** (`103.92.235.209`), or
   - two keys: browser key (referrer‑restricted to `https://localsell.in/* (and admin./store./api. subdomains)`)
     for `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, and an IP‑restricted key in
     `Configuration.googleMapsApiKey`.
2. **Rotate the super‑admin.** `admin@localsell.in` / `Admin@123` is a public
   default — log into the admin panel and change email + password immediately.
3. **Check `Configuration`** (Admin → Management → Configuration): currency
   `INR` / `₹`, `skipEmailVerification` + `skipMobileVerification` both **on**
   (no SMTP/OTP wired).

---

## 11. Smoke tests + E2E

```bash
curl -s https://api.localsell.in/health ; echo
curl -s https://api.localsell.in/graphql -H 'content-type: application/json' \
  -d '{"query":"{__typename}"}' ; echo
```

Browser:
- [ ] `https://localsell.in` loads; Deogarh stores show
- [ ] Set a Deogarh delivery location → stores listed; a far location → "area unavailable" screen
- [ ] `/maps/place-autocomplete?input=deogarh` returns predictions (else → §10.1)
- [ ] Customer login (`customer@localsell.in` / `Customer@123`)
- [ ] Admin login; upload a store image → serves from `…/uploads/…`

**Order flow (customer ↔ store, proves the WebSocket path):**
1. `https://store.localsell.in` → login `dgh-<slug>@store.localsell.in` / `Store@123`
2. Customer places an order from that store → "Click to order"
3. Store shows it under **New Orders** within seconds → **Accept** → prep time
4. Customer tracking page updates live
5. Rider hand‑off: rider app on a device pointed at `localsell-api`, or Admin →
   Dispatch to progress the order manually (rider web = §14).

---

## 12. Day‑2 operations

```bash
cd <project dir>

# redeploy after a code change:
#   dev machine:  powershell -File scripts\make-deploy-zip.ps1   (upload the zip)
#   server:
unzip -o ~/localsell-deploy.zip          # -o overwrites, keeps deploy/localsell.env
bash SERVER-DEPLOY.sh                   # up -d --build + db:deploy + checks
#   (git host instead of zip: git pull, then `bash SERVER-DEPLOY.sh`)

# URL / Maps-key change → rebuild the affected bundles (values are compile-time)
docker compose --env-file deploy/localsell.env up -d --build web admin store

# status / logs / restart
docker compose --env-file deploy/localsell.env ps
docker compose --env-file deploy/localsell.env logs -f --tail=200 api
docker compose --env-file deploy/localsell.env restart api

# backups
docker exec mysql_dev_3308 sh -c 'exec mysqldump -ulocalsell -p"$0" localsell' "$(cat /root/localsell_db_pw.txt)" \
  | gzip > /var/backups/localsell-db-$(date +%F).sql.gz
docker run --rm -v localsell_uploads:/data -v /var/backups:/out \
  busybox tar czf /out/localsell-uploads-$(date +%F).tar.gz -C /data .
```

Rollback: re‑deploy the previous zip / `git checkout <sha>` + `up -d --build`;
restore the DB from a dump only if a schema/data change caused the problem.

---

## 12.1 Deploying the commission / language / location / rider‑cash release

What changed and what each needs on the server:

| Change | Server action |
|---|---|
| **DB schema** — 4 new tables (`CommissionRecord`, `CommissionBill`, `RiderCashEntry`, `RiderCashRemittance`) + `Configuration` columns (`defaultCommissionRate`, `commissionBillingCycle`, `defaultLatitude/Longitude`) | `db:deploy` (below) — additive `prisma db push`, no data loss |
| **API** — commission/rider‑cash resolvers, `placeOrder` delivery‑range check, in‑process **scheduler** (`src/scheduler.ts`, auto‑closes completed commission periods every 6 h) | rebuild `api` image; scheduler starts itself on boot |
| **Admin** — 4 new screens (Commission Bills, Rider Cash, Finance Report, vendor "My Commission"), proxy address‑search on the store‑location map | rebuild `admin` image |
| **Web + Store** — language pickers trimmed to EN/HI, new store‑app `hi.js` | rebuild `web` + `store` images (locale files are compiled in) |
| **Rider app** — new "My Cash" drawer screen | **not a server service** — see note at the end |

No new **required** env vars. Optional: `COMMISSION_AUTOCLOSE=off` in
`deploy/localsell.env` to disable the scheduler (default: on).

### Steps

```powershell
# 1. dev machine — build the bundle
powershell -ExecutionPolicy Bypass -File scripts\make-deploy-zip.ps1
#    -> <Desktop>\localsell-deploy.zip   (upload it in binary mode)
```

```bash
# 2. server
cd <project dir>
unzip -o ~/localsell-deploy.zip          # -o overwrites; keeps deploy/localsell.env
bash SERVER-DEPLOY.sh
#    SERVER-DEPLOY.sh does, in order:
#      docker compose ... up -d --build          (api, web, admin, store)
#      docker compose ... exec api npm run db:deploy
#          -> Configuration filled: ... / Stores: N ... backfilled /
#             Commission records: K created / Rider cash entries: J created / ✅
#      grep the scheduler line
#          -> [scheduler] commission auto-close armed (every 6h ...)
#      read-only check that the new Query fields exist
#          -> OK  commissionPeriodPreview / OK riderCashOutstanding / OK platformFinanceReport
```

`SERVER-DEPLOY.sh` is safe to re-run for every future redeploy. It stops with a
clear message if `deploy/localsell.env` is missing (first deploy — create it from
§6, then re-run; the Maps key + demo data are still §8).

> `npm run verify` (`scripts/verify-launch.mjs`) is the full end‑to‑end check but
> it **writes** test orders / a paid bill / a remittance — run it only on a
> staging or `--demo` deploy, not production. It assumes the seed logins exist.

### Browser checks

- Admin → **Management → Commission Bills / Rider Cash / Finance Report** load.
- A vendor login shows **Commission** in its sidebar.
- Place → deliver one COD test order → *Commission Bills → Current period*
  shows it; if a rider was assigned, *Rider Cash* shows the held amount.
- Store‑location map (admin → a store → General → Location): opens on the store /
  Deogarh (not Australia), address search returns predictions.

### Rider app ("My Cash" screen)

Not deployed by Docker. The screen is in the Expo JS bundle:

- **Now:** restart Metro (`npx expo start` for the rider app) — installed
  dev‑client apps pick it up on reload, as long as the phone can reach Metro.
- **For a standalone APK:** new EAS build (`eas build --profile demo …`) —
  blocked until the free‑plan quota resets (see the mobile notes).

Rollback for this release: redeploy the previous zip + `up -d --build`. The new
tables are additive — leaving them in place after a rollback is harmless; only
restore a DB dump if the backfill itself is suspected.

---

## 13. Troubleshooting (issues hit on the first deploy)

| Symptom | Cause | Fix |
|---|---|---|
| API build: `tsc` errors `Cannot find name 'process'` / `@types/node` | `NODE_ENV=production` set **before** `npm ci` → devDeps skipped | fixed in `api-mysql/Dockerfile` (env after `npm ci`); rebuild |
| `bind: address already in use` on `up` | host port taken by another container | change the `127.0.0.1:PORT` in `docker-compose.yml` (`ss -ltn` to find a free one) |
| `Couldn't find env file: /etc/httpd/conf.d/deploy/localsell.env` | ran `docker compose` from the wrong dir | `cd <project dir>` first |
| API 500 on `/maps/*`, `The table Configuration does not exist` | `prisma db push` not run, or a lowercase Windows dump was imported | §8 `db push` + seed; never import a cross‑platform dump (§4) |
| `db push` wants to DROP many lowercase tables | a Windows dump was imported earlier | let it drop (that import is unusable), then seed |
| Maps still 500 after seeding + key | Google key is referrer‑restricted → server calls denied | §10.1 — unrestricted or IP‑restricted key |
| Order tracking / new‑order lists frozen | `mod_proxy_wstunnel` missing or WS rewrite absent from the `-api` vhost | §9a; `httpd -M \| grep wstunnel` |
| Site loads, no data / CORS error | `NEXT_PUBLIC_SERVER_URL` wrong (rebuild) or origin missing from `CORS_ORIGIN` (restart api) | |
| `apachectl` warns `DocumentRoot … does not exist` for `ams` | pre‑existing typo in someone else's conf (`publich_html`) | not ours — ignore |
| store build fails on `expo export` | missing `EXPO_PUBLIC_*` arg | check `deploy/localsell.env`, `docker compose logs store` |

---

## 14. Security checklist

- [ ] `chmod 600 deploy/localsell.env`; it is git‑ignored — never commit it
- [ ] `JWT_SECRET` + `REFRESH_TOKEN_SECRET` freshly generated, **unique to this deployment**
- [ ] MySQL `localsell` user password is deployment‑specific (`openssl rand -hex 24`)
- [ ] `admin@localsell.in` / `Admin@123` rotated right after first login (§10.2)
- [ ] `CORS_ORIGIN` is an explicit list, never `*`
- [ ] all container host ports bound to `127.0.0.1` (compose already does this)
- [ ] HSTS + `X-Content-Type-Options` headers present on the `:443` vhosts (§9c)
- [ ] admin credentials are **not** baked into the bundle (the `NEXT_PUBLIC_ADMIN_*`
      build args were removed) — type them at the login screen
- [ ] Google Maps: browser key referrer‑restricted; server key IP‑restricted (§10.1)
- [ ] `certbot renew` timer active and reloads httpd

---

## 15. Adding the rider app as a website (optional, for full E2E)

Rider is Expo, already web‑runnable (`metro.config.js` stubs `react-native-maps`).

1. `localsell-rider/environment.ts` → read `process.env.EXPO_PUBLIC_GRAPHQL_URL`
   / `EXPO_PUBLIC_WS_GRAPHQL_URL` with a fallback (same pattern as
   `localsell-store/environment.ts`).
2. Copy `localsell-store/{Dockerfile,nginx.conf,.dockerignore}` into
   `localsell-rider/`.
3. Add a `rider` service to `docker-compose.yml`, host port **6005**, same
   `EXPO_PUBLIC_*` build args.
4. `CORS_ORIGIN += https://rider.localsell.in`; DNS record; a §9‑style
   plain (no‑WS) vhost pair; a cert.
5. Rider login: `rider1` / `Rider@123`.

Native mobile builds: point each app's `environment` at `https://api.localsell.in`
and rebuild via EAS.

---

## 16. Files & what is NOT needed on the server

**Deploy artifacts (in the repo):**

| Path | Purpose |
|---|---|
| `docker-compose.yml` | 4‑service stack; external `mysql_config_dev_default` network |
| `deploy/localsell.env.example` | env template → copy to `deploy/localsell.env` |
| `localsell-{web,admin,store}/Dockerfile` (+ `.dockerignore`) | `npm ci` → build → run (`next start` / nginx) |
| `localsell-store/nginx.conf` | SPA fallback for the Expo web export |
| `localsell-api/Dockerfile` (+ `.dockerignore`) | single‑stage; keeps Prisma CLI + `ts-node` for `db push` / seeds |
| `localsell-store/environment.ts` | reads `EXPO_PUBLIC_*` (fallback kept for local dev) |

**Not needed to deploy — excluded by the §5 zip filter (kept in the repo for dev):**
`localsell-app`, `localsell-rider`, `cypress/` in each app,
`assets/ brand/ lib/ scripts/ .github/ index.html` at the root, `*.pdf` audit
files, `localsell-{web,admin}/.env.{dev,stage,prod}` (they point at the
old `aws-server-v2.enatega.com` and are unused — the deployment uses build args),
`localsell-store/android/` + `google-service*.json` (native only).

**Key facts:**
- API required env: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET` (throws
  on startup if missing). Serves `/graphql` (HTTP + `ws`), `/maps/*`,
  `/client-logs`, `/uploads`, `/health`.
- web/admin are **not** `output: standalone` — images run `next start` with full
  `node_modules`.
- store is `expo-router` web output `single` (SPA) → nginx with `index.html`
  fallback; no maps code; talks to `localsell-api` over the legacy `graphql-ws`
  sub‑protocol (supported by this API).
- Node 20.16.0 everywhere (`.nvmrc`).
