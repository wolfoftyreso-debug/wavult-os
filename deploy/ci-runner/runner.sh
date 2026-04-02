#!/bin/bash
# CI Runner — triggered by Gitea webhook
set -euo pipefail

COMMIT_HASH="${COMMIT_HASH:-}"
SERVICE="${SERVICE:-wavult-os-api}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
DEPLOY_SERVICE_URL="${DEPLOY_SERVICE_URL:-https://api.wavult.com/deploy}"
GITEA_URL="${GITEA_URL:-https://git.wavult.com}"
CI_API_KEY="${CI_API_KEY:-}"

echo "=== Wavult CI Pipeline ==="
echo "Commit:      $COMMIT_HASH"
echo "Service:     $SERVICE"
echo "Environment: $ENVIRONMENT"

if [ -z "$COMMIT_HASH" ]; then
  echo "❌ FAIL: COMMIT_HASH not set"
  exit 1
fi

# STAGE 1: Verify GPG signature
echo ""
echo "Stage 1: Verify commit signature..."
rm -rf /build/repo
git clone "$GITEA_URL/wavult/$SERVICE" /build/repo
cd /build/repo
git checkout "$COMMIT_HASH"
SIG_STATUS=$(git log --format="%G?" -n 1 "$COMMIT_HASH")
if [ "$SIG_STATUS" != "G" ]; then
  echo "❌ FAIL: Unsigned commit rejected (status: $SIG_STATUS)"
  exit 1
fi
echo "✅ Signature verified"

# STAGE 2: Install dependencies
echo ""
echo "Stage 2: Install dependencies..."
npm ci --silent || { echo "❌ FAIL: npm ci failed"; exit 1; }

# STAGE 3: Run tests
echo ""
echo "Stage 3: Run tests..."
npm test 2>&1 || { echo "❌ FAIL: Tests failed"; exit 1; }
echo "✅ Tests passed"

# STAGE 4: Build
echo ""
echo "Stage 4: Build..."
npm run build 2>&1 || { echo "❌ FAIL: Build failed"; exit 1; }
echo "✅ Build complete"

# STAGE 5: Create versioned artifact
echo ""
echo "Stage 5: Store artifact..."
VERSION="${COMMIT_HASH:0:8}-$(date +%Y%m%d%H%M%S)"
ARTIFACT_KEY="artifacts/$SERVICE/$VERSION.tar.gz"
tar czf /tmp/artifact.tar.gz dist/
SHA256=$(sha256sum /tmp/artifact.tar.gz | awk '{print $1}')
aws s3 cp /tmp/artifact.tar.gz "s3://wavult-artifacts/$ARTIFACT_KEY"

# Register artifact in deploy service
curl -sf -X POST "$DEPLOY_SERVICE_URL/artifacts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CI_API_KEY" \
  -d "{
    \"service_name\": \"$SERVICE\",
    \"version\": \"$VERSION\",
    \"commit_hash\": \"$COMMIT_HASH\",
    \"s3_key\": \"$ARTIFACT_KEY\",
    \"sha256_checksum\": \"$SHA256\"
  }"

echo "✅ Artifact stored: $ARTIFACT_KEY (sha256: $SHA256)"
echo ""
echo "=== Pipeline complete. Deployment request pending approval ==="
