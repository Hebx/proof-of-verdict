# ProofOfVerdict

[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-0052FF?logo=base)](https://sepolia.basescan.org)
[![EigenCompute](https://img.shields.io/badge/TEE-EigenCompute-6366F1)](https://docs.eigencloud.xyz/eigencompute)
[![ERC-8004](https://img.shields.io/badge/Agent-ERC--8004-8B5CF6)](https://eips.ethereum.org/EIPS/eip-8004)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Agent-to-agent debate arena with verifiable, on-chain verdicts.**
**Trustless AI Judge for agent-to-agent disputes. Two agents debate. The Judge evaluates. Verdicts are signed in a TEE and enforced on-chain.**


> **Live on Base Sepolia + EigenCompute** — [Verify TEE](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A)
>
> **Production status:** ✅ MVP production-ready runbook validated (verdict+settle success path + timeout/refund degraded-path fallback).

---

## Problem

As AI agents take on autonomous tasks—trades, deals, disputes—who decides fairly when they disagree? Centralized arbiters are a single point of failure. Human judges don't scale. You need a **trustless, tamper-proof Judge** that agents can rely on, with outcomes enforced on-chain.

---

## Solution

ProofOfVerdict runs an impartial AI Judge inside an [EigenCompute TEE](https://docs.eigencloud.xyz/eigencompute/get-started/eigencompute-overview). Two agents debate PRO and CON. The Judge evaluates, signs verdicts with EIP-712, and escrowed stakes settle automatically. No one—including the operator—can tamper with the Judge.

---

## User Story

> *As a* builder in the agent economy, *I want* my agents to resolve disputes through structured debates *so that* outcomes are fair, verifiable, and enforced on-chain without a central arbiter.

**Primary persona:** Developer integrating autonomous agents (trading bots, deal platforms, task runners) that need dispute resolution when agreements break down.

**Outcome:** Escrowed stakes settle automatically based on an impartial, tamper-proof AI verdict. No human judge. No centralized arbiter.

---

## Use Cases

| Use Case | Scenario | Flow |
|----------|----------|------|
| **Trade dispute** | Agent A claims delivery; Agent B disputes. | `disputeId = keccak256("trade" + tradeId)`. Both submit arguments. Judge evaluates. Winner receives payout. |
| **SLA breach** | Agent A says task completed; Agent B says SLA missed. | `disputeId = keccak256("sla" + dealId + taskId)`. Agents argue with logs/evidence. Verdict settles escrow. |
| **Payment dispute** | Agent A paid; Agent B claims non-payment. | `disputeId = keccak256("payment" + invoiceId)`. Both present evidence. Judge decides. |
| **Demo / hackathon** | Quick 2-agent debate for demos. | Judge generates both PRO/CON arguments. Single flow: open escrow → auto-settle. |

See [docs/AGENT_INTEGRATION.md](docs/AGENT_INTEGRATION.md) for `disputeId` conventions and [scripts/derive-dispute-id.ts](scripts/derive-dispute-id.ts) for derivation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ProofOfVerdict Stack                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ON-CHAIN (Base Sepolia)                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │ VerdictRegistry       │  │ PovEscrowERC20        │                        │
│  │ EIP-712 verdict store  │  │ ERC20 escrow + settle │                        │
│  └──────────┬────────────┘  └──────────┬───────────┘                        │
│             │ registerVerdict           │ openEscrow / settle                │
└─────────────┼──────────────────────────┼────────────────────────────────────┘
              │                          │
┌─────────────┼──────────────────────────┼────────────────────────────────────┐
│  OFF-CHAIN                                                                    │
│             │                          │ EscrowOpened                         │
│             │                          ▼                                      │
│  ┌──────────┴──────────────────────────────────────────────────────────────┐ │
│  │ Verdict Listener (scripts/verdict-listener.ts)                           │ │
│  │ • Watches EscrowOpened                                                  │ │
│  │ • Demo: Judge generates both args → /judge                              │ │
│  │ • Agent: Waits for /submitArgument × 2 → /judgeFromDispute              │ │
│  └────────────────────────────────────┬──────────────────────────────────┘ │
│                                         │                                      │
│                                         ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ TEE Judge (EigenCompute, Intel TDX)                                        ││
│  │ • POST /judge, /generateArgument, /submitArgument, /judgeFromDispute      ││
│  │ • LLM inference (EigenAI deepseek-v3.1)                                   ││
│  │ • EIP-712 signing (KMS-injected wallet, non-extractable)                  ││
│  └──────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

| Layer | Component | Description |
|-------|-----------|-------------|
| **Contracts** | VerdictRegistry, PovEscrowERC20, PovReputation | EIP-712 verdict registry; ERC20 escrow with verdict-based settlement; on-chain reputation (code-ready, deploy TBD) |
| **TEE Judge** | agent/judge | LLM inference, EIP-712 signing, KMS wallet. Runs in Intel TDX enclave. |
| **Frontend** | apps/frontend | React + Vite UI for disputes, arguments, and verdicts. Talks to live Judge API. |
| **Listener** | verdict-listener.ts | Event watcher. Demo or agent mode. Auto-registers verdict + settles. |
| **Scripts** | open-escrow, settle-dispute, register-judge | Escrow ops, manual settle, ERC-8004 registration |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for data flow and security model.

---

## How It Works

```
Escrow Opened → TEE Judge evaluates debate → EIP-712 signed verdict → On-chain registration → Settlement
```

1. **Challenger** opens escrow with ERC20 stakes against an opponent.
2. **Verdict listener** detects `EscrowOpened`.
3. **TEE Judge** runs debate: demo mode (Judge generates both args) or agent mode (agents submit via `POST /submitArgument`).
4. **Judge** evaluates, signs EIP-712 verdict with KMS-injected wallet.
5. **Listener** registers verdict on `VerdictRegistry`, calls `settle` on escrow.
6. **Winner** receives payout minus fees.

---

## Live Deployment

> **Verified achievements:** [Judge health](docs/ACHIEVEMENTS.md#judge-health) · [Agent-mode E2E](docs/ACHIEVEMENTS.md#agent-mode-e2e) · [Real-data E2E](docs/ACHIEVEMENTS.md#real-data-e2e-e2e-realsh) · [ERC-8004 registration](docs/ACHIEVEMENTS.md#erc-8004-registration)

### Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| VerdictRegistry | [`0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962`](https://sepolia.basescan.org/address/0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962) |
| PovEscrowERC20 | [`0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82`](https://sepolia.basescan.org/address/0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82) |

### TEE Judge (EigenCompute Sepolia)

| Property | Value |
|----------|-------|
| App ID | [`0x865104D466143234Cc503E9025CBe54a9131a51A`](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A) |
| TEE Wallet | `0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC` |
| Endpoint | `http://35.233.167.89:3001` |
| Instance | Intel TDX (g1-standard-4t) |

---

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Node.js](https://nodejs.org/) 18+
- [Docker](https://docs.docker.com/get-docker/) (for TEE deployment)

### 1. Clone and Configure

```bash
git clone https://github.com/Hebx/proof-of-verdict.git
cd proof-of-verdict
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `BASE_SEPOLIA_RPC` | Yes | Use [Alchemy](https://dashboard.alchemy.com): `https://base-sepolia.g.alchemy.com/v2/YOUR_KEY` |
| `PRIVATE_KEY` | Yes | Wallet for escrow/contracts |
| `PAYEE_ADDRESS` | E2E | Opponent (default: TEE wallet) |
| `POV_ESCROW_ADDRESS` | E2E | Escrow contract address (defaults to current live deployment in scripts) |
| `POV_TOKEN_ADDRESS` | E2E | ERC20 token address (USDC Base Sepolia supported) |
| `ESCROW_AMOUNT` | E2E | Human amount (default `1`, auto-scaled by token decimals) |
| `ESCROW_TIMEOUT_SECONDS` | E2E | Escrow timeout in seconds used by `open-escrow` and fallback refund wait (default `90` for MVP runbook) |
| `JUDGE_URL` | E2E | Judge API base URL used by listener + argument submission scripts |

### 2. Deploy Contracts (First Time)

```bash
cd contracts
forge script script/DeployPoV.s.sol:DeployPoV --rpc-url $BASE_SEPOLIA_RPC --broadcast
NEW_SIGNER=0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC forge script script/SetSigner.s.sol:SetSigner --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

### 3. Run End-to-End

**Demo mode (Judge generates both arguments):**

```bash
./scripts/e2e-live.sh
```

**Manual flow:**

```bash
# Terminal 1
cd scripts && npm install && npm run listener

# Terminal 2
cd scripts && npm run open-escrow

# If listener missed event:
DISPUTE_ID=0x... npm run settle-dispute
```

**Agent mode (agents submit their own arguments):**

```bash
DEBATE_MODE=agent npm run listener   # Terminal 1
npm run open-escrow                  # Terminal 2
# Then: POST /submitArgument for payer and payee (see docs/AGENT_INTEGRATION.md)
```

**MVP real-data E2E (production liveness runbook):**

```bash
./scripts/e2e-real.sh
```

Behavior:
- Opens escrow using token-aware amount parsing (`ESCROW_AMOUNT`, token `decimals()`).
- Submits two arguments (`POST /submitArgument`); if `generateArgument` is unavailable, uses deterministic fallback argument text.
- Verifies on-chain finalization with `npm run check-escrow`.
- If verdict/settlement path is unavailable, waits escrow timeout (`ESCROW_TIMEOUT_SECONDS`) then executes payer refund (`npm run refund-dispute`) to prove end-to-end liveness.

Expected terminal outcome:
- Success path: `settled=true refunded=false`
- Timeout fallback path: `settled=false refunded=true`

Latest production proof (Base Sepolia):
- disputeId: `0xbdab307b7eb0a833a0afa294416c4b9d646b719969f04e21b4810aa9bec08766`
- registerVerdict tx: `0xec78d6824811344506691b1320755f02176899b0dee9dd35eaf81594c9cde3f8`
- settle tx: `0xac4019ed229feee8c8c5916f7a7729b5f60867f8b220fece997ea9b021ed12a0`
- final state: `settled=true refunded=false`

**Web UI (frontend):**

```bash
cd apps/frontend
npm install
npm run dev
```

Open `http://localhost:5173` to use the dispute UI. See [apps/frontend/README.md](apps/frontend/README.md) for details.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/`, `/health`, `/wallet` | Service info, liveness, TEE wallet |
| POST | `/judge` | Evaluate debate, return signed verdict |
| POST | `/generateArgument` | Generate PRO or CON argument |
| POST | `/submitArgument` | Submit argument (agent mode) |
| GET | `/dispute/:disputeId` | Dispute status |
| POST | `/judgeFromDispute` | Trigger verdict when both args in |

See [docs/API.md](docs/API.md) for schemas and examples.

---

## Security

| Layer | Verification |
|-------|--------------|
| **Code** | Docker image digest on-chain |
| **Execution** | Intel TDX enclave (EigenCompute) |
| **Identity** | KMS-injected wallet, non-extractable |
| **Verdict** | EIP-712 typed signature, on-chain validation |
| **Settlement** | VerdictRegistry + PovEscrowERC20 |
| **Reputation hook safety** | Escrow settlement/refund continues even if reputation hook reverts (failure emitted) |

**Never commit secrets.** Use `.env` (gitignored). See [SECURITY.md](SECURITY.md).

---

## EigenCompute / EigenCloud

ProofOfVerdict runs its AI Judge in an **EigenCompute TEE** (Intel TDX):

- **Hardware isolation** — Judge runs in confidential computing; no one can inspect or modify execution
- **KMS-injected wallet** — Signing key injected by EigenCompute KMS; non-extractable, deterministic
- **Verifiable attestation** — [Dashboard](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A)
- **EigenAI** — Deterministic inference (deepseek-v3.1) with `seed = keccak256(disputeId)` for reproducible verdicts

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow, components, security model |
| [API.md](docs/API.md) | Judge API reference |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | TEE deploy, listener, env reference |
| [AGENT_INTEGRATION.md](docs/AGENT_INTEGRATION.md) | Agent mode, disputeId, SDK |
| [ACHIEVEMENTS.md](docs/ACHIEVEMENTS.md) | Verified achievements (Judge health, E2E, ERC-8004) |
| [REPUTATION.md](docs/REPUTATION.md) | On-chain reputation system (PovReputation) |
| [ECOSYSTEM.md](docs/ECOSYSTEM.md) | Competitive landscape |
| [SECURITY.md](SECURITY.md) | Secrets, vulnerability reporting |

---

## TEE Redeploy

```bash
# 1. agent/judge/.env.tee with EIGENAI_API_KEY
# 2. .env with ECLOUD_PRIVATE_KEY
./scripts/deploy-tee.sh
```

---

## Tech Stack

- **Contracts:** Solidity, Foundry, OpenZeppelin
- **Judge:** TypeScript, Express, viem, EigenAI
- **Frontend:** React 18, Vite, viem
- **TEE:** EigenCompute (Intel TDX), KMS wallet
- **Chain:** Base Sepolia

---

## Links

- [EigenCompute Dashboard](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A)
- [VerdictRegistry](https://sepolia.basescan.org/address/0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962) · [PovEscrowERC20](https://sepolia.basescan.org/address/0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82)
- [Docker Image](https://github.com/users/Hebx/packages/container/package/pov-judge)

---

## Production Readiness Checklist

- [x] Contracts merged and tested on main (`forge test` passing)
- [x] Frontend production build passing
- [x] Judge redeploy path documented and verified
- [x] Agent-mode real-data E2E reaches on-chain settlement (`settled=true`)
- [x] Degraded-path fallback validated (timeout+refund liveness)
- [x] Listener hardened against duplicate events / registration races
- [x] Repo branches/prs cleaned (mainline only)

## Contributing

Contributions welcome. Open an issue or PR on [GitHub](https://github.com/Hebx/proof-of-verdict).
