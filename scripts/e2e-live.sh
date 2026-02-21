#!/usr/bin/env bash
# ProofOfVerdict E2E: Deploy MockERC20, open escrow, run listener for live 2-agent debate + verdict
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load .env from project root
if [ -f .env ]; then
  set -a
  source .env
  set +a
else
  echo "Copy .env.example to .env and set BASE_SEPOLIA_RPC, PRIVATE_KEY, PAYEE_ADDRESS"
  exit 1
fi

: "${BASE_SEPOLIA_RPC:?Set BASE_SEPOLIA_RPC in .env}"
: "${PRIVATE_KEY:?Set PRIVATE_KEY in .env}"

# Default payee: use a different address (e.g. TEE wallet or second test wallet)
PAYEE="${PAYEE_ADDRESS:-0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC}"

echo "=== ProofOfVerdict E2E: Live 2-Agent Debate + Verdict ==="
echo "  RPC: $BASE_SEPOLIA_RPC"
echo "  Payee: $PAYEE"
echo ""

# 1. Deploy MockERC20 if needed
if [ -z "$POV_TOKEN_ADDRESS" ]; then
  echo "[1/4] Deploying MockERC20..."
  cd contracts
  DEPLOY_OUT=$(forge script script/DeployMockERC20.s.sol:DeployMockERC20 \
    --rpc-url "$BASE_SEPOLIA_RPC" --broadcast 2>&1)
  echo "$DEPLOY_OUT"
  TOKEN=$(echo "$DEPLOY_OUT" | grep "MockERC20 deployed to:" | sed 's/.*: //')
  if [ -z "$TOKEN" ]; then
    echo "Failed to parse token address"
    exit 1
  fi
  cd "$ROOT"
  export POV_TOKEN_ADDRESS="$TOKEN"
  echo "  Token: $POV_TOKEN_ADDRESS"
else
  echo "[1/4] Using existing POV_TOKEN_ADDRESS: $POV_TOKEN_ADDRESS"
fi

# 2. Start listener in background
echo ""
echo "[2/4] Starting verdict-listener (watches for EscrowOpened, runs 2-agent debate + judge)..."
cd scripts
npm install --silent 2>/dev/null || true
DEBATE_TOPIC="${DEBATE_TOPIC:-Is decentralized AI more trustworthy than centralized AI?}" \
  POV_TOKEN_ADDRESS="$POV_TOKEN_ADDRESS" \
  PAYEE_ADDRESS="$PAYEE" \
  npm run listener &
LISTENER_PID=$!
cd "$ROOT"

# Wait for listener to be ready
sleep 5

# 3. Open escrow (triggers EscrowOpened → listener runs debate + verdict + settle)
echo ""
echo "[3/4] Opening escrow (100 POV staked)..."
cd scripts
PAYEE_ADDRESS="$PAYEE" POV_TOKEN_ADDRESS="$POV_TOKEN_ADDRESS" npm run open-escrow
cd "$ROOT"

# 4. Wait for settlement
echo ""
echo "[4/4] Waiting for settlement (listen to output above)..."
echo "  Agent A (PRO) and Agent B (CON) will debate, Judge will verdict, escrow will settle."
echo "  Press Ctrl+C to stop listener when done."
wait $LISTENER_PID 2>/dev/null || true
