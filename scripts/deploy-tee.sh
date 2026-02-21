#!/usr/bin/env bash
# Rebuild and redeploy ProofOfVerdict Judge to EigenCompute TEE
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$ROOT/.env" ] && set -a && . "$ROOT/.env" && set +a
cd "$ROOT/agent/judge"

ENVFILE="${1:-.env.tee}"
if [ ! -f "$ENVFILE" ]; then
  echo "Create $ENVFILE from .env.tee.example (EigenAI key, etc.)"
  exit 1
fi
[ -f "$ENVFILE" ] && set -a && . "$ENVFILE" && set +a

: "${ECLOUD_PRIVATE_KEY:?Set ECLOUD_PRIVATE_KEY in .env for deploy}"
: "${EIGENAI_API_KEY:?Add EIGENAI_API_KEY to .env.tee for EigenAI}"

echo "=== Building PoV Judge ==="
docker build -t ghcr.io/hebx/pov-judge:latest .

echo "=== Pushing to GHCR ==="
docker push ghcr.io/hebx/pov-judge:latest

echo "=== Upgrading to EigenCompute ==="
export ECLOUD_ENVFILE_PATH="$ROOT/agent/judge/$ENVFILE"
export ECLOUD_IMAGE_REF="ghcr.io/hebx/pov-judge:latest"
# Run from /tmp to avoid Dockerfile detection (use image-ref only)
cd /tmp
# App ID: 0x865104D466143234Cc503E9025CBe54a9131a51A
printf "n\n" | ecloud compute app upgrade 0x865104D466143234Cc503E9025CBe54a9131a51A \
  --image-ref "ghcr.io/hebx/pov-judge:latest" \
  --env-file "$ROOT/agent/judge/$ENVFILE" \
  --log-visibility public \
  --instance-type g1-standard-4t \
  --resource-usage-monitoring disable

echo "Done. Check: https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A"
