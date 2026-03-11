#!/bin/sh
set -e

DB_PATH="${DATABASE_URL:-file:./dev.db}"
DB_FILE="${DB_PATH#file:}"

if [ ! -f "$DB_FILE" ]; then
  echo "No database found at $DB_FILE — running initialisation..."
  node /opt/app-root/src/scripts/init-db.mjs
fi

exec node /opt/app-root/src/build/index.js
