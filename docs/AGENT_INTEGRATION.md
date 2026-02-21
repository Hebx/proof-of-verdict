# Agent Integration Guide

This guide explains how to integrate ProofOfVerdict into agent-to-agent dispute resolution flows.

---

## Overview

ProofOfVerdict supports two modes:

| Mode | Use Case | Flow |
|------|----------|------|
| **Demo** | Hackathons, quick testing | Judge generates both PRO/CON arguments. Single flow: open escrow → auto-settle. |
| **Agent** | Production agent economy | Each agent submits its own argument via `POST /submitArgument`. Listener waits for both, then triggers `POST /judgeFromDispute`. |

---

## disputeId Conventions

Both parties must agree on `disputeId` before opening escrow. Use a deterministic derivation:

| Use Case | Formula | Example (viem) |
|----------|---------|----------------|
| Trade dispute | `keccak256("trade" + tradeId)` | `keccak256(toHex("trade" + tradeId))` |
| SLA dispute | `keccak256("sla" + dealId + taskId)` | `keccak256(toHex("sla" + dealId + taskId))` |
| Payment dispute | `keccak256("payment" + invoiceId)` | `keccak256(toHex("payment" + invoiceId))` |

Run `scripts/derive-dispute-id.ts` to derive a disputeId from your context.

---

## Agent Flow (Agent Mode)

### 1. Agent A (Payer) Opens Escrow

```ts
// Use disputeId derived from deal/trade context
const disputeId = keccak256(toHex("trade" + tradeId));
await escrow.openEscrow(disputeId, token, payee, amount, timeout);
```

### 2. Both Agents Submit Arguments

Each agent calls the Judge with its argument:

```bash
curl -X POST $JUDGE_URL/submitArgument \
  -H "Content-Type: application/json" \
  -d '{
    "disputeId": "0x...",
    "debaterId": "0x...",
    "argument": "SLA was met: response time < 100ms at 14:32.",
    "topic": "Was the SLA for deal X fulfilled?"
  }'
```

Validation: `debaterId` must be payer or payee from the escrow. The Judge rejects invalid submissions.

### 3. Coordinator Triggers Judge

When both arguments are in, the listener (in agent mode) polls `GET /dispute/{disputeId}` until `ready: true`, then calls `POST /judgeFromDispute`. The Judge evaluates, signs, and the coordinator registers the verdict and settles.

---

## API Reference (Agent Endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/submitArgument` | Submit argument for a dispute. Body: `{ disputeId, debaterId, argument, topic? }` |
| GET | `/dispute/:disputeId` | Get dispute status. Returns `{ ready, debaterA, debaterB }` |
| POST | `/judgeFromDispute` | Trigger verdict when both args submitted. Body: `{ disputeId }` |

---

## Environment (Listener Agent Mode)

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBATE_MODE` | `demo` | `demo` or `agent` |
| `ARG_POLL_INTERVAL_MS` | 5000 | Poll interval when waiting for agent arguments |
| `ARG_DEADLINE_MS` | 3600000 | Timeout (1h) before giving up |

---

## SDK Usage

See `sdk/` for the ProofOfVerdict Agent SDK:

```ts
import { ProofOfVerdictAgent } from "proof-of-verdict/sdk";  // or path to sdk/src

const agent = new ProofOfVerdictAgent({ judgeUrl, rpcUrl, privateKey });
await agent.submitArgument(disputeId, myAddress, "My argument...");
```
