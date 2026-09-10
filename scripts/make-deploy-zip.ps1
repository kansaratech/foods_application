<#
  make-deploy-zip.ps1  —  build the server deploy bundle in one step.

    powershell -ExecutionPolicy Bypass -File scripts\make-deploy-zip.ps1

  Produces  <Desktop>\localsell-deploy.zip  (override with -Out).

  What goes in: the 4 service source folders + every package-lock.json,
  Dockerfile, .dockerignore, docker-compose.yml, deploy/ (example env only),
  each app's prisma/ and its own lib/, and api/scripts/ (so
  `npm run verify` works on the server).

  What stays out: node_modules / build output / .git, the customer + rider
  Expo apps (not docker services), root assets|brand|lib|scripts|.github,
  logs, and every real .env file (recreate deploy/localsell.env on the server).

  On the server:  unzip -o ~/localsell-deploy.zip  then follow SERVER-DEPLOY.sh
  (dropped into the zip root) or LOCALSELL_DEPLOYMENT.md section 12.1.
#>
[CmdletBinding()]
param(
  [string]$Out = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'localsell-deploy.zip'),
  # Legacy switch — kept for compatibility, now a no-op. The old -Lean dropped
  # the entire web png folder, but 14 of those images ARE statically imported
  # by web components, so the web build fails without them. We now always keep
  # the folder and only drop the 4 giant (9-12 MB) unused hero webp/pngs.
  [switch]$Lean
)

$ErrorActionPreference = 'Stop'
$src   = Split-Path -Parent $PSScriptRoot          # repo root (parent of scripts\)
$stage = Join-Path $env:TEMP 'localsell-deploy-stage'

Write-Host "Repo   : $src"
Write-Host "Stage  : $stage"
Write-Host "Output : $Out`n"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

# ---- copy with excludes -----------------------------------------------------
# Bare names (node_modules, .next, ...) are matched at ANY depth — safe, those
# are always junk. Anything that also exists *inside* an app (assets, lib,
# scripts) is path-anchored to the repo root so the app copies keep theirs.
$xd = @(
  'node_modules', '.next', '.expo', '.expo-shared', '.cache', '.turbo',
  '.git', 'dist', 'build', 'coverage', 'cypress', '.nyc_output', '.tmp',
  '.claude', '.vscode', '.idea',
  (Join-Path $src 'localsell-app'),
  (Join-Path $src 'localsell-store\android'),
  (Join-Path $src 'localsell-store\ios'),
  (Join-Path $src 'localsell-rider\android'),
  (Join-Path $src 'localsell-rider\ios'),
  (Join-Path $src 'localsell-rider\splash_claud_assets'),
  (Join-Path $src 'assets'),
  (Join-Path $src 'brand'),
  (Join-Path $src 'lib'),
  (Join-Path $src 'scripts'),
  (Join-Path $src '.github')
)
# The 4 oversized unused hero images (9-12 MB each) — not imported anywhere,
# only ever referenced as background-image URLs on marketing sections.
$xf_png = @(
  (Join-Path $src 'localsell-web\public\assets\images\png\Support.webp'),
  (Join-Path $src 'localsell-web\public\assets\images\png\Amazing support.webp'),
  (Join-Path $src 'localsell-web\public\assets\images\png\Flexible schedules.webp'),
  (Join-Path $src 'localsell-web\public\assets\images\png\new-rider-bg.png')
)
$xf = @(
  '*.log', '*.tsbuildinfo', '*.pdf', '*.stackdump', 'index.html',
  '.env', '*.env', '.env.local', '.env.development', '.env.production',
  '.env.dev', '.env.stage', '.env.prod',
  'google-service-account*.json', 'google-services.json', 'GoogleService-Info.plist',
  # Root-level reference docs — dev context, not needed to build/run on the
  # server. Full paths (not bare names) so per-app README.md etc. still copy.
  (Join-Path $src 'README.md'),
  (Join-Path $src 'BRAND_SWAP_KIT.md'),
  (Join-Path $src 'LOCALSELL_BRAND.md'),
  (Join-Path $src 'PADHARO_ADMIN_OPS.md'),
  (Join-Path $src 'PADHARO_ASSETS.md'),
  (Join-Path $src 'PADHARO_COMMISSION.md'),
  (Join-Path $src 'PADHARO_PRODUCT_COMBOS.md'),
  (Join-Path $src 'PADHARO_STORE_OPS.md')
)

$rc = @($src, $stage, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:1', '/W:1',
        '/XD') + $xd + @('/XF') + $xf + $xf_png
& robocopy @rc | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed (exit $LASTEXITCODE)" }

# keep the example env; make sure no real secret slipped through
Copy-Item (Join-Path $src 'deploy\localsell.env.example') (Join-Path $stage 'deploy\localsell.env.example') -Force -ErrorAction SilentlyContinue
Get-ChildItem $stage -Recurse -Filter '*.env' -File |
  Where-Object { $_.Name -ne 'localsell.env.example' } |
  ForEach-Object { Write-Warning "removing stray env: $($_.FullName.Substring($stage.Length))"; Remove-Item $_.FullName -Force }

# ---- sanity check: every file the server build needs ----------------------
$must = @(
  'docker-compose.yml',
  'deploy\localsell.env.example',
  'LOCALSELL_DEPLOYMENT.md',
  'localsell-api\package-lock.json',
  'localsell-api\Dockerfile',
  'localsell-api\prisma\schema.prisma',
  'localsell-api\prisma\deploy\run.ts',
  'localsell-api\scripts\verify-launch.mjs',
  'localsell-api\src\scheduler.ts',
  'localsell-web\package-lock.json',
  'localsell-web\Dockerfile',
  'localsell-admin\package-lock.json',
  'localsell-admin\Dockerfile',
  'localsell-store\package-lock.json',
  'localsell-store\Dockerfile',
  'localsell-store\nginx.conf',
  'localsell-store\languages\hi.js',
  'localsell-rider\package-lock.json',
  'localsell-rider\Dockerfile',
  'localsell-rider\nginx.conf',
  'localsell-api\prisma\seed-data.json',
  'localsell-api\prisma\seed-from-config.ts'
)
$missing = $must | Where-Object { -not (Test-Path (Join-Path $stage $_)) }
if ($missing) { throw "staging is missing required files:`n  " + ($missing -join "`n  ") }

# ---- server helper script into the zip root ------------------------------
$serverScript = @'
#!/usr/bin/env bash
# One-shot server deploy. Run from the project dir after: unzip -o ~/localsell-deploy.zip
set -e
E="--env-file deploy/localsell.env"
[ -f deploy/localsell.env ] || { echo "!! create deploy/localsell.env first (cp deploy/localsell.env.example, then fill it)"; exit 1; }

echo "== build + (re)start all services =="
docker compose $E up -d --build
docker compose $E ps

echo "== schema + config defaults + backfill (idempotent, non-destructive) =="
docker compose $E exec -T api npm run db:deploy
#  ^ safe on every redeploy. It does NOT touch existing stores/orders/menus.
#  To replace all data with the clean 4-store Deogarh marketplace instead
#  (keeps Maps/SMTP keys), run ONCE, deliberately:
#     docker compose $E exec -T api npm run seed
#  Never on a marketplace with real vendors/orders.

echo "== scheduler =="
docker compose $E logs api | grep -m1 scheduler || echo "  (no scheduler line yet - check: docker compose $E logs api)"

echo "== new API surface (introspection is off in prod, so we probe the fields directly) =="
docker compose $E exec -T api node -e '
  const q = n => fetch("http://localhost:4000/graphql",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({query:"{ "+n+" { __typename } }"})}).then(r=>r.json())
    .then(d=>{const m=(d.errors&&d.errors[0]&&d.errors[0].message)||"";
      // field exists if the error is anything OTHER than a "Cannot query field" schema error
      console.log((/Cannot query field/.test(m) ? "  MISSING " : "  OK   ") + n);});
  Promise.all(["commissionPeriodPreview","riderCashOutstanding","platformFinanceReport","payoutRuns","reconciliationReport","walletAdjustments","pendingStoreDocuments","storePerformance","myPayoutHistory","whatsappTemplates"].map(q));
'

echo "== WhatsApp / phone-OTP (see LOCALSELL_DEPLOYMENT.md section 12.2) =="
echo "  - deploy/localsell.env needs WHATSAPP_ACCESS_TOKEN, WHATSAPP_VERIFY_TOKEN (WHATSAPP_APP_SECRET optional)"
echo "  - PhoneVerification / WhatsappTemplate / WhatsappMessageLog tables: created by db:deploy above (additive)"
echo "  - after deploy: admin -> Configuration -> WhatsApp (set IDs + Enabled), then 'Sync from Meta'"
echo "  - Meta dashboard webhook -> https://api.localsell.in/webhooks/whatsapp"

echo "== done. First deploy? add the Maps key + demo data - see LOCALSELL_DEPLOYMENT.md section 8 =="
'@ -replace "`r`n","`n"
# write LF-only, no BOM — a BOM breaks the shebang
[System.IO.File]::WriteAllText((Join-Path $stage 'SERVER-DEPLOY.sh'), $serverScript, (New-Object System.Text.UTF8Encoding($false)))

# ---- zip ----------------------------------------------------------------
# NOT Compress-Archive: Windows PowerShell 5.1 writes ZIP entry paths with "\"
# separators, and Linux `unzip` then treats "localsell-api\src\x.ts" as ONE
# filename in the top dir instead of nested folders — so the server ends up with
# junk files and the real tree untouched. Build entries by hand with "/".
if (Test-Path $Out) { Remove-Item $Out -Force }
Add-Type -AssemblyName System.IO.Compression | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
$zip = [System.IO.Compression.ZipFile]::Open($Out, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($f in Get-ChildItem $stage -Recurse -File) {
    $rel = $f.FullName.Substring($stage.Length + 1).Replace('\', '/')
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip, $f.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal)
  }
} finally { $zip.Dispose() }

$mb = [math]::Round((Get-Item $Out).Length / 1MB, 1)
$files = (Get-ChildItem $stage -Recurse -File).Count
Write-Host "`nOK  $Out  ($mb MB, $files files)"
Write-Host "Push it to the server, then:  unzip -o ~/localsell-deploy.zip && bash SERVER-DEPLOY.sh"
