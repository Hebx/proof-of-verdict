# ProofOfVerdict — Architecture

## Use Cases

| Use Case | Description | Implementation |
|----------|-------------|----------------|
| **1. Deterministic Verdicts** | Same dispute → same verdict for replay and audit | `seed = keccak256(disputeId)` passed to EigenAI; `eigenaiSeed` and `eigenaiSignature` returned in Judge response |
| **2. Judge as ERC-8004 Agent** | Trustless agent discoverable via Agent0 SDK | Judge registered with TEE attestation + reputation; MCP endpoint for agent orchestration |
| **3. Live 2-Agent Debate** | Fully automated PRO vs CON → verdict → settlement | Listener calls `/generateArgument` × 2, `/judge`, `registerVerdict`, `settle` |

---

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

- `POST /judge` — Evaluate debate arguments via LLM, produce structured verdict, sign with EIP-712. Uses deterministic seed from `keccak256(disputeId)` for EigenAI inference.
- `POST /generateArgument` — Generate PRO or CON argument for a topic (used for live 2-agent debate)
- `GET /wallet` — Return TEE-bound wallet address
- `GET /health` — Liveness probe

Wallet derived from KMS-injected mnemonic (deterministic per EigenCompute app ID). No operator has access to the signing key. LLM inference via EigenAI (deepseek-v3.1). Response includes `eigenaiSeed` and `eigenaiSignature` when available for verifiable inference.

### 3. Verdict Listener (Off-chain)

TypeScript watcher (`scripts/verdict-listener.ts`) that automates the settlement pipeline. Supports two modes via `DEBATE_MODE`:

- **demo** (default): Calls `POST /generateArgument` × 2, then `POST /judge` — Judge generates both arguments.
- **agent**: Polls `GET /dispute/{disputeId}` until both agents submit via `POST /submitArgument`, then call `POST /judgeFromDispute`, register verdict, settle.

### 4. disputeId Conventions

For agent economy, `disputeId` should be derivable from business context so both parties agree:

| Use Case | Formula | Example |
|----------|---------|---------|
| Trade dispute | `keccak256("trade" + tradeId)` | `keccak256(toHex("trade" + "0xabc..."))` |
| SLA dispute | `keccak256("sla" + dealId + taskId)` | `keccak256(toHex("sla" + "deal123" + "task456"))` |
| Payment dispute | `keccak256("payment" + invoiceId)` | `keccak256(toHex("payment" + "inv-789"))` |

Use `scripts/derive-dispute-id.ts` or document the convention so both agents and coordinator agree.

### 5. settle-dispute Script

Manual settlement when the verdict is already registered (e.g. listener restarted). Checks `verdictRegistered`; if true, skips Judge + `registerVerdict` and calls `settle` directly.

## Data Flow

```
EscrowOpened event
        │
        ▼
 Verdict Listener
        │
        ├──► POST /generateArgument (TEE) × 2  — Agent A (PRO), Agent B (CON)
        │
        ├──► POST /judge (TEE)
        │         │
        │         ├─ LLM inference (evaluate both arguments)
        │         ├─ Transcript hash (keccak256)
        │         └─ EIP-712 sign (TEE wallet)
        │
        ├──► VerdictRegistry.registerVerdict()
        │
        └──► PovEscrowERC20.settle()
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
