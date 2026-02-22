# Deployment Guide

This guide covers deploying ProofOfVerdict to Base Sepolia and EigenCompute.

## Overview

| Component | Where | Purpose |
|-----------|-------|---------|
| VerdictRegistry | Base Sepolia | On-chain verdict registry |
| PovEscrowERC20 | Base Sepolia | ERC20 escrow contract |
| TEE Judge | EigenCompute Sepolia | AI Judge in Intel TDX enclave |
| Verdict Listener | Your infra | Event watcher + settlement automation |

**Prerequisites:** Foundry, Node.js 18+, Docker. Use an [Alchemy](https://dashboard.alchemy.com) RPC for reliable event subscriptions.

---

## 1. Smart Contracts (Base Sepolia)

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Wallet with Base Sepolia ETH for gas
- RPC URL — **use Alchemy** for production: `https://base-sepolia.g.alchemy.com/v2/YOUR_KEY` ([dashboard](https://dashboard.alchemy.com)). Public RPCs may not support event subscriptions reliably.

### Deploy

```bash
cd contracts
forge script script/DeployPoV.s.sol:DeployPoV \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast
```

Save the deployed addresses and set them in `.env`:

```
VERDICT_REGISTRY_ADDRESS=0x...
POV_ESCROW_ADDRESS=0x...
```

### Set Authorized Signer

The VerdictRegistry only accepts verdicts signed by an authorized signer. Set it to the TEE wallet:

```bash
NEW_SIGNER=0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC \
  forge script script/SetSigner.s.sol:SetSigner \
  --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

### Deploy MockERC20 (Testing)

For E2E testing, deploy a test token:

```bash
forge script script/DeployMockERC20.s.sol:DeployMockERC20 \
  --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

Set `POV_TOKEN_ADDRESS` in `.env` from the output.

---

## 2. TEE Judge (EigenCompute)

### Prerequisites

- [EigenCloud CLI](https://docs.eigencloud.xyz/eigencompute/get-started/install-cli)
- EigenAI API key from [app.eigenai.com](https://app.eigenai.com)
- EigenCloud deployer key (for upgrades: must be the original deployer)

### Environment

Create `agent/judge/.env.tee` from `.env.tee.example`:

```bash
cp agent/judge/.env.tee.example agent/judge/.env.tee
```

Required variables:

| Variable | Description |
|----------|-------------|
| EIGENAI_API_KEY | EigenAI API key |
| EIGENAI_BASE_URL | https://app.eigenai.com/api/v1 |
| EIGENAI_MODEL | deepseek-v3.1 (recommended) |
| BASE_SEPOLIA_RPC | **Required for agent mode** — Alchemy RPC for `/submitArgument` escrow validation |

### Build and Deploy

```bash
# Set ECLOUD_PRIVATE_KEY in .env (EigenCloud deployer key)
./scripts/deploy-tee.sh
```

The script builds the Docker image, pushes to GHCR, and upgrades the app on EigenCompute.

**Note:** The image must be public. Set package visibility to Public in GitHub Packages settings.

### Verify

```bash
curl http://35.233.167.89:3001/health
curl http://35.233.167.89:3001/wallet
```

---

## 3. Verdict Listener

The listener runs off-chain and automates the settlement pipeline.

### Setup

```bash
cd scripts
npm install
```

### Configuration

Ensure `.env` in the project root has `BASE_SEPOLIA_RPC`, `PRIVATE_KEY`, and optionally `JUDGE_URL`, `DEBATE_TOPIC`.

### Run

```bash
npm run listener
```

---

### E2E with Real Data (USDC + Two Agents)

To run E2E with real token and agent-originated arguments:

1. Set in `.env`:
   - `POV_TOKEN_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e` (USDC Base Sepolia; get testnet USDC from Circle testnet faucet if needed).
   - `JUDGE_URL`, `BASE_SEPOLIA_RPC`, `PRIVATE_KEY`, `PAYEE_ADDRESS`.
2. Run: `./scripts/e2e-real.sh`
3. Flow: listener (agent mode) starts → escrow opens with USDC → two agents submit arguments via SDK (arguments from Judge generateArgument) → listener runs Judge and settles.

Real data means: real chain (Base Sepolia), real Judge (TEE), real token (USDC testnet), and arguments submitted via `POST /submitArgument` (no hardcoded strings in the E2E script).

---

## 4. settle-dispute (Manual Settlement)

When the verdict is already registered but the escrow was not settled (e.g. listener restarted), run:

```bash
cd scripts
DISPUTE_ID=0x... npm run settle-dispute
```

The script checks `verdictRegistered`. If true, it skips Judge + `registerVerdict` and calls `settle` directly.

---

## 5. ERC-8004 Agent Registration

Register the Judge as an ERC-8004 trustless agent (TEE + reputation) for Agent0 SDK discovery:

```bash
cd scripts
npm run register-judge
```

Requires `PINATA_JWT` in `.env` (get at [pinata.cloud](https://pinata.cloud)). The Judge MCP endpoint is published to IPFS and registered on-chain.

---

## 6. Environment Reference

### Root .env

| Variable | Required | Description |
|----------|----------|-------------|
| BASE_SEPOLIA_RPC | Yes | RPC URL |
| PRIVATE_KEY | Yes | Deployer/operator wallet |
| VERDICT_REGISTRY_ADDRESS | No | From DeployPoV output |
| POV_ESCROW_ADDRESS | No | From DeployPoV output |
| POV_TOKEN_ADDRESS | E2E | From DeployMockERC20 output |
| PAYEE_ADDRESS | E2E | Opponent address |
| DEBATE_TOPIC | No | Topic for 2-agent debate (e.g. single-quoted string) |
| JUDGE_URL | No | TEE Judge endpoint |
| ECLOUD_PRIVATE_KEY | TEE deploy | EigenCloud deployer key |
| PINATA_JWT | register-judge | Pinata JWT for ERC-8004 registration |

### agent/judge/.env.tee

| Variable | Required | Description |
|----------|----------|-------------|
| EIGENAI_API_KEY | Yes | EigenAI API key |
| EIGENAI_BASE_URL | No | Default: app.eigenai.com/api/v1 |
| EIGENAI_MODEL | No | Default: deepseek-v3.1 |

---

## Troubleshooting

### TEE upgrade fails: wallet does not own the app

Use the original deployer key that first deployed the Judge. A newly generated key cannot upgrade existing apps.

### Judge returns API key required

Ensure EIGENAI_API_KEY is set in .env.tee and redeploy with ./scripts/deploy-tee.sh.

### Listener does not detect EscrowOpened

Use an Alchemy RPC (`BASE_SEPOLIA_RPC`) — public RPCs often lack reliable `eth_newFilter` / `getLogs` support for `watchContractEvent`. Verify the listener is running before opening escrow. If events still fail, use `settle-dispute` manually.

### Settlement reverts

Verify VerdictRegistry signer is set to the TEE wallet. Ensure verdict winner is payer or payee.

### registerVerdict reverts with 0x51a9dbdb

This is `VerdictAlreadyRegistered`. The verdict was already registered (e.g. by the listener). Use `settle-dispute` to complete settlement; it will skip registration and call `settle` directly.

### submitArgument returns "escrow does not exist"

The Judge validates escrow on-chain using its own `POV_ESCROW_ADDRESS` and `BASE_SEPOLIA_RPC` (from `agent/judge/.env.tee` at deploy time). If your repo `.env` uses different contract addresses (e.g. a different escrow deployment), the Judge will not see that escrow. Use the same escrow/registry addresses the Judge was deployed with, or redeploy the Judge with your current contract addresses.
