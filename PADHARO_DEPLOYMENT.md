# Padharo — Deployment Runbook

Reusable procedure for deploying the Padharo stack (customer web, admin, GraphQL
API, store merchant web) behind Apache on a Docker host with a **shared MySQL
container**. First run: `padharo.kansaratech.com`, Sep 2026 — every step below is
what actually worked, with the traps folded in.

To deploy to a **new domain or server**, fill in §0 and search‑replace the two
tokens (`padharo` → your prefix, `kansaratech.com` → your zone) — nothing else in
the doc hard‑codes them.

---

## 0. Parameters — fill in per deployment

| Token | This deployment | Notes |
|---|---|---|
| Name prefix | `padharo` | used in hostnames, container names, DB name |
| DNS zone | `kansaratech.com` | |
| Customer web host | `padharo.kansaratech.com` | |
| Admin host | `padharo-admin.kansaratech.com` | |
| API host | `padharo-api.kansaratech.com` | HTTP **and** WebSocket |
| Store host | `padharo-store.kansaratech.com` | |
| Server public IP | `103.92.235.209` | for DNS + Maps key IP restriction |
| Project dir on server | `/var/sentora/hostdata/kansaratech/public_html/padharo_kansaratech_com/server` | where `docker-compose.yml` lives |
| Shared MySQL container | `mysql_dev_3308` | `mysql:8.0`, internal port **3306** |
| Shared Docker network | `mysql_config_dev_default` | the API joins this to reach MySQL by name |
| DB name / user | `padharo` / `padharo` | |
| Host ports | web `6000`, admin `6001`, api `6002`, store `6004` | 6003 was taken on this host; pick any free `ss -ltn` ports |

---

## 1. What gets deployed

| Service | Repo folder | Container | Cont. port | Host port (127.0.0.1) | Public host |
|---|---|---|---|---|---|
| Customer web (Next 16) | `enatega-multivendor-web` | `padharo_web` | 3000 | 6000 | `padharo.kansaratech.com` |
| Admin (Next 14) | `enatega-multivendor-admin` | `padharo_admin` | 3000 | 6001 | `padharo-admin.kansaratech.com` |
| API (Apollo + `ws` + Prisma/MySQL + `/uploads`) | `enatega-multivendor-api-mysql` | `padharo_api` | 4000 | 6002 | `padharo-api.kansaratech.com` |
| Store merchant web (Expo web export → nginx) | `enatega-multivendor-store` | `padharo_store` | 80 | 6004 | `padharo-store.kansaratech.com` |

- One `docker-compose.yml` at repo root runs all four.
- Host ports bind to `127.0.0.1` only — Apache reverse‑proxies each public host
  to its local port and terminates TLS.
- `padharo_api` joins the **external** `mysql_config_dev_default` network so
  `DATABASE_URL` can use the MySQL **container name** as host.
- Browsers talk to `padharo-api` directly for data + subscriptions; web/admin/store
  are otherwise independent.

```
                       Internet (HTTPS / WSS)
   ┌──────────┬──────────┼──────────┬──────────┐
   ▼          ▼          ▼          ▼
 padharo   -admin     -store      -api      (browser → -api for data + WS)
   │          │          │          │
        Apache vhosts in /etc/httpd/conf.d/  (TLS, ws upgrade on -api)
   │          │          │          │
 :6000      :6001      :6004      :6002
 padharo_web  _admin    _store     _api ──── mysql_config_dev_default ──── mysql_dev_3308
                                              DB padharo / user padharo
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
openssl rand -hex 24   # MySQL password for the padharo user  (hex = URL-safe)
```

---

## 3. DNS (one‑time)

Four `A` records → server public IP:

```
padharo         A   103.92.235.209
padharo-api     A   103.92.235.209
padharo-admin   A   103.92.235.209
padharo-store   A   103.92.235.209
```

Confirm before requesting certs: `dig +short padharo.kansaratech.com`.

---

## 4. Database — create `padharo` on the shared MySQL

```bash
docker network inspect mysql_config_dev_default \
  --format '{{range .Containers}}{{.Name}} {{end}}'      # find the MySQL container

DBPW=$(openssl rand -hex 24); echo "$DBPW" > /root/padharo_db_pw.txt; echo "$DBPW"

docker exec -it mysql_dev_3308 mysql -uroot -p -e "
  CREATE DATABASE IF NOT EXISTS padharo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'padharo'@'%' IDENTIFIED BY '$DBPW';
  ALTER USER 'padharo'@'%' IDENTIFIED BY '$DBPW';
  GRANT ALL PRIVILEGES ON padharo.* TO 'padharo'@'%';
  FLUSH PRIVILEGES;"

docker exec -it mysql_dev_3308 mysql -upadharo -p"$DBPW" padharo -e 'SELECT 1;'   # verify
```

`DATABASE_URL` host = the **container name**, port = **3306** (container‑internal,
even though this one publishes 3308 on the host):

```
mysql://padharo:<DBPW>@mysql_dev_3308:3306/padharo
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

PowerShell on the dev machine:

```powershell
$src   = "d:\my-workspace\maekotech\project\kitchen\foods_application"
$stage = "$env:TEMP\padharo-deploy"
$zip   = "$env:USERPROFILE\Desktop\padharo-deploy.zip"

robocopy $src $stage /MIR /NFL /NDL /NJH /NJS `
  /XD node_modules .next .expo .cache .git dist build coverage cypress `
      "enatega-multivendor-store\android" "enatega-multivendor-store\ios" `
      "enatega-multivendor-app" "enatega-multivendor-rider" `
      assets brand lib scripts .github `
  /XF *.log *.tsbuildinfo *.pdf index.html bash.exe.stackdump

if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path "$stage\*" -DestinationPath $zip
"Made $zip  ($([math]::Round((Get-Item $zip).Length/1MB,1)) MB)"
```

**Must be in the zip:** every `package.json` + `package-lock.json`, all
`Dockerfile`s + `.dockerignore`, `docker-compose.yml`, `deploy/`, each app's
`prisma/` / `nginx.conf` / `.npmrc` / `.nvmrc`, and the four service source
folders (`enatega-multivendor-{web,admin,api-mysql,store}`).

Upload the zip **in binary mode**, then:

```bash
cd <project dir>
unzip ~/padharo-deploy.zip
```

### git clone (alternative, if the host has git)

```bash
git clone <REPO_URL> <project dir> && cd <project dir> && git checkout <BRANCH>
```

---

## 6. Environment file

```bash
cd <project dir>
cp deploy/padharo.env.example deploy/padharo.env
nano deploy/padharo.env          # fill every CHANGE_ME
chmod 600 deploy/padharo.env
```

`deploy/padharo.env` did **not** survive the zip transfer on the first run — if
`ls deploy/` is empty, recreate it with a heredoc (`cat > deploy/padharo.env <<'EOF' … EOF`).

Keys and where each is used:

| Key | Used by | Value |
|---|---|---|
| `DATABASE_URL` | api runtime | `mysql://padharo:<DBPW>@mysql_dev_3308:3306/padharo` |
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET` | api runtime | fresh `openssl rand -hex 32` each — **unique per deployment** |
| `CORS_ORIGIN` | api runtime | the web + admin + store origins, comma‑separated, no `*` |
| `PUBLIC_UPLOAD_URL` | api runtime | `https://padharo-api.kansaratech.com/uploads` |
| `NEXT_PUBLIC_SERVER_URL` / `_WS_SERVER_URL` | web + admin **build** | `https://…` / `wss://…` (trailing slash) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | web + admin **build** | browser Maps key |
| `EXPO_PUBLIC_GRAPHQL_URL` / `_WS_GRAPHQL_URL` | store **build** | `https://…/graphql` / `wss://…/graphql` |

> Build‑time values (`NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`) are **compiled into the
> bundles**. Changing a URL later means rebuilding that image, not restarting it.

---

## 7. Build & start

```bash
cd <project dir>
docker compose --env-file deploy/padharo.env up -d --build
docker compose --env-file deploy/padharo.env ps
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
§4 warning about not importing a Windows dump).

```bash
cd <project dir>
DBPW=$(cat /root/padharo_db_pw.txt)

# 1. create the schema (PascalCase tables)
docker compose --env-file deploy/padharo.env exec api npx prisma db push --skip-generate

# 2. seed base data + the Deogarh stores
docker compose --env-file deploy/padharo.env exec api npm run seed
docker compose --env-file deploy/padharo.env exec api npm run seed:deogarh

# 3. the seed does NOT set the Maps key — add it
docker exec -it mysql_dev_3308 mysql -upadharo -p"$DBPW" padharo \
  -e "UPDATE Configuration SET googleMapsApiKey='<MAPS_KEY>';"

# 4. pick up the config change
docker compose --env-file deploy/padharo.env restart api
```

`npm run seed` prints all base logins (admin `admin@enatega.local` / `Admin@123`,
etc.). `seed:deogarh` adds 8 stores and flips `Configuration` to INR / ₹.
Store‑app logins: `dgh-<slug>@store.padharo` / `Store@123`
(e.g. `dgh-shrinath-mishthan-bhandar@store.padharo`).

---

## 9. Apache vhosts + TLS

This host uses plain per‑domain files in **`/etc/httpd/conf.d/`** + certbot
webroot + HTTP→HTTPS redirect (matching the existing `moneyvisors` / `ams`
setup). Two phases: HTTP‑only first (so certbot can validate), then add TLS.

### 9a. Phase 1 — HTTP vhosts

```bash
mkdir -p /var/www/letsencrypt/.well-known/acme-challenge

for pair in "padharo:6000" "padharo-admin:6001" "padharo-store:6004"; do
  name=${pair%:*}; port=${pair#*:}
  cat > /etc/httpd/conf.d/${name}.kansaratech.com.conf <<EOF
<VirtualHost *:80>
    ServerName ${name}.kansaratech.com
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
    ErrorLog  /var/log/httpd/${name}-error.log
    CustomLog /var/log/httpd/${name}-access.log combined
</VirtualHost>
EOF
done

# API — adds the WebSocket upgrade rule for GraphQL subscriptions
cat > /etc/httpd/conf.d/padharo-api.kansaratech.com.conf <<'EOF'
<VirtualHost *:80>
    ServerName padharo-api.kansaratech.com
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
    ErrorLog  /var/log/httpd/padharo-api-error.log
    CustomLog /var/log/httpd/padharo-api-access.log combined
</VirtualHost>
EOF

httpd -M | grep -E 'proxy_module|proxy_http|proxy_wstunnel|rewrite_module|headers_module'
apachectl configtest && systemctl reload httpd
```

If `proxy_wstunnel` is missing: `echo 'LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so' > /etc/httpd/conf.modules.d/00-proxy-wstunnel.conf && systemctl reload httpd`.

Test over HTTP: `curl -sI http://padharo.kansaratech.com/ | head -n1` etc.

### 9b. Certificates (certbot webroot, one per host)

```bash
for d in padharo padharo-admin padharo-store padharo-api; do
  certbot certonly --webroot -w /var/www/letsencrypt \
    -d ${d}.kansaratech.com --non-interactive --agree-tos -m you@example.com \
    || echo "FAILED: $d"
done
ls -d /etc/letsencrypt/live/padharo*
certbot renew --dry-run
```

### 9c. Phase 2 — HTTP→HTTPS redirect + TLS proxy

```bash
for pair in "padharo:6000" "padharo-admin:6001" "padharo-store:6004"; do
  name=${pair%:*}; port=${pair#*:}
  cat > /etc/httpd/conf.d/${name}.kansaratech.com.conf <<EOF
<VirtualHost *:80>
    ServerName ${name}.kansaratech.com
    Alias /.well-known/acme-challenge/ "/var/www/letsencrypt/.well-known/acme-challenge/"
    <Directory "/var/www/letsencrypt/.well-known/acme-challenge/">
        Require all granted
    </Directory>
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
    RewriteRule ^ https://${name}.kansaratech.com%{REQUEST_URI} [R=301,L]
    ErrorLog  /var/log/httpd/${name}-error.log
    CustomLog /var/log/httpd/${name}-access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName ${name}.kansaratech.com
    SSLEngine On
    SSLCertificateFile    /etc/letsencrypt/live/${name}.kansaratech.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/${name}.kansaratech.com/privkey.pem
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
    ErrorLog  /var/log/httpd/${name}-error.log
    CustomLog /var/log/httpd/${name}-access.log combined
</VirtualHost>
EOF
done

cat > /etc/httpd/conf.d/padharo-api.kansaratech.com.conf <<'EOF'
<VirtualHost *:80>
    ServerName padharo-api.kansaratech.com
    Alias /.well-known/acme-challenge/ "/var/www/letsencrypt/.well-known/acme-challenge/"
    <Directory "/var/www/letsencrypt/.well-known/acme-challenge/">
        Require all granted
    </Directory>
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
    RewriteRule ^ https://padharo-api.kansaratech.com%{REQUEST_URI} [R=301,L]
    ErrorLog  /var/log/httpd/padharo-api-error.log
    CustomLog /var/log/httpd/padharo-api-access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName padharo-api.kansaratech.com
    SSLEngine On
    SSLCertificateFile    /etc/letsencrypt/live/padharo-api.kansaratech.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/padharo-api.kansaratech.com/privkey.pem
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
    ErrorLog  /var/log/httpd/padharo-api-error.log
    CustomLog /var/log/httpd/padharo-api-access.log combined
</VirtualHost>
EOF

apachectl configtest && systemctl reload httpd
```

`certbot renew` deploy‑hook: add `--deploy-hook "systemctl reload httpd"` on the
first issue, or rely on the packaged renew timer + a global reload hook.

---

## 10. Post‑deploy

1. **Google Maps key.** The `/maps/*` proxy in the API calls Google
   **server‑side** using `Configuration.googleMapsApiKey`. An HTTP‑referrer
   restriction blocks server calls entirely (`REQUEST_DENIED`). Options:
   - one key, **no restriction** (simplest for a test box), or
   - restrict by the **server IP** (`103.92.235.209`), or
   - two keys: browser key (referrer‑restricted to `https://padharo*.kansaratech.com/*`)
     for `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, and an IP‑restricted key in
     `Configuration.googleMapsApiKey`.
2. **Rotate the super‑admin.** `admin@enatega.local` / `Admin@123` is a public
   default — log into the admin panel and change email + password immediately.
3. **Check `Configuration`** (Admin → Management → Configuration): currency
   `INR` / `₹`, `skipEmailVerification` + `skipMobileVerification` both **on**
   (no SMTP/OTP wired).

---

## 11. Smoke tests + E2E

```bash
curl -s https://padharo-api.kansaratech.com/health ; echo
curl -s https://padharo-api.kansaratech.com/graphql -H 'content-type: application/json' \
  -d '{"query":"{__typename}"}' ; echo
```

Browser:
- [ ] `https://padharo.kansaratech.com` loads; Deogarh stores show
- [ ] Set a Deogarh delivery location → stores listed; a far location → "area unavailable" screen
- [ ] `/maps/place-autocomplete?input=deogarh` returns predictions (else → §10.1)
- [ ] Customer login (`customer@enatega.local` / `Customer@123`)
- [ ] Admin login; upload a store image → serves from `…/uploads/…`

**Order flow (customer ↔ store, proves the WebSocket path):**
1. `https://padharo-store.kansaratech.com` → login `dgh-<slug>@store.padharo` / `Store@123`
2. Customer places an order from that store → "Click to order"
3. Store shows it under **New Orders** within seconds → **Accept** → prep time
4. Customer tracking page updates live
5. Rider hand‑off: rider app on a device pointed at `padharo-api`, or Admin →
   Dispatch to progress the order manually (rider web = §14).

---

## 12. Day‑2 operations

```bash
cd <project dir>

# redeploy after a code change
unzip -o ~/padharo-deploy.zip          # re-upload first; -o overwrites, keeps deploy/padharo.env
#   (git: git pull)
docker compose --env-file deploy/padharo.env up -d --build
docker compose --env-file deploy/padharo.env exec api npx prisma db push --skip-generate   # if schema changed

# URL / Maps-key change → rebuild the affected bundles (values are compile-time)
docker compose --env-file deploy/padharo.env up -d --build web admin store

# status / logs / restart
docker compose --env-file deploy/padharo.env ps
docker compose --env-file deploy/padharo.env logs -f --tail=200 api
docker compose --env-file deploy/padharo.env restart api

# backups
docker exec mysql_dev_3308 sh -c 'exec mysqldump -upadharo -p"$0" padharo' "$(cat /root/padharo_db_pw.txt)" \
  | gzip > /var/backups/padharo-db-$(date +%F).sql.gz
docker run --rm -v padharo_padharo_uploads:/data -v /var/backups:/out \
  busybox tar czf /out/padharo-uploads-$(date +%F).tar.gz -C /data .
```

Rollback: re‑deploy the previous zip / `git checkout <sha>` + `up -d --build`;
restore the DB from a dump only if a schema/data change caused the problem.

---

## 13. Troubleshooting (issues hit on the first deploy)

| Symptom | Cause | Fix |
|---|---|---|
| API build: `tsc` errors `Cannot find name 'process'` / `@types/node` | `NODE_ENV=production` set **before** `npm ci` → devDeps skipped | fixed in `api-mysql/Dockerfile` (env after `npm ci`); rebuild |
| `bind: address already in use` on `up` | host port taken by another container | change the `127.0.0.1:PORT` in `docker-compose.yml` (`ss -ltn` to find a free one) |
| `Couldn't find env file: /etc/httpd/conf.d/deploy/padharo.env` | ran `docker compose` from the wrong dir | `cd <project dir>` first |
| API 500 on `/maps/*`, `The table Configuration does not exist` | `prisma db push` not run, or a lowercase Windows dump was imported | §8 `db push` + seed; never import a cross‑platform dump (§4) |
| `db push` wants to DROP many lowercase tables | a Windows dump was imported earlier | let it drop (that import is unusable), then seed |
| Maps still 500 after seeding + key | Google key is referrer‑restricted → server calls denied | §10.1 — unrestricted or IP‑restricted key |
| Order tracking / new‑order lists frozen | `mod_proxy_wstunnel` missing or WS rewrite absent from the `-api` vhost | §9a; `httpd -M \| grep wstunnel` |
| Site loads, no data / CORS error | `NEXT_PUBLIC_SERVER_URL` wrong (rebuild) or origin missing from `CORS_ORIGIN` (restart api) | |
| `apachectl` warns `DocumentRoot … does not exist` for `ams` | pre‑existing typo in someone else's conf (`publich_html`) | not ours — ignore |
| store build fails on `expo export` | missing `EXPO_PUBLIC_*` arg | check `deploy/padharo.env`, `docker compose logs store` |

---

## 14. Security checklist

- [ ] `chmod 600 deploy/padharo.env`; it is git‑ignored — never commit it
- [ ] `JWT_SECRET` + `REFRESH_TOKEN_SECRET` freshly generated, **unique to this deployment**
- [ ] MySQL `padharo` user password is deployment‑specific (`openssl rand -hex 24`)
- [ ] `admin@enatega.local` / `Admin@123` rotated right after first login (§10.2)
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

1. `enatega-multivendor-rider/environment.ts` → read `process.env.EXPO_PUBLIC_GRAPHQL_URL`
   / `EXPO_PUBLIC_WS_GRAPHQL_URL` with a fallback (same pattern as
   `enatega-multivendor-store/environment.ts`).
2. Copy `enatega-multivendor-store/{Dockerfile,nginx.conf,.dockerignore}` into
   `enatega-multivendor-rider/`.
3. Add a `rider` service to `docker-compose.yml`, host port **6005**, same
   `EXPO_PUBLIC_*` build args.
4. `CORS_ORIGIN += https://padharo-rider.kansaratech.com`; DNS record; a §9‑style
   plain (no‑WS) vhost pair; a cert.
5. Rider login: `rider1` / `Rider@123`.

Native mobile builds: point each app's `environment` at `https://padharo-api.kansaratech.com`
and rebuild via EAS.

---

## 16. Files & what is NOT needed on the server

**Deploy artifacts (in the repo):**

| Path | Purpose |
|---|---|
| `docker-compose.yml` | 4‑service stack; external `mysql_config_dev_default` network |
| `deploy/padharo.env.example` | env template → copy to `deploy/padharo.env` |
| `enatega-multivendor-{web,admin,store}/Dockerfile` (+ `.dockerignore`) | `npm ci` → build → run (`next start` / nginx) |
| `enatega-multivendor-store/nginx.conf` | SPA fallback for the Expo web export |
| `enatega-multivendor-api-mysql/Dockerfile` (+ `.dockerignore`) | single‑stage; keeps Prisma CLI + `ts-node` for `db push` / seeds |
| `enatega-multivendor-store/environment.ts` | reads `EXPO_PUBLIC_*` (fallback kept for local dev) |

**Not needed to deploy — excluded by the §5 zip filter (kept in the repo for dev):**
`enatega-multivendor-app`, `enatega-multivendor-rider`, `cypress/` in each app,
`assets/ brand/ lib/ scripts/ .github/ index.html` at the root, `*.pdf` audit
files, `enatega-multivendor-{web,admin}/.env.{dev,stage,prod}` (they point at the
old `aws-server-v2.enatega.com` and are unused — the deployment uses build args),
`enatega-multivendor-store/android/` + `google-service*.json` (native only).

**Key facts:**
- API required env: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET` (throws
  on startup if missing). Serves `/graphql` (HTTP + `ws`), `/maps/*`,
  `/client-logs`, `/uploads`, `/health`.
- web/admin are **not** `output: standalone` — images run `next start` with full
  `node_modules`.
- store is `expo-router` web output `single` (SPA) → nginx with `index.html`
  fallback; no maps code; talks to `padharo-api` over the legacy `graphql-ws`
  sub‑protocol (supported by this API).
- Node 20.16.0 everywhere (`.nvmrc`).
