#!/bin/sh
set -e

echo "==> Running database migrations..."
MIGRATIONS_DIR=/app/drizzle node /app/dist/migrate.mjs

echo "==> Starting server..."
exec node /app/dist/index.mjs
