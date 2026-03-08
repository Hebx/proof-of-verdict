# ProofOfVerdict — Verified Achievements

Live verification of core ProofOfVerdict capabilities on Base Sepolia + EigenCompute.

---

## What's Live (and What's Pending Merge)

| Component | Status | Evidence |
|-----------|--------|----------|
| TEE Judge | ✅ Live | Health endpoint responding |
| VerdictRegistry | ✅ Deployed | Base Sepolia |
| PovEscrowERC20 | ✅ Deployed | Base Sepolia |
| Frontend | ⏳ Pending merge (PR #3) | Code exists in PR #3; not yet on `main` |
| PovReputation | ⏳ Pending merge (PR #4) | Code/tests in PR #4; not yet on `main` |
| Agent-mode E2E | ✅ Verified | `e2e-agent-mode.sh` passes |
| ERC-8004 | ✅ Registered | Agent ID 84532:961 |

---

## Judge Health

| Check | Status |
|-------|--------|
| Endpoint | `http://35.233.167.89:3001/health` |
| Response | `{"ok":true,"timestamp":...}` |

The TEE Judge (EigenCompute, Intel TDX) is live and responding.

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

## Frontend (Pending Merge: PR #3)

React + Vite frontend for dispute resolution UI. This section documents pending-merge work and is not yet available on `main`.

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

Frontend documentation ships with PR #3 (pending merge).

---

## On-Chain Reputation (Pending Merge: PR #4)

PovReputation contract for tracking agent performance. This section documents pending-merge work and is not yet available on `main`.

| Feature | Status |
|---------|--------|
| Success/failure tracking | ✅ |
| Score calculation (0-10000) | ✅ |
| Escrow integration | ✅ |
| 23 contract tests | ✅ Pass |

**Code:** `contracts/src/PovReputation.sol`
**Docs:** Included with PR #4 (pending merge)

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
