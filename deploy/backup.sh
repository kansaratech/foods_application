#!/usr/bin/env bash
# Nightly uploads backup for Localsell. Install via cron — see
# LOCALSELL_DEPLOYMENT.md section 12.4. Safe to also run by hand.
#
# DB backups are NOT done here — handled by the existing midnight DB backup
# job already running on this host. This only covers the uploads directory
# (food images, store logos, KYC docs), which that job doesn't touch.
#
# Reads the uploads path straight out of deploy/localsell.env so this can
# never drift from what the running api container actually uses.
set -euo pipefail
cd "$(dirname "$0")/.."   # project root (this file lives in deploy/)

ENV_FILE="deploy/localsell.env"
[ -f "$ENV_FILE" ] || { echo "!! $ENV_FILE not found — run from the project dir"; exit 1; }

BACKUP_DIR="${LOCALSELL_BACKUP_DIR:-/var/backups/localsell}"
RETENTION_DAYS="${LOCALSELL_BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%F-%H%M%S)"
mkdir -p "$BACKUP_DIR"

UPLOADS_DIR="$(grep -m1 '^UPLOADS_HOST_DIR=' "$ENV_FILE" | cut -d= -f2-)"
UPLOADS_DIR="${UPLOADS_DIR:-/var/localsell/uploads}"

# ---- 1. uploads ---------------------------------------------------------
if [ -d "$UPLOADS_DIR" ]; then
  UPLOADS_OUT="$BACKUP_DIR/localsell-uploads-$STAMP.tar.gz"
  echo "[backup] archiving $UPLOADS_DIR -> $UPLOADS_OUT"
  tar czf "$UPLOADS_OUT.partial" -C "$UPLOADS_DIR" .
  mv "$UPLOADS_OUT.partial" "$UPLOADS_OUT"
else
  echo "[backup] !! $UPLOADS_DIR does not exist — skipping uploads backup"
fi

# ---- 2. rotate ------------------------------------------------------------
echo "[backup] pruning backups older than $RETENTION_DAYS day(s) in $BACKUP_DIR"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'localsell-uploads-*.tar.gz' -mtime "+$RETENTION_DAYS" -print -delete

echo "[backup] done — $(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'localsell-uploads-*.tar.gz' | wc -l) backup file(s) retained in $BACKUP_DIR"
