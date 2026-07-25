#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Build the vercel output
echo "Building for Vercel..."
bash ./build-vercel.sh

# Deploy
echo "Deploying to Vercel..."
npx vercel deploy --prebuilt --token="$VERCEL_TOKEN" --prod --yes \
  --vercel-project-id="" \
  --vercel-org-id="" \
  .vercel/output 2>&1 | tee .run/vercel-deploy.log

# Extract URL
URL=$(grep -oP 'https?://[^\s]+' .run/vercel-deploy.log | tail -1)
echo "LIVE: $URL"
