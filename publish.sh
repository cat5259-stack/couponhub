#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Kill whatever is on port 3000, then build and restart
sudo sh -c 'lsof -t -iTCP:3000 -sTCP:LISTEN | xargs -r kill' 2>/dev/null || true

echo "Installing dependencies..."
bun install --frozen-lockfile

echo "Building..."
bun run build

echo "Starting server..."
mkdir -p .run
nohup bun run serve.ts > .run/server.log 2>&1 &
sleep 1

echo "Site published on port 3000"
