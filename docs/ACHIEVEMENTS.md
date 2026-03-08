# ProofOfVerdict — Verified Achievements

Live verification of core ProofOfVerdict capabilities on Base Sepolia + EigenCompute.

---

## What's Live

| Component | Status | Evidence |
|-----------|--------|----------|
| TEE Judge | ✅ Live | Health endpoint responding |
| VerdictRegistry | ✅ Deployed | Base Sepolia |
| PovEscrowERC20 | ✅ Deployed | Base Sepolia |
| Frontend | ✅ Code-ready | `apps/frontend` builds and runs |
| PovReputation | ✅ Code-ready | 23 tests pass, deploy TBD |
| Agent-mode E2E | ✅ Verified | `e2e-agent-mode.sh` passes |
| ERC-8004 | ✅ Registered | Agent ID 84532:961 |

---

## Judge Health

| Check | Status |
|-------|--------|
| Endpoint | `http://35.233.167.89:3001/health` |
| Response | `{"ok":true,"timestamp":...}` |

The TEE Judge (EigenCompute, Intel TDX) is live and responding.

**Phase 2 redeploy (2026-02-22):** Judge image rebuilt and upgraded via `./scripts/deploy-tee.sh`. App ID: `0x865104D466143234Cc503E9025CBe54a9131a51A`. Dashboard: [verify-sepolia.eigencloud.xyz](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A). Set `JUDGE_URL` in `.env` to the current Judge API base (from dashboard or existing endpoint) for E2E and listener.

---

## Agent-Mode E2E

Full agent-to-agent debate flow verified end-to-end:

1. **Open escrow** — Payer stakes ERC20 against payee
2. **Both agents submit** — `POST /submitArgument` for payer and payee
3. **Listener triggers verdict** — Polls `GET /dispute/:id`, calls `POST /judgeFromDispute`
4. **Judge evaluates** — LLM inference in TEE, EIP-712 signed verdict
5. **On-chain settlement** — `registerVerdict` → `settle` → winner receives payout

**Run it:**

```bash
JUDGE_URL=http://35.233.167.89:3001 ./scripts/e2e-agent-mode.sh
```

See [AGENT_INTEGRATION.md](AGENT_INTEGRATION.md) for agent integration details.

---

## Real-Data E2E (e2e-real.sh)

Real-data E2E verified with settlement: `./scripts/e2e-real.sh` runs listener (agent mode) → open-escrow → submit-two-arguments → Judge verdict → registerVerdict → settle.

**Latest verified success (Base Sepolia):**
- disputeId: `0xbdab307b7eb0a833a0afa294416c4b9d646b719969f04e21b4810aa9bec08766`
- registerVerdict tx: [`0xec78d6824811344506691b1320755f02176899b0dee9dd35eaf81594c9cde3f8`](https://sepolia.basescan.org/tx/0xec78d6824811344506691b1320755f02176899b0dee9dd35eaf81594c9cde3f8)
- settle tx: [`0xac4019ed229feee8c8c5916f7a7729b5f60867f8b220fece997ea9b021ed12a0`](https://sepolia.basescan.org/tx/0xac4019ed229feee8c8c5916f7a7729b5f60867f8b220fece997ea9b021ed12a0)
- final state: `settled=true refunded=false`

Align repo `.env` with Judge TEE env (`VERDICT_REGISTRY_ADDRESS`, `POV_ESCROW_ADDRESS` same as `agent/judge/.env.tee`); otherwise `POST /submitArgument` returns `400 {"error":"escrow does not exist"}` (see [DEPLOYMENT.md](DEPLOYMENT.md)#troubleshooting).

---

## Frontend

React + Vite frontend for dispute resolution UI.

| Feature | Status |
|---------|--------|
| Dispute selector | ✅ |
| Argument submission | ✅ |
| Status display | ✅ |
| Verdict trigger | ✅ |
| Verdict display (scores + signature) | ✅ |

**Build verification:**

```bash
cd apps/frontend && npm run build
# ✓ built in ~700ms
```

**Run locally:**

```bash
cd apps/frontend
npm install
npm run dev
# http://localhost:5173
```

See [apps/frontend/README.md](../apps/frontend/README.md) for full documentation.

---

## On-Chain Reputation

PovReputation contract for tracking agent performance.

| Feature | Status |
|---------|--------|
| Success/failure tracking | ✅ |
| Score calculation (0-10000) | ✅ |
| Escrow integration | ✅ |
| 23 contract tests | ✅ Pass |

**Code:** `contracts/src/PovReputation.sol`
**Docs:** [REPUTATION.md](REPUTATION.md)

**Deployment status:** Code is complete and tested. Deployment is optional/TBD — can be deployed when product needs reputation tracking.

---

## ERC-8004 Registration

The Judge is registered as an ERC-8004 agent for discoverability on Base Sepolia:

| Property | Value |
|----------|-------|
| Agent ID | `84532:961` |
| Agent URI | `ipfs://bafkreicccppjd3mtqi7hpohulij7wsa5zhyywayaaljtzk62ccyvrtbaay` |
| Registration TX | [`0x9f02e25f58b3874d5b0c5b723e03b633b10ed0148e3bc8d1a686a6c71260463f`](https://sepolia.basescan.org/tx/0x9f02e25f58b3874d5b0c5b723e03b633b10ed0148e3bc8d1a686a6c71260463f) |
| TEE Wallet | `0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC` |

**Re-register (e.g. after redeploy):**

```bash
cd scripts && npm run register-judge
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for env requirements.
