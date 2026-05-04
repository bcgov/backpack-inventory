#!/bin/sh
set -e

DB_PATH="${DATABASE_URL:-file:./dev.db}"
DB_FILE="${DB_PATH#file:}"
DB_DIR="$(dirname "$DB_FILE")"

UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"

# Ensure persistent directories exist (PVC mounts start empty).
mkdir -p "$DB_DIR" "$UPLOADS_DIR/receipts"

if [ ! -f "$DB_FILE" ]; then
  echo "No database found at $DB_FILE — running initialisation..."
  node /opt/app-root/src/scripts/init-db.mjs
fi

exec node /opt/app-root/src/build/index.js
