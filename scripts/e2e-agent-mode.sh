#!/usr/bin/env bash
# E2E Agent Mode: Agents submit their own arguments, Judge evaluates, listener settles
# Requires: Judge running locally (npm run dev in agent/judge) with /submitArgument
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[ -f .env ] && set -a && source .env && set +a
: "${BASE_SEPOLIA_RPC:?}"
: "${PRIVATE_KEY:?}"
: "${POV_TOKEN_ADDRESS:?}"
: "${PAYEE_ADDRESS:?}"

JUDGE_URL="${JUDGE_URL:-http://localhost:3001}"
PAYEE="${PAYEE_ADDRESS}"
PAYER="0x46Ca9120Ea33E7AF921Db0a230831CB08AeB2910"  # From PRIVATE_KEY

echo "=== ProofOfVerdict E2E: Agent Mode (2 agents submit arguments) ==="
echo "  Judge : $JUDGE_URL"
echo "  Payer : $PAYER"
echo "  Payee : $PAYEE"
echo ""

# 1. Start listener in agent mode (background)
echo "[1/5] Starting listener (DEBATE_MODE=agent)..."
cd scripts
DEBATE_MODE=agent DEBATE_TOPIC="${DEBATE_TOPIC}" JUDGE_URL="$JUDGE_URL" \
  POV_TOKEN_ADDRESS="$POV_TOKEN_ADDRESS" PAYEE_ADDRESS="$PAYEE" \
  npm run listener &
LISTENER_PID=$!
cd "$ROOT"
sleep 5

# 2. Open escrow
echo ""
echo "[2/5] Opening escrow..."
cd scripts
OPEN_OUT=$(PAYEE_ADDRESS="$PAYEE" POV_TOKEN_ADDRESS="$POV_TOKEN_ADDRESS" npm run open-escrow 2>&1)
echo "$OPEN_OUT"
DISPUTE_ID=$(echo "$OPEN_OUT" | grep -oE '0x[a-fA-F0-9]{64}' | tail -1)
cd "$ROOT"

if [ -z "$DISPUTE_ID" ]; then
  echo "Failed to get disputeId"
  kill $LISTENER_PID 2>/dev/null || true
  exit 1
fi

echo "  DisputeId: $DISPUTE_ID"

# 3. Agent A (payer) submits argument
echo ""
echo "[3/5] Agent A (payer) submitting argument..."
ARG_A="Autonomous AI agents should be permitted to manage DeFi assets because programmatic execution reduces human error, enables 24/7 monitoring, and TEE attestation provides verifiable integrity."
curl -s -X POST "$JUDGE_URL/submitArgument" -H "Content-Type: application/json" \
  -d "{\"disputeId\":\"$DISPUTE_ID\",\"debaterId\":\"$PAYER\",\"argument\":\"$ARG_A\",\"topic\":\"${DEBATE_TOPIC:-Test topic}\"}" | head -3

# 4. Agent B (payee) submits argument
echo ""
echo "[4/5] Agent B (payee) submitting argument..."
ARG_B="Autonomous AI agents should NOT manage DeFi assets without human oversight because smart contract bugs, oracle manipulation, and lack of accountability pose unacceptable risks to user funds."
curl -s -X POST "$JUDGE_URL/submitArgument" -H "Content-Type: application/json" \
  -d "{\"disputeId\":\"$DISPUTE_ID\",\"debaterId\":\"$PAYEE\",\"argument\":\"$ARG_B\",\"topic\":\"${DEBATE_TOPIC:-Test topic}\"}" | head -3

# 5. Wait for settlement
echo ""
echo "[5/5] Waiting for listener to settle (polling Judge, then registerVerdict, settle)..."
sleep 60
kill $LISTENER_PID 2>/dev/null || true
echo "Done."
