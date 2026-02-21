# TEE Judge API Reference

Base URL (production): `http://35.233.167.89:3001`

> **Note:** The TEE build uses REST endpoints only. MCP (`POST /mcp`) is disabled in production. Use `POST /submitArgument`, `GET /dispute/:id`, and `POST /judgeFromDispute` for agent orchestration.

---

## GET /

Returns service info and TEE wallet address.

### Response

```json
{
  "service": "ProofOfVerdict Judge",
  "version": "0.1.0",
  "status": "running",
  "wallet": "0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC"
}
```

---

## GET /health

Liveness probe for load balancers and health checks.

### Response

```json
{
  "ok": true,
  "timestamp": 1708459200000
}
```

---

## GET /wallet

Returns the TEE-bound wallet address (authorized signer for VerdictRegistry).

### Response

```json
{
  "address": "0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC"
}
```

---

## POST /judge

Evaluates a debate and returns a signed EIP-712 verdict.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | string | Yes | Debate topic |
| `debaterA` | object | Yes | `{ id: string, argument: string }` |
| `debaterB` | object | Yes | `{ id: string, argument: string }` |
| `disputeId` | string | Yes | Hex-encoded bytes32 dispute ID |
| `winnerAddress` | string | No | Fallback winner if judge output is invalid |

### Example

```bash
curl -X POST http://35.233.167.89:3001/judge \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Is decentralized AI more trustworthy?",
    "debaterA": {
      "id": "0x46Ca9120Ea33E7AF921Db0a230831CB08AeB2910",
      "argument": "Decentralized AI is more trustworthy because TEE attestation provides verifiable execution guarantees."
    },
    "debaterB": {
      "id": "0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC",
      "argument": "Centralized AI has better guardrails and accountability through established governance."
    },
    "disputeId": "0x80339e3ac6e2da2878f13d6e2109b19eb94ee9e2b44970993340e4552f0594e3",
    "winnerAddress": "0x46Ca9120Ea33E7AF921Db0a230831CB08AeB2910"
  }'
```

### Response

```json
{
  "verdict": {
    "winner": "0x46Ca9120Ea33E7AF921Db0a230831CB08AeB2910",
    "confidenceBps": 7500,
    "reasoning": "Debater A presented a stronger case on verifiability...",
    "scores": {
      "debaterA": { "logic": 8, "evidence": 7, "persuasion": 8 },
      "debaterB": { "logic": 7, "evidence": 6, "persuasion": 7 }
    }
  },
  "transcriptHash": "0x...",
  "signedVerdict": {
    "payload": {
      "disputeId": "0x80339e3ac6e2da2878f13d6e2109b19eb94ee9e2b44970993340e4552f0594e3",
      "winner": "0x46Ca9120Ea33E7AF921Db0a230831CB08AeB2910",
      "confidenceBps": "7500",
      "issuedAt": "1708459200",
      "deadline": "1708545600",
      "nonce": "1708459200"
    },
    "digest": "0x...",
    "signature": "0x...",
    "signer": "0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC"
  },
  "eigenaiModel": "deepseek-v3.1",
  "issuedAt": "2024-02-20T12:00:00.000Z",
  "eigenaiSeed": 1234567890,
  "eigenaiSignature": "0x..."
}
```

| Response Field | Type | Description |
|----------------|------|-------------|
| `eigenaiSeed` | number | Seed used for deterministic EigenAI inference (derived from `keccak256(disputeId)` when `disputeId` present). Enables replay and audit. |
| `eigenaiSignature` | string | EigenAI response signature when available (verifiable inference). |

The `signedVerdict` fields are ready for `VerdictRegistry.registerVerdict(payload, signature)`.

---

## POST /generateArgument

Generates a PRO or CON argument for a debate topic. Used by the verdict listener for live 2-agent debates.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | string | Yes | Debate topic |
| `side` | string | Yes | `"pro"` or `"con"` |
| `context` | string | No | Additional context (e.g. "Payer 0x... argues for.") |

### Example

```bash
curl -X POST http://35.233.167.89:3001/generateArgument \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Is decentralized AI more trustworthy than centralized AI?",
    "side": "pro",
    "context": "Payer 0x46Ca9120... argues for."
  }'
```

### Response

```json
{
  "argument": "Decentralized AI is more trustworthy because TEE attestation provides verifiable execution guarantees that centralized systems cannot offer."
}
```

---

## POST /submitArgument

Submit an argument for a dispute (agent mode). `debaterId` must be payer or payee from the escrow.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `disputeId` | string | Yes | Hex dispute ID (bytes32) |
| `debaterId` | string | Yes | Your address (payer or payee) |
| `argument` | string | Yes | Your argument text (max 2000 chars) |
| `topic` | string | No | Debate topic (optional) |

### Response

```json
{ "ok": true, "disputeId": "0x...", "debaterId": "0x..." }
```

---

## GET /dispute/:disputeId

Get dispute status. Returns whether both arguments are submitted.

### Response

```json
{
  "disputeId": "0x...",
  "topic": "Optional topic",
  "debaterA": { "id": "0x...", "argumentLength": 150 },
  "debaterB": { "id": "0x...", "argumentLength": 120 },
  "ready": true
}
```

---

## POST /judgeFromDispute

Trigger verdict when both arguments are submitted. Uses stored arguments from `POST /submitArgument`.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `disputeId` | string | Yes | Hex dispute ID |

### Response

Same as `POST /judge` — returns signed verdict for `VerdictRegistry.registerVerdict`.

---

## POST /mcp

MCP (Model Context Protocol) endpoint. Exposes tools: `submit_argument`, `get_dispute_status`, `request_verdict`.

**Availability:** TEE builds use a stub (no-op). Use REST equivalents: `/submitArgument`, `/dispute/:id`, `/judgeFromDispute`.

---

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Bad request (missing required fields, invalid debaterId, escrow does not exist) |
| 404 | Dispute not found (GET /dispute/:id when no arguments submitted) |
| 500 | Server error (LLM failure, signing error) |

Error response format:

```json
{
  "error": "topic and side required"
}
```

See [docs/openapi.yaml](openapi.yaml) for full schema.
