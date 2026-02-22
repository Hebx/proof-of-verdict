# ProofOfVerdict — Verified Achievements

Live verification of core ProofOfVerdict capabilities on Base Sepolia + EigenCompute.

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

Script path verified: `./scripts/e2e-real.sh` runs listener (agent mode) → open-escrow → submit-two-arguments. Full settlement requires the TEE Judge to use the **same** `POV_ESCROW_ADDRESS` (and `VERDICT_REGISTRY_ADDRESS`) as in the repo root `.env`; otherwise `POST /submitArgument` returns `400 {"error":"escrow does not exist"}` because the Judge validates escrow on-chain using its own env (see [DEPLOYMENT.md](DEPLOYMENT.md)#troubleshooting).

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
