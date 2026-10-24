#!/bin/sh
set -eu
# Run migrations only in the web container (CMD = node server.js), never the
# worker — one writer, no race. Offline (no npx fetch): prisma CLI is in the image.
if [ "${1:-}" = "node" ] && [ "${2:-}" = "server.js" ]; then
  echo "Applying Prisma migrations..."
  ./node_modules/.bin/prisma migrate deploy
fi
exec "$@"
