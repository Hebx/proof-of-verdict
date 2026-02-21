# Phase 1: Agent0 Discoverability + Developer Experience — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the ProofOfVerdict Judge discoverable via Agent0 SDK and easy to integrate for builders (SDK improvements, examples, API docs).

**Architecture:** Off-chain only. Update registration script to add `web` endpoint; extend PoV SDK with `discoverJudge()`, typed errors, retries; add runnable examples; add OpenAPI spec and discovery docs.

**Tech Stack:** agent0-sdk, TypeScript, viem, OpenAPI 3.0

**Reference:** [docs/plans/2025-02-21-phase1-agent0-dx-prd.md](2025-02-21-phase1-agent0-dx-prd.md)

---

## Task 1: Agent0 Registration — Add Web Endpoint and Metadata

**Files:** Modify `scripts/register-judge-agent.ts`

**Steps:**
1. After `await agent.setMCP(...)` add: `agent.setWeb(JUDGE_URL.replace(/\/$/, ""));`
2. Update metadata: `capabilities: ["judge", "generateArgument", "submitArgument", "judgeFromDispute"]`
3. Run `cd scripts && npm run register-judge` to verify
4. Commit: `feat(register): add web endpoint and full capabilities to ERC-8004 registration`

---

## Task 2: PoV SDK — ProofOfVerdictError and Constants

**Files:** Create `sdk/src/errors.ts`, Modify `sdk/src/index.ts`

**Steps:**
1. Create `ProofOfVerdictError` class with `code`, `message`, `status?`
2. Export `POV_JUDGE_AGENT_ID = "84532:961"`
3. Export error from index
4. Commit: `feat(sdk): add ProofOfVerdictError and POV_JUDGE_AGENT_ID`

---

## Task 3: PoV SDK — discoverJudge and createProofOfVerdictAgent

**Files:** Modify `sdk/package.json`, `sdk/src/index.ts`

**Steps:**
1. Add `agent0-sdk: ^1.5.3` to sdk dependencies
2. Add `discoverJudge(options)` — uses agent0-sdk getAgent, returns web or mcp URL
3. Add `createProofOfVerdictAgent(options)` — async factory that discovers Judge if judgeUrl not provided
4. Commit: `feat(sdk): add discoverJudge and createProofOfVerdictAgent factory`

---

## Task 4: PoV SDK — Timeout, Retries, Structured Errors

**Files:** Modify `sdk/src/index.ts`

**Steps:**
1. Add `fetchWithRetry` helper with timeout and retry on 5xx
2. Add `timeoutMs`, `retries` to options
3. Throw `ProofOfVerdictError` on HTTP errors in submitArgument, getDisputeStatus, requestVerdict
4. Commit: `feat(sdk): add timeout, retries, and ProofOfVerdictError on failures`

---

## Task 5: PoV SDK — Typed SubmitArgumentResult

**Files:** Modify `sdk/src/index.ts`

**Steps:**
1. Add `SubmitArgumentResult` interface with ok, disputeId?, debaterId?, error?
2. Update submitArgument return type
3. Commit: `feat(sdk): typed SubmitArgumentResult for submitArgument`

---

## Task 6: Example — Minimal Agent

**Files:** Create `examples/minimal-agent/package.json`, `index.ts`, `README.md`

**Steps:**
1. Example: submit both args, poll getDisputeStatus, call requestVerdict
2. Document: run open-escrow first, pass DISPUTE_ID
3. Commit: `feat(examples): add minimal-agent integration example`

---

## Task 7: Example — disputeId Derivation

**Files:** Create `examples/derive-dispute-id/package.json`, `index.ts`, `README.md`

**Steps:**
1. Show trade, SLA, payment conventions using viem keccak256
2. Link to AGENT_INTEGRATION.md
3. Commit: `feat(examples): add disputeId derivation example`

---

## Task 8: Example — Discover + Integrate

**Files:** Create `examples/discover-and-integrate/package.json`, `index.ts`, `README.md`

**Steps:**
1. Call discoverJudge, createProofOfVerdictAgent, getDisputeStatus
2. Document env: BASE_SEPOLIA_RPC, JUDGE_URL fallback
3. Commit: `feat(examples): add discover-and-integrate example`

---

## Task 9: OpenAPI Spec

**Files:** Create `docs/openapi.yaml`

**Steps:**
1. OpenAPI 3.0 for all Judge endpoints (/, /health, /wallet, /judge, /generateArgument, /submitArgument, /judgeFromDispute, /dispute/:id)
2. Request/response schemas, 400/404/500 error responses
3. Commit: `docs: add OpenAPI spec for Judge API`

---

## Task 10: API Docs — Errors and Curl

**Files:** Modify `docs/API.md`

**Steps:**
1. Add Error Responses section: `{ error: string }`, 400/404/500
2. Ensure curl for each endpoint
3. Commit: `docs: add error codes and curl examples to API`

---

## Task 11: AGENT_INTEGRATION — Discovering the Judge

**Files:** Modify `docs/AGENT_INTEGRATION.md`

**Steps:**
1. Add "Discovering the Judge" section with discoverJudge example
2. Mention Agent ID 84532:961
3. Commit: `docs: add Discovering the Judge section to AGENT_INTEGRATION`

---

## Task 12: README — Link Plan

**Files:** Modify `README.md`

**Steps:**
1. Add Phase 1 plan row to Documentation table
2. Commit: `docs: link Phase 1 implementation plan in README`

---

## Execution Handoff

**Two execution options:**

1. **Subagent-Driven (this session)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

2. **Parallel Session (separate)** — Open a new session with executing-plans, batch execution with checkpoints.

**Which approach?**

---

## Appendix: Code Snippets for Key Tasks

### Task 2: ProofOfVerdictError (sdk/src/errors.ts)

```ts
export class ProofOfVerdictError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ProofOfVerdictError";
    Object.setPrototypeOf(this, ProofOfVerdictError.prototype);
  }
}
```

### Task 3: discoverJudge (sdk/src/index.ts)

```ts
export async function discoverJudge(options: {
  chainId?: number;
  rpcUrl: string;
  fallbackUrl?: string;
}): Promise<string> {
  const chainId = options.chainId ?? 84532;
  try {
    const { SDK } = await import("agent0-sdk");
    const sdk = new SDK({ chainId, rpcUrl: options.rpcUrl });
    const agent = await sdk.getAgent(`${chainId}:961`);
    const url = agent?.web ?? agent?.mcp;
    if (url) return url.replace(/\/$/, "");
  } catch { /* discovery failed */ }
  if (options.fallbackUrl) return options.fallbackUrl;
  throw new ProofOfVerdictError(
    "Judge discovery failed; provide judgeUrl or fallbackUrl",
    "DISCOVERY_FAILED",
  );
}
```

### Task 4: fetchWithRetry

```ts
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const retries = opts.retries ?? 0;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (res.status >= 500 && i < retries) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      return res;
    } catch (e) {
      lastErr = e;
      if (i === retries) { clearTimeout(timeout); throw lastErr; }
    }
  }
  throw lastErr;
}
```
