#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Building Vercel output..."
bun install --frozen-lockfile
bun run build

# Create .vercel/output structure
rm -rf .vercel
mkdir -p .vercel/output/functions/index.func

# Copy the built output
cp -r dist/client .vercel/output/static 2>/dev/null || true
cp -r dist/server .vercel/output/functions/index.func/dist 2>/dev/null || true
cp node_modules .vercel/output/functions/index.func/node_modules -r 2>/dev/null || true
cp vercel-entry.ts .vercel/output/functions/index.func/ 2>/dev/null || true
cp package.json .vercel/output/functions/index.func/ 2>/dev/null || true

# Write the config
mkdir -p .vercel/output
cat > .vercel/output/config.json << 'EOF'
{
  "version": 3,
  "routes": [
    { "src": "/assets/(.*)", "dest": "/assets/$1" },
    { "src": "/(.*)", "dest": "/index" }
  ]
}
EOF

cat > .vercel/output/functions/index.func/.vc-config.json << 'EOF'
{
  "runtime": "nodejs22.x",
  "handler": "vercel-entry.ts",
  "launcherType": "Nodejs"
}
EOF

echo "Vercel output built"
