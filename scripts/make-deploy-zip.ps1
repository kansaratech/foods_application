<#
  make-deploy-zip.ps1  —  build the server deploy bundle in one step.

    powershell -ExecutionPolicy Bypass -File scripts\make-deploy-zip.ps1

  Produces  <Desktop>\padharo-deploy.zip  (override with -Out).

  What goes in: the 4 service source folders + every package-lock.json,
  Dockerfile, .dockerignore, docker-compose.yml, deploy/ (example env only),
  each app's prisma/ and its own lib/, and api-mysql/scripts/ (so
  `npm run verify` works on the server).

  What stays out: node_modules / build output / .git, the customer + rider
  Expo apps (not docker services), root assets|brand|lib|scripts|.github,
  logs, and every real .env file (recreate deploy/padharo.env on the server).

  On the server:  unzip -o ~/padharo-deploy.zip  then follow SERVER-DEPLOY.sh
  (dropped into the zip root) or PADHARO_DEPLOYMENT.md section 12.1.
#>
[CmdletBinding()]
param(
  [string]$Out = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'padharo-deploy.zip'),
  # Also drop web/public/assets/images/png (~44 MB of unoptimised marketing
  # images that aren't referenced by any rendered component). Shrinks the zip
  # from ~58 MB to ~13 MB. Eyeball the web marketing pages after deploying.
  [switch]$Lean
)

$ErrorActionPreference = 'Stop'
$src   = Split-Path -Parent $PSScriptRoot          # repo root (parent of scripts\)
$stage = Join-Path $env:TEMP 'padharo-deploy-stage'

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
  '.git', 'dist', 'build', 'coverage', 'cypress', '.nyc_output',
  '.claude', '.vscode', '.idea',
  (Join-Path $src 'enatega-multivendor-app'),
  (Join-Path $src 'enatega-multivendor-rider'),
  (Join-Path $src 'enatega-multivendor-store\android'),
  (Join-Path $src 'enatega-multivendor-store\ios'),
  (Join-Path $src 'assets'),
  (Join-Path $src 'brand'),
  (Join-Path $src 'lib'),
  (Join-Path $src 'scripts'),
  (Join-Path $src '.github')
)
if ($Lean) { $xd += (Join-Path $src 'enatega-multivendor-web\public\assets\images\png') }
$xf = @(
  '*.log', '*.tsbuildinfo', '*.pdf', '*.stackdump', 'index.html',
  '.env', '*.env', '.env.local', '.env.development', '.env.production',
  '.env.dev', '.env.stage', '.env.prod'
)

$rc = @($src, $stage, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:1', '/W:1',
        '/XD') + $xd + @('/XF') + $xf
& robocopy @rc | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed (exit $LASTEXITCODE)" }

# keep the example env; make sure no real secret slipped through
Copy-Item (Join-Path $src 'deploy\padharo.env.example') (Join-Path $stage 'deploy\padharo.env.example') -Force -ErrorAction SilentlyContinue
Get-ChildItem $stage -Recurse -Filter '*.env' -File |
  Where-Object { $_.Name -ne 'padharo.env.example' } |
  ForEach-Object { Write-Warning "removing stray env: $($_.FullName.Substring($stage.Length))"; Remove-Item $_.FullName -Force }

# ---- sanity check: every file the server build needs ----------------------
$must = @(
  'docker-compose.yml',
  'deploy\padharo.env.example',
  'PADHARO_DEPLOYMENT.md',
  'enatega-multivendor-api-mysql\package-lock.json',
  'enatega-multivendor-api-mysql\Dockerfile',
  'enatega-multivendor-api-mysql\prisma\schema.prisma',
  'enatega-multivendor-api-mysql\prisma\deploy\run.ts',
  'enatega-multivendor-api-mysql\scripts\verify-launch.mjs',
  'enatega-multivendor-api-mysql\src\scheduler.ts',
  'enatega-multivendor-web\package-lock.json',
  'enatega-multivendor-web\Dockerfile',
  'enatega-multivendor-admin\package-lock.json',
  'enatega-multivendor-admin\Dockerfile',
  'enatega-multivendor-store\package-lock.json',
  'enatega-multivendor-store\Dockerfile',
  'enatega-multivendor-store\nginx.conf',
  'enatega-multivendor-store\languages\hi.js'
)
$missing = $must | Where-Object { -not (Test-Path (Join-Path $stage $_)) }
if ($missing) { throw "staging is missing required files:`n  " + ($missing -join "`n  ") }

# ---- server helper script into the zip root ------------------------------
$serverScript = @'
#!/usr/bin/env bash
# One-shot server deploy. Run from the project dir after: unzip -o ~/padharo-deploy.zip
set -e
E="--env-file deploy/padharo.env"
[ -f deploy/padharo.env ] || { echo "!! create deploy/padharo.env first (cp deploy/padharo.env.example, then fill it)"; exit 1; }

echo "== build + (re)start all services =="
docker compose $E up -d --build
docker compose $E ps

echo "== schema + config defaults + backfill (idempotent) =="
docker compose $E exec -T api npm run db:deploy

echo "== scheduler =="
docker compose $E logs api | grep -m1 scheduler || echo "  (no scheduler line yet - check: docker compose $E logs api)"

echo "== new API surface (introspection is off in prod, so we probe the fields directly) =="
docker compose $E exec -T api node -e '
  const q = n => fetch("http://localhost:4000/graphql",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({query:"{ "+n+" { __typename } }"})}).then(r=>r.json())
    .then(d=>{const m=(d.errors&&d.errors[0]&&d.errors[0].message)||"";
      // field exists if the error is anything OTHER than a "Cannot query field" schema error
      console.log((/Cannot query field/.test(m) ? "  MISSING " : "  OK   ") + n);});
  Promise.all(["commissionPeriodPreview","riderCashOutstanding","platformFinanceReport","payoutRuns","reconciliationReport","walletAdjustments","pendingStoreDocuments","storePerformance"].map(q));
'

echo "== done. First deploy? add the Maps key + demo data - see PADHARO_DEPLOYMENT.md section 8 =="
'@ -replace "`r`n","`n"
# write LF-only, no BOM — a BOM breaks the shebang
[System.IO.File]::WriteAllText((Join-Path $stage 'SERVER-DEPLOY.sh'), $serverScript, (New-Object System.Text.UTF8Encoding($false)))

# ---- zip ----------------------------------------------------------------
if (Test-Path $Out) { Remove-Item $Out -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $Out -CompressionLevel Optimal

$mb = [math]::Round((Get-Item $Out).Length / 1MB, 1)
$files = (Get-ChildItem $stage -Recurse -File).Count
Write-Host "`nOK  $Out  ($mb MB, $files files)"
Write-Host "Push it to the server, then:  unzip -o ~/padharo-deploy.zip && bash SERVER-DEPLOY.sh"
