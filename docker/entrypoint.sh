#!/bin/sh
set -e

echo "==> Starting server (migrations run automatically on startup)..."
exec node /app/dist/index.mjs
