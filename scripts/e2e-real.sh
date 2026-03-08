#!/usr/bin/env bash
# E2E with real data: USDC (or configured token), two agents submit via Judge generateArgument + submitArgument.
# Flow: listener (agent mode) → open-escrow → submit-two-arguments → wait for settlement.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# Load .env and require essential vars
[ -f .env ] && set -a && source .env && set +a
: "${BASE_SEPOLIA_RPC:?Set BASE_SEPOLIA_RPC in .env}"
: "${PRIVATE_KEY:?Set PRIVATE_KEY in .env}"
: "${JUDGE_URL:?Set JUDGE_URL in .env}"
: "${PAYEE_ADDRESS:?Set PAYEE_ADDRESS in .env}"

# Defaults: USDC Base Sepolia, short topic
export POV_TOKEN_ADDRESS="${POV_TOKEN_ADDRESS:-0x036CbD53842c5426634e7929541eC2318f3dCF7e}"
export DEBATE_TOPIC="${DEBATE_TOPIC:-Is decentralized AI more trustworthy than centralized AI?}"
PAYEE="${PAYEE_ADDRESS}"

# Derive payer from PRIVATE_KEY (scripts has viem)
export PAYER_ADDRESS="${PAYER_ADDRESS:-$(cd "$SCRIPT_DIR" && PRIVATE_KEY="$PRIVATE_KEY" node -e "const { privateKeyToAccount } = require('viem/accounts'); console.log(privateKeyToAccount(process.env.PRIVATE_KEY).address)")}"

echo "E2E Real Data (USDC + two agents via SDK)"
echo "  JUDGE_URL=$JUDGE_URL"
echo "  POV_TOKEN_ADDRESS=$POV_TOKEN_ADDRESS"
echo "  PAYER_ADDRESS=$PAYER_ADDRESS"
echo "  PAYEE_ADDRESS=$PAYEE"
echo "  DEBATE_TOPIC=$DEBATE_TOPIC"
echo ""

# 1. Start listener in background
echo "[1/4] Starting listener (DEBATE_MODE=agent)..."
cd "$SCRIPT_DIR"
DEBATE_MODE=agent POV_TOKEN_ADDRESS="$POV_TOKEN_ADDRESS" PAYEE_ADDRESS="$PAYEE" DEBATE_TOPIC="$DEBATE_TOPIC" npm run listener &
LISTENER_PID=$!
cd "$ROOT"
sleep 5

# 2. Open escrow and capture disputeId
echo "[2/4] Opening escrow..."
cd "$SCRIPT_DIR"
OPEN_OUT=$(PAYEE_ADDRESS="$PAYEE" POV_TOKEN_ADDRESS="$POV_TOKEN_ADDRESS" DEBATE_TOPIC="$DEBATE_TOPIC" npm run open-escrow 2>&1)
echo "$OPEN_OUT"
cd "$ROOT"

DISPUTE_ID=$(echo "$OPEN_OUT" | grep -oE '0x[a-fA-F0-9]{64}' | head -1)
if [ -z "$DISPUTE_ID" ]; then
  echo "Failed to get disputeId from open-escrow output."
  kill "$LISTENER_PID" 2>/dev/null || true
  exit 1
fi
echo "[2/4] disputeId=$DISPUTE_ID"

# 3. Submit both arguments (two logical agents)
echo "[3/4] Submitting two arguments..."
cd "$SCRIPT_DIR"
if ! DISPUTE_ID="$DISPUTE_ID" PAYER_ADDRESS="$PAYER_ADDRESS" PAYEE_ADDRESS="$PAYEE" DEBATE_TOPIC="$DEBATE_TOPIC" npm run submit-two-arguments; then
  echo "submit-two-arguments failed."
  kill "$LISTENER_PID" 2>/dev/null || true
  exit 1
fi
cd "$ROOT"

# 4. Wait for listener (settlement) or timeout
echo "[4/4] Waiting for listener (up to 120s)..."
for _ in $(seq 1 24); do
  kill -0 "$LISTENER_PID" 2>/dev/null || break
  sleep 5
done
kill "$LISTENER_PID" 2>/dev/null || true
wait "$LISTENER_PID" 2>/dev/null || true

echo "Done. Check output above for settlement."
