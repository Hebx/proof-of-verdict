# ProofOfVerdict x EigenCompute — Integration Design

**Date**: 2026-02-20
**Status**: Implementation complete, deployment pending billing

## Goal

Deploy the ProofOfVerdict Judge agent as a fully verifiable service on EigenCompute, with EigenAI deterministic inference for verdicts.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              EigenCompute TEE (Intel TDX)                │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ProofOfVerdict Judge (Hono/Bun)                  │  │
│  │                                                   │  │
│  │  POST /judge                                      │  │
│  │    ├─ Call EigenAI (deterministic inference)       │  │
│  │    ├─ Parse verdict (winner, confidence, scores)   │  │
│  │    ├─ Hash transcript (keccak256)                 │  │
│  │    └─ Sign verdict (EIP-712 via TEE wallet)       │  │
│  │                                                   │  │
│  │  GET /wallet → TEE wallet address                 │  │
│  │  GET /health → liveness check                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  KMS → MNEMONIC (deterministic per app ID)              │
│  Docker digest → recorded on Ethereum (verifiable)      │
└─────────────────────────────────────────────────────────┘
         │                            │
         ▼                            ▼
  ┌──────────────┐          ┌──────────────────┐
  │   EigenAI    │          │  Base Sepolia     │
  │              │          │                  │
  │ gpt-oss-120b │          │ VerdictRegistry  │
  │ Deterministic│          │ PovEscrowERC20   │
  │ Inference    │          │                  │
  └──────────────┘          └──────────────────┘
```

## Verifiability Chain

| Layer | What's Verified | How |
|-------|----------------|-----|
| Code | Judge binary is unmodified | Docker digest on-chain (EigenCompute) |
| Inference | LLM output is reproducible | EigenAI deterministic execution |
| Signing | Verdict signed by TEE-bound key | KMS mnemonic + EIP-712 |
| Settlement | Winner gets paid | VerdictRegistry + PovEscrowERC20 |

## Components Built

1. **Judge Server** (`agent/judge/`) — Standalone Hono server with `/judge`, `/wallet`, `/health`
2. **TEE Wallet** (`tee-wallet.ts`) — Derives account from KMS `MNEMONIC` or `PRIVATE_KEY` fallback
3. **Verdict Signer** (`verdict-signer.ts`) — EIP-712 typed data signing via viem
4. **EigenAI Client** (`judge.ts`) — OpenAI SDK pointed at EigenAI endpoint
5. **Dockerfile** — `linux/amd64`, Bun alpine, port 3001, root user

## Deployment Steps (Remaining)

1. Complete Stripe billing subscription ($100 credit for new customers)
2. `ecloud compute app deploy --name pov-judge --instance-type g1-standard-4t`
3. Get TEE wallet address from `ecloud compute app info`
4. Call `VerdictRegistry.setVerdictSigner(teeWalletAddress)` on-chain
5. Verify on https://verify-sepolia.eigencloud.xyz/

## Contracts

| Contract | Address (Base Sepolia) |
|----------|----------------------|
| VerdictRegistry | `0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962` |
| PovEscrowERC20 | `0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82` |

## EigenCloud Challenge Target

Targeting EigenCloud Innovation Challenge ($10K) with the pitch:
"ProofOfVerdict: Autonomous agent debate arena with TEE-attested, deterministic verdicts — judges can't cheat, outcomes settle on-chain."
