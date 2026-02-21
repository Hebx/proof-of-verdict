# ProofOfVerdict x EigenCompute Design

Date: 2026-02-20

## Goal
Deploy Judge agent on EigenCompute TEE with EigenAI deterministic inference.

## Verifiability
- Code: Docker digest on-chain (EigenCompute)
- Inference: EigenAI deterministic LLM
- Signing: TEE-bound KMS mnemonic + EIP-712
- Settlement: VerdictRegistry + PovEscrowERC20

## Built
- Judge Server (Hono/Bun, /judge /wallet /health)
- TEE Wallet (viem, KMS MNEMONIC)
- Verdict Signer (EIP-712)
- EigenAI Client (OpenAI SDK)
- Dockerfile (linux/amd64, port 3001)

## Remaining
1. Complete Stripe billing
2. ecloud compute app deploy
3. Get TEE wallet address
4. setVerdictSigner on-chain
5. Verify on verify-sepolia.eigencloud.xyz

## Contracts
- VerdictRegistry: 0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962
- PovEscrowERC20: 0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82
