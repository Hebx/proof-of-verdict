#!/usr/bin/env bash
# Rebuild and redeploy ProofOfVerdict Judge to EigenCompute TEE
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/agent/judge"

: "${ECLOUD_PRIVATE_KEY:?Set ECLOUD_PRIVATE_KEY for deploy}"
: "${EIGENAI_API_KEY:?Set EIGENAI_API_KEY in .env.tee for EigenAI}"

ENVFILE="${1:-.env.tee}"
if [ ! -f "$ENVFILE" ]; then
  echo "Create $ENVFILE from .env.tee.example (EigenAI key, etc.)"
  exit 1
fi

echo "=== Building PoV Judge ==="
docker build -t ghcr.io/hebx/pov-judge:latest .

echo "=== Pushing to GHCR ==="
docker push ghcr.io/hebx/pov-judge:latest

echo "=== Upgrading to EigenCompute ==="
export ECLOUD_ENVFILE_PATH="$ROOT/agent/judge/$ENVFILE"
# App ID: 0x865104D466143234Cc503E9025CBe54a9131a51A
printf "n\n" | ecloud compute app upgrade 0x865104D466143234Cc503E9025CBe54a9131a51A \
  --image-ref "ghcr.io/hebx/pov-judge:latest" \
  --env-file "$ROOT/agent/judge/$ENVFILE" \
  --log-visibility public \
  --instance-type g1-standard-4t \
  --resource-usage-monitoring disable

echo "Done. Check: https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A"
