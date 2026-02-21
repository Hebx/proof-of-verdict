# ProofOfVerdict — Architecture

## Overview

ProofOfVerdict is an agent-to-agent dispute resolution system. Two parties stake ERC20 in escrow, present arguments, and an AI Judge (running in a TEE) evaluates and signs a verdict. The verdict is registered on-chain and the escrow settles automatically.

---

## User Stories

| Persona | Story | Outcome |
|---------|-------|---------|
| **Agent economy builder** | I want my agents to resolve disputes through structured debates | Fair, verifiable, on-chain outcomes without a central arbiter |
| **Deal platform** | I want SLA breaches resolved automatically | Escrow settles based on TEE-attested verdict |
| **Trading bot operator** | I want trade disputes resolved when agents disagree | Deterministic verdict, replayable and auditable |
| **Researcher** | I want reproducible AI verdicts for audit | Same dispute → same verdict via deterministic seed |

---

## Use Cases

| Use Case | Description | Implementation |
|----------|-------------|-----------------|
| **Deterministic Verdicts** | Same dispute → same verdict for replay and audit | `seed = keccak256(disputeId)`; `eigenaiSeed` and `eigenaiSignature` in response |
| **Judge as ERC-8004 Agent** | Trustless agent discoverable via Agent0 SDK | TEE attestation + reputation; IPFS metadata |
| **Demo Mode** | Fully automated PRO vs CON for demos | Listener calls `/generateArgument` × 2, `/judge`, register, settle |
| **Agent Mode** | Agents submit their own arguments | `POST /submitArgument` × 2 → `POST /judgeFromDispute` → register, settle |

---

## Components

### 1. Smart Contracts (Base Sepolia)

**VerdictRegistry**
- Stores EIP-712 signed verdicts
- Only accepts signatures from authorized TEE wallet
- Replay protection via digest deduplication
- Configurable confidence thresholds (BPS)

**PovEscrowERC20**
- ERC20 escrow with verdict-based settlement
- Protocol + arbitrator fee splits
- Timeout refund (payer can reclaim if no verdict before timeout)

### 2. TEE Judge (EigenCompute)

Express server running in Intel TDX enclave.

| Endpoint | Description |
|----------|-------------|
| `POST /judge` | Evaluate debate, return signed EIP-712 verdict |
| `POST /generateArgument` | Generate PRO or CON argument (demo mode) |
| `POST /submitArgument` | Store argument from payer or payee (agent mode) |
| `GET /dispute/:disputeId` | Status: both arguments submitted? |
| `POST /judgeFromDispute` | Evaluate stored arguments, return verdict |

- **Wallet:** KMS-injected mnemonic, deterministic, non-extractable
- **LLM:** EigenAI (deepseek-v3.1)
- **Signing:** EIP-712 typed data, verified on-chain

### 3. Verdict Listener (Off-chain)

TypeScript watcher (`scripts/verdict-listener.ts`).

| Mode | `DEBATE_MODE` | Behavior |
|------|---------------|----------|
| **Demo** | `demo` (default) | Judge generates both args → `/judge` → register → settle |
| **Agent** | `agent` | Poll `GET /dispute/:id` until both submit → `/judgeFromDispute` → register → settle |

### 4. disputeId Conventions

Both parties must agree on `disputeId` before opening escrow.

| Use Case | Formula | Example |
|----------|---------|---------|
| Trade dispute | `keccak256("trade" + tradeId)` | `keccak256(toHex("trade" + "0xabc..."))` |
| SLA dispute | `keccak256("sla" + dealId + taskId)` | `keccak256(toHex("sla" + "deal123" + "task456"))` |
| Payment dispute | `keccak256("payment" + invoiceId)` | `keccak256(toHex("payment" + "inv-789"))` |

Use `scripts/derive-dispute-id.ts` or document the convention.

### 5. settle-dispute Script

Manual settlement when verdict is registered but escrow not settled (e.g. listener restarted). Skips Judge + `registerVerdict`, calls `settle` directly.

---

## Data Flow

### Demo Mode

```
EscrowOpened
     │
     ▼
Verdict Listener
     │
     ├──► POST /generateArgument (PRO)  ──► Judge
     ├──► POST /generateArgument (CON)  ──► Judge
     │
     ├──► POST /judge
     │         │
     │         ├─ LLM inference
     │         ├─ Transcript hash
     │         └─ EIP-712 sign (TEE wallet)
     │
     ├──► VerdictRegistry.registerVerdict()
     │
     └──► PovEscrowERC20.settle()
                 │
                 └─ ERC20 payout to winner
```

### Agent Mode

```
EscrowOpened
     │
     ▼
Verdict Listener (DEBATE_MODE=agent)
     │
     │  Agent A (payer)  ──► POST /submitArgument
     │  Agent B (payee)  ──► POST /submitArgument
     │
     ├──► Poll GET /dispute/:id until ready
     │
     ├──► POST /judgeFromDispute
     │         │
     │         ├─ LLM inference (stored args)
     │         └─ EIP-712 sign (TEE wallet)
     │
     ├──► VerdictRegistry.registerVerdict()
     │
     └──► PovEscrowERC20.settle()
```

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| **TEE isolation** | Judge runs in Intel TDX enclave; operator cannot inspect or modify |
| **KMS wallet** | Signing key injected by EigenCompute KMS, deterministic, non-extractable |
| **Docker digest** | Image hash on-chain for code audit |
| **EIP-712** | Structured verdict data; verified on-chain; prevents replay |
| **Replay protection** | VerdictRegistry rejects duplicate digests |
| **Confidence thresholds** | Contract enforces minimum confidence for verdict acceptance |
| **Escrow validation** | `submitArgument` validates debaterId is payer or payee via RPC |
