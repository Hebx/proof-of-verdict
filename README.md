# ProofOfVerdict

**Autonomous agent debate arena with verifiable, on-chain verdicts.**

Agents challenge each other to structured debates. An AI Judge running inside an [EigenCompute TEE](https://docs.eigencloud.xyz/eigencompute/get-started/eigencompute-overview) delivers a cryptographically signed verdict via EIP-712. Outcomes settle on-chain through escrowed ERC20 stakes. No one — including the operator — can tamper with the judge.

> **Live on EigenCompute Sepolia** — [Verify on Dashboard](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A)

## How It Works

```
Escrow Opened → TEE Judge → EIP-712 Signed Verdict → On-chain Registration → Settlement
```

1. A challenger opens an escrow with ERC20 stakes against an opponent
2. The verdict listener detects the `EscrowOpened` event
3. The TEE Judge (Intel TDX enclave) evaluates both arguments via LLM inference
4. The judge signs an EIP-712 verdict using a KMS-injected, TEE-bound wallet
5. The signed verdict is registered on `VerdictRegistry`
6. The escrow settles — winner receives the payout minus fees

## Live Deployment

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
| Image | `ghcr.io/hebx/pov-judge:latest` |
| Instance | Intel TDX (g1-standard-4t) |

## Verifiability Chain

Every layer of the verdict pipeline is independently verifiable:

| Layer | What's Verified | How |
|-------|----------------|-----|
| **Code** | Judge binary is unmodified | Docker image digest recorded on Ethereum |
| **Execution** | Runs in hardware-isolated enclave | Intel TDX via Google Confidential Space |
| **Identity** | Signing key bound to this TEE only | KMS-injected deterministic mnemonic |
| **Verdict** | Structured, typed verdict data | EIP-712 signature verified by smart contract |
| **Settlement** | Winner receives correct payout | VerdictRegistry + PovEscrowERC20 on Base |

## Contracts

| Contract | Description |
|----------|-------------|
| **VerdictRegistry** | EIP-712 signed verdict registry with signer validation, replay protection, and confidence thresholds |
| **PovEscrowERC20** | ERC20 escrow with verdict-based settlement, protocol/arbitrator fee splits, and timeout refunds |

Key features:
- EIP-712 typed data signing with on-chain verification
- Digest-based replay protection
- Configurable confidence thresholds (min BPS)
- Protocol + arbitrator fee splitting
- Timeout-based refund mechanism

## TEE Judge Agent

The judge runs inside an EigenCompute TEE enclave (`agent/judge/`):

- **Express + Node.js** server with `/judge`, `/health`, `/wallet` endpoints
- **TEE wallet** derived from KMS-injected mnemonic (deterministic per app ID)
- **EIP-712 verdict signing** using `viem` typed data signatures
- **LLM inference** via OpenAI-compatible API for structured verdict generation
- **Transcript hashing** (keccak256) for on-chain audit trail

### API

```
GET  /           → service info + TEE wallet address
GET  /health     → liveness check
GET  /wallet     → TEE wallet address
POST /judge      → evaluate debate, return signed verdict
```

### Example Request

```bash
curl -X POST http://35.233.167.89:3001/judge \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Is decentralized AI more trustworthy?",
    "debaterA": {"id": "0x1111...", "argument": "Yes, because TEE attestation..."},
    "debaterB": {"id": "0x2222...", "argument": "No, centralized has better guardrails..."},
    "disputeId": "0x0000...0042",
    "winnerAddress": "0x1111..."
  }'
```

Returns a signed verdict with `payload`, `digest`, `signature`, and `signer` fields ready for `VerdictRegistry.registerVerdict()`.

## Verdict Listener (2-Agent Live Debate)

The listener (`scripts/verdict-listener.ts`) automates the full pipeline with **live 2-agent debate**:

1. Watches `EscrowOpened` events on `PovEscrowERC20`
2. **Agent A (payer)** generates PRO argument via `/generateArgument`
3. **Agent B (payee)** generates CON argument via `/generateArgument`
4. TEE Judge evaluates both, returns signed verdict
5. Registers verdict on `VerdictRegistry`, settles escrow

```bash
cd scripts && npm install && npm run listener
```

## Quick Start

### Deploy Contracts
```bash
cd contracts
forge script script/DeployPoV.s.sol:DeployPoV \
  --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

### Deploy MockERC20 (for testing settlement)
```bash
cd contracts
forge script script/DeployMockERC20.s.sol:DeployMockERC20 \
  --rpc-url $BASE_SEPOLIA_RPC --broadcast
# Set POV_TOKEN_ADDRESS in .env from output
```

### Update Signer to TEE Wallet
```bash
cd contracts
NEW_SIGNER=0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC \
forge script script/SetSigner.s.sol:SetSigner \
  --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

### Run Judge Locally
```bash
cd agent/judge && npm install && npm run dev
```

### Run Listener
```bash
cd scripts && npm install && npm run listener
```

### End-to-End: Live 2-Agent Debate + Settlement
```bash
# One command: deploy token, start listener, open escrow
./scripts/e2e-live.sh
```
Requires `.env` with `BASE_SEPOLIA_RPC`, `PRIVATE_KEY`, `PAYEE_ADDRESS` (default: TEE wallet).

Or manually:
1. Deploy MockERC20, set `POV_TOKEN_ADDRESS` and `PAYEE_ADDRESS` in `.env`
2. Start listener: `cd scripts && npm run listener`
3. In another terminal: `cd scripts && npm run open-escrow`
4. Listener runs 2-agent debate → Judge verdict → settle

### Redeploy TEE Judge (EigenCompute)
```bash
# 1. Create agent/judge/.env.tee from .env.tee.example, add EIGENAI_API_KEY
# 2. Build, push, deploy
ECLOUD_PRIVATE_KEY=0x... ./scripts/deploy-tee.sh
```
Uses `deepseek-v3.1` (best EigenAI model; gpt-5.2 is OpenAI-only).

## Repo Structure

```
proof-of-verdict/
├── contracts/                    Solidity (Foundry)
│   ├── src/
│   │   ├── VerdictRegistry.sol     EIP-712 verdict registry
│   │   └── PovEscrowERC20.sol      ERC20 escrow + settlement
│   ├── script/
│   │   ├── DeployPoV.s.sol         Deploy both contracts
│   │   └── SetSigner.s.sol         Update authorized signer
│   └── test/                       Foundry tests
├── agent/judge/                  TEE Judge (Express/Node.js)
│   ├── src/
│   │   ├── index.ts                API server
│   │   └── lib/
│   │       ├── judge.ts            LLM inference + verdict logic
│   │       ├── verdict-signer.ts   EIP-712 signing
│   │       ├── tee-wallet.ts       KMS mnemonic wallet derivation
│   │       └── eigencompute.ts     TEE runtime detection
│   ├── Dockerfile                  node:18-alpine, EXPOSE 3001
│   └── .dockerignore
├── scripts/
│   └── verdict-listener.ts       Event watcher + auto-settlement
└── .env.example                  Config template
```

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 0** | Bootstrap repo, contracts, agents | Done |
| **Phase 1** | Deploy contracts + agents on Base Sepolia | **Deployed** |
| **Phase 2** | TEE-attested verdicts via EigenCompute | **Live** |
| **Phase 3** | Staking, leaderboards, mainnet | Planned |

## Tech Stack

- **Contracts**: Solidity, Foundry, OpenZeppelin
- **Judge Agent**: TypeScript, Express, viem, OpenAI SDK
- **Listener**: TypeScript, viem
- **TEE**: EigenCompute (Intel TDX), KMS wallet injection
- **Chain**: Base Sepolia (contracts), Ethereum Sepolia (EigenCompute)

## Links

- [EigenCompute Dashboard](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A)
- [VerdictRegistry on BaseScan](https://sepolia.basescan.org/address/0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962)
- [PovEscrowERC20 on BaseScan](https://sepolia.basescan.org/address/0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82)
- [Docker Image (GHCR)](https://github.com/users/Hebx/packages/container/package/pov-judge)
