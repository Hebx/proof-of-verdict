# Phase 1 PRD: Agent0 Discoverability + Developer Experience

**Date:** 2025-02-21  
**Status:** Draft  
**Roadmap:** Adoption-first (Approach B)

---

## Executive Summary

Phase 1 focuses on **adoption** — making the ProofOfVerdict Judge discoverable via the Agent0 ecosystem and easy to integrate for builders. No contract changes. All work is off-chain: registration, SDK, examples, and docs.

---

## Research: Agent0 Ecosystem

### Agent0 SDK (agent0-sdk)

- **Repo:** [agent0lab/agent0-ts](https://github.com/agent0lab/agent0-ts)
- **Package:** `agent0-sdk` (npm)
- **Docs:** [sdk.ag0.xyz](https://sdk.ag0.xyz/docs)

**Key capabilities:**

| Feature | Description |
|---------|-------------|
| **Discovery** | `sdk.getAgent('chainId:agentId')` — returns AgentSummary with endpoints |
| **Search** | `sdk.searchAgents({ name, mcpTools, a2aSkills, chains, feedback })` |
| **Registration** | `agent.setMCP()`, `agent.setA2A()`, `agent.setWeb()` — advertise endpoints |
| **Multi-chain** | Base Sepolia (84532), Ethereum Sepolia, Base Mainnet, etc. |
| **Trust** | `agent.setTrust(reputation, cryptoEconomic, teeAttestation)` |

### ERC-8004 Registration File

Agents advertise endpoints in a registration file (IPFS or HTTP):

```json
{
  "services": [
    { "name": "web", "endpoint": "https://..." },
    { "name": "MCP", "endpoint": "https://...", "version": "..." },
    { "name": "A2A", "endpoint": "https://.../.well-known/agent-card.json" }
  ],
  "supportedTrust": ["reputation", "tee-attestation"]
}
```

### Watchtower (Reachability)

- **Repo:** [agent0lab/watchtower](https://github.com/agent0lab/watchtower)
- Probes `webEndpoint`, `mcpEndpoint`, `a2aEndpoint` weekly
- Posts on-chain feedback with `tag1=reachable`, `tag2=web|mcp|a2a`
- Treats 2xx/3xx/401/403 as reachable

### ProofOfVerdict Current State

| Item | Value |
|------|-------|
| Agent ID | `84532:961` |
| Chain | Base Sepolia (84532) |
| Registration | Via `register-judge-agent.ts` using `agent0-sdk` |
| MCP endpoint | Set to Judge URL — but TEE build has MCP disabled (REST only) |
| Primary API | REST: `/submitArgument`, `/judgeFromDispute`, `/dispute/:id` |

**Gap:** We advertise MCP, but TEE Judge exposes REST. Clients expecting MCP handshake will fail. We should advertise `web` as the REST base URL for REST-first clients.

---

## Goals

1. **Agent0 discoverability** — Integrators can discover the Judge via Agent0 SDK and get the correct REST base URL.
2. **Developer experience** — SDK improvements, runnable examples, and clear API docs so builders can integrate in minutes.

---

## Requirements

### R1: Agent0 Registration

| ID | Requirement | Acceptance |
|----|-------------|------------|
| R1.1 | Add `web` endpoint to registration | `agent.setWeb(JUDGE_URL)` in register-judge-agent.ts |
| R1.2 | Keep MCP endpoint for compatibility | MCP = Judge URL (Watchtower probes it; `/health` returns 200) |
| R1.3 | OASF skills/domains (optional) | Add `agent.addSkill()` for debate/judging taxonomy if available |
| R1.4 | Metadata includes REST capabilities | `capabilities: ["judge", "generateArgument", "submitArgument", "judgeFromDispute"]` |

### R2: PoV SDK — Discover Judge

| ID | Requirement | Acceptance |
|----|-------------|------------|
| R2.1 | `discoverJudge(chainId)` method | Uses agent0-sdk to resolve Judge by chain; returns base URL |
| R2.2 | Fallback to env/config | If discovery fails, use `JUDGE_URL` from options |
| R2.3 | Agent ID constant | Export `POV_JUDGE_AGENT_ID = '84532:961'` for Base Sepolia |

### R3: PoV SDK — Quality

| ID | Requirement | Acceptance |
|----|-------------|------------|
| R3.1 | Typed responses | `submitArgument` returns `{ ok: boolean; disputeId?: string; debaterId?: string; error?: string }` |
| R3.2 | Structured errors | Throw `ProofOfVerdictError` with `code`, `message`, `status?` |
| R3.3 | Optional retries | Configurable retry for transient failures (e.g. `fetch` 5xx) |
| R3.4 | Timeout support | Configurable `timeoutMs` for all Judge calls |

### R4: Examples

| ID | Requirement | Acceptance |
|----|-------------|------------|
| R4.1 | Minimal agent integration | `examples/minimal-agent/` — open escrow, submit args, poll result |
| R4.2 | disputeId derivation | `examples/derive-dispute-id/` — trade, SLA, payment conventions |
| R4.3 | Discover + integrate | Example showing `discoverJudge()` → `ProofOfVerdictAgent` |
| R4.4 | Runnable | Each example has README + `npm run` or `tsx` command |

### R5: API Documentation

| ID | Requirement | Acceptance |
|----|-------------|------------|
| R5.1 | OpenAPI spec | `docs/openapi.yaml` — all Judge endpoints, request/response schemas |
| R5.2 | Curl examples | Each endpoint has curl in docs/API.md |
| R5.3 | Error codes | Document 400, 404, 500 responses and error body shape |
| R5.4 | Discovery section | Add "Discovering the Judge" to docs/AGENT_INTEGRATION.md |

---

## Out of Scope (Phase 1)

- MCP server in TEE (deferred; REST is primary)
- A2A AgentCard (optional future)
- Watchtower deployment (Agent0 community runs it; we ensure endpoints are probe-able)
- Production hardening (Phase 2: Judge robustness)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Discovery works | `sdk.getAgent('84532:961')` returns Judge with `web` or `mcp` endpoint |
| Integration time | Builder can run minimal example in &lt; 10 min |
| API coverage | OpenAPI spec covers 100% of Judge REST endpoints |

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| agent0-sdk | ^1.5.x | Discovery, registration |
| Node.js | 18+ | Examples, SDK |
| Pinata JWT | — | IPFS for registration (existing) |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-------------|
| Agent0 SDK API changes | Pin version; monitor release notes |
| Watchtower doesn't scan Base Sepolia | Verify CHAINS config; document manual feedback |
| OASF has no "debate judge" skill | Use closest match or custom metadata |

---

## Appendix: Agent0 Projects Reference

| Project | Repo | Purpose |
|---------|------|---------|
| agent0-ts | [agent0lab/agent0-ts](https://github.com/agent0lab/agent0-ts) | TypeScript SDK |
| agent0-py | [agent0lab/agent0-py](https://github.com/agent0lab/agent0-py) | Python SDK |
| search-service | [agent0lab/search-service](https://github.com/agent0lab/search-service) | Semantic search for agents |
| watchtower | [agent0lab/watchtower](https://github.com/agent0lab/watchtower) | Reachability feedback |
| subgraph | [agent0lab/subgraph](https://github.com/agent0lab/subgraph) | ERC-8004 indexing |
| 8004.org | [eips.ethereum.org/EIPS/eip-8004](https://eips.ethereum.org/EIPS/eip-8004) | ERC-8004 spec |
