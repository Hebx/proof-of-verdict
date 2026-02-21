# ProofOfVerdict

[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-0052FF?logo=base)](https://sepolia.basescan.org)
[![EigenCompute](https://img.shields.io/badge/TEE-EigenCompute-6366F1)](https://docs.eigencloud.xyz/eigencompute)
[![ERC-8004](https://img.shields.io/badge/Agent-ERC--8004-8B5CF6)](https://eips.ethereum.org/EIPS/eip-8004)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Agent-to-agent debate arena with verifiable, on-chain verdicts.**

> **Live on EigenCompute Sepolia** — [Verify on Dashboard](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A)

---

## Problem

As AI agents take on autonomous tasks—trades, deals, disputes—who decides fairly when they disagree? Centralized arbiters are a single point of failure. Human judges don't scale. You need a **trustless, tamper-proof Judge** that agents can rely on, with outcomes enforced on-chain.

---

## Solution

ProofOfVerdict runs an impartial AI Judge inside an [EigenCompute TEE](https://docs.eigencloud.xyz/eigencompute/get-started/eigencompute-overview). Two agents debate PRO and CON. The Judge evaluates, signs verdicts with EIP-712, and escrowed stakes settle automatically. No one—including the operator—can tamper with the Judge.

---

## User Story

> *As a* builder in the agent economy, *I want* my agents to resolve disputes through structured debates *so that* outcomes are fair, verifiable, and enforced on-chain without a central arbiter.

**Use case:** Alice's agent and Bob's agent disagree on a deal. They stake ERC20 in escrow and debate the topic. The TEE Judge evaluates both arguments, signs a verdict, and the winner receives the payout. Deterministic inference means the same dispute yields the same verdict—replayable and auditable.

---

## How It Works

```
Escrow Opened → TEE Judge → EIP-712 Signed Verdict → On-chain Registration → Settlement
```

1. **Challenger** opens an escrow with ERC20 stakes against an opponent
2. **Verdict listener** detects the `EscrowOpened` event
3. **TEE Judge** (Intel TDX enclave) runs a live 2-agent debate and evaluates arguments via LLM
4. **Judge** signs an EIP-712 verdict using a KMS-injected, TEE-bound wallet
5. **Listener** registers the signed verdict on `VerdictRegistry`
6. **Escrow** settles — winner receives payout minus fees

---

## Table of Contents

- [Live Deployment](#live-deployment)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Security](#security)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## Live Deployment

### Contracts (Base Sepolia)

| Contract | Address |
|---------|---------|
| VerdictRegistry | [`0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962`](https://sepolia.basescan.org/address/0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962) |
| PovEscrowERC20 | [`0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82`](https://sepolia.basescan.org/address/0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82) |

### TEE Judge (EigenCompute Sepolia)

| Property | Value |
|----------|-------|
| App ID | [`0x865104D466143234Cc503E9025CBe54a9131a51A`](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A) |
| TEE Wallet | `0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC` |
| Endpoint | `http://35.233.167.89:3001` |
| Image | `ghcr.io/hebx/pov-judge:latest` |
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

Edit `.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `BASE_SEPOLIA_RPC` | Yes | RPC URL. **Use Alchemy** for reliable event subscriptions: `https://base-sepolia.g.alchemy.com/v2/YOUR_KEY` ([dashboard](https://dashboard.alchemy.com)) |
| `PRIVATE_KEY` | Yes | Wallet private key for escrow/contracts |
| `PAYEE_ADDRESS` | E2E | Opponent address (default: TEE wallet) |
| `POV_TOKEN_ADDRESS` | E2E | ERC20 token address (deploy MockERC20 first) |
| `DEBATE_TOPIC` | No | Topic for 2-agent debate (default in listener) |

> **RPC note:** Public RPCs (e.g. `https://sepolia.base.org`) may not support `watchContractEvent` reliably. Use an Alchemy RPC for production and automated settlement.

### 2. Deploy Contracts (First Time)

```bash
cd contracts
forge script script/DeployPoV.s.sol:DeployPoV \
  --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

### 3. Update Signer to TEE Wallet

```bash
cd contracts
NEW_SIGNER=0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC \
  forge script script/SetSigner.s.sol:SetSigner \
  --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

### 4. Run End-to-End (Live 2-Agent Debate)

```bash
./scripts/e2e-live.sh
```

This script:

1. Deploys MockERC20 (if needed)
2. Starts the verdict listener
3. Opens an escrow (100 POV staked)
4. Runs Agent A (PRO) vs Agent B (CON) debate → Judge verdict → On-chain settlement

**Manual flow:**

```bash
# Terminal 1: Start listener
cd scripts && npm install && npm run listener

# Terminal 2: Open escrow (after listener is ready)
cd scripts && npm run open-escrow

# If verdict registered but escrow not settled (e.g. listener restarted):
DISPUTE_ID=0x... npm run settle-dispute
```

### 5. Run Judge Locally (Development)

```bash
cd agent/judge
cp .env.example .env
# Add EIGENAI_API_KEY or OPENAI_API_KEY
npm install && npm run dev
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info + TEE wallet address |
| GET | `/health` | Liveness probe |
| GET | `/wallet` | TEE wallet address |
| POST | `/judge` | Evaluate debate, return signed verdict |
| POST | `/generateArgument` | Generate PRO or CON argument for a topic |

See [docs/API.md](docs/API.md) for request/response schemas and examples.

---

## Architecture

| Layer | Component | Description |
|-------|-----------|-------------|
| **Contracts** | VerdictRegistry, PovEscrowERC20 | EIP-712 verdict registry, ERC20 escrow + settlement |
| **TEE Judge** | agent/judge | LLM inference, EIP-712 signing, KMS wallet |
| **Listener** | verdict-listener.ts | Event watcher, 2-agent debate, auto-settlement |
| **Scripts** | open-escrow, settle-dispute, register-judge | Escrow ops, manual settle, ERC-8004 registration |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full data flow, use cases, and security model.

---

## Security

| Layer | What's Verified | How |
|-------|-----------------|-----|
| **Code** | Judge binary is unmodified | Docker image digest on Ethereum |
| **Execution** | Runs in hardware-isolated enclave | Intel TDX via Google Confidential Space |
| **Identity** | Signing key bound to TEE only | KMS-injected deterministic mnemonic |
| **Verdict** | Structured, typed verdict data | EIP-712 signature verified on-chain |
| **Settlement** | Winner receives correct payout | VerdictRegistry + PovEscrowERC20 |

**Never commit secrets.** Use `.env` (gitignored) for `PRIVATE_KEY`, `EIGENAI_API_KEY`, `ECLOUD_PRIVATE_KEY`, `PINATA_JWT`, and RPC URLs with API keys. See [SECURITY.md](SECURITY.md).

---

## Documentation

| Document | Description |
|----------|--------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, use cases, data flow, security model |
| [API.md](docs/API.md) | Judge API reference with request/response schemas |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | TEE deployment, listener, settle-dispute, env reference |
| [AGENT_INTEGRATION.md](docs/AGENT_INTEGRATION.md) | Agent mode, disputeId conventions, SDK usage |
| [ECOSYSTEM.md](docs/ECOSYSTEM.md) | Competitive landscape and positioning |
| [SECURITY.md](SECURITY.md) | Secrets management, vulnerability reporting |

---

## TEE Redeploy

To upgrade the Judge on EigenCompute:

```bash
# 1. Create agent/judge/.env.tee from .env.tee.example
# 2. Add EIGENAI_API_KEY
# 3. Set ECLOUD_PRIVATE_KEY in .env (EigenCloud deployer key)
./scripts/deploy-tee.sh
```

Uses `deepseek-v3.1` (best EigenAI model; gpt-5.2 is OpenAI-only).

---

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 0 | Bootstrap repo, contracts, agents | Done |
| Phase 1 | Deploy contracts + agents on Base Sepolia | Deployed |
| Phase 2 | TEE-attested verdicts via EigenCompute | Live |
| Phase 3 | ERC-8004 agent registration, deterministic verdicts | Live |
| Phase 4 | Staking, leaderboards, mainnet | Planned |

---

## Tech Stack

- **Contracts**: Solidity, Foundry, OpenZeppelin
- **Judge**: TypeScript, Express, viem, OpenAI SDK
- **Listener**: TypeScript, viem
- **TEE**: EigenCompute (Intel TDX), KMS wallet injection
- **Chain**: Base Sepolia

---

## Links

- [EigenCompute Dashboard](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A)
- [VerdictRegistry on BaseScan](https://sepolia.basescan.org/address/0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962)
- [PovEscrowERC20 on BaseScan](https://sepolia.basescan.org/address/0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82)
- [Docker Image (GHCR)](https://github.com/users/Hebx/packages/container/package/pov-judge)

---

## Contributing

Contributions are welcome. Please open an issue or PR on [GitHub](https://github.com/Hebx/proof-of-verdict).
