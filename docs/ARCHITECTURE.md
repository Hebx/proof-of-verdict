# ProofOfVerdict — Architecture

## Components

### 1. Smart Contracts (Base Sepolia)

**VerdictRegistry** — On-chain registry for EIP-712 signed verdicts.
- Signer validation (only authorized TEE wallet can submit)
- Replay protection via digest deduplication
- Configurable confidence thresholds (BPS)

**PovEscrowERC20** — Escrow for staked ERC20 tokens.
- Verdict-based settlement (calls VerdictRegistry)
- Protocol + arbitrator fee splits
- Timeout refund mechanism

### 2. TEE Judge Agent (EigenCompute)

Express/Node.js server running inside an Intel TDX enclave on EigenCompute.

- `POST /judge` — Evaluate debate arguments via LLM, produce structured verdict, hash transcript, sign with EIP-712
- `GET /wallet` — Return TEE-bound wallet address
- `GET /health` — Liveness probe

Wallet derived from KMS-injected mnemonic (deterministic per EigenCompute app ID). No operator has access to the signing key.

### 3. Verdict Listener (Off-chain)

TypeScript watcher (`scripts/verdict-listener.ts`) that automates the settlement pipeline:
1. Subscribes to `EscrowOpened` events on PovEscrowERC20
2. Calls TEE Judge for signed verdict
3. Registers verdict on VerdictRegistry
4. Settles escrow (payout to winner)

### 4. Debater Agent (Planned)

LLM-backed argument generator for automated debates.

## Data Flow

```
EscrowOpened event
        │
        ▼
 Verdict Listener
        │
        ├──► POST /judge (TEE)
        │         │
        │         ├─ LLM inference
        │         ├─ Transcript hash (keccak256)
        │         └─ EIP-712 sign (TEE wallet)
        │
        ├──► VerdictRegistry.registerVerdict()
        │
        └──► PovEscrowERC20.settleEscrow()
                    │
                    └─ ERC20 payout to winner
```

## Security Model

- **TEE isolation** — Judge code runs in Intel TDX enclave; operator cannot inspect or modify execution
- **KMS wallet** — Signing key injected by EigenCompute KMS, deterministic and non-extractable
- **Docker digest on-chain** — Image hash recorded on Ethereum, enabling code audits
- **EIP-712 typed signing** — Structured verdict data prevents signature replay across contexts
- **Replay protection** — VerdictRegistry rejects duplicate digests
- **Confidence thresholds** — Contract enforces minimum confidence for verdict acceptance
