# Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Phase 2 Judge Robustness (OZ migration, validation, fallback, telemetry, TEE redeploy) per approved design.

**Architecture:** Strict sequential: OZ submodule → judge.ts → escrow-validator.ts → verdict-listener.ts → tests → TEE redeploy. Each step verified before next.

**Tech Stack:** Foundry, TypeScript, Express, EigenCompute, viem.

**Design doc:** `docs/plans/2026-02-22-phase2-implementation-design.md`

---

## Task 1: OZ Submodule — Initialize and Verify

**Files:**
- Modify: `contracts/` (submodule at `contracts/lib/openzeppelin-contracts`)
- Verify: `contracts/remappings.txt` or `contracts/foundry.toml`

**Step 1: Initialize submodule**

Run from repo root:
```bash
cd /home/openclaw/clawd/projects/proof-of-verdict
git submodule update --init --recursive
```

Expected: Submodule cloned into `contracts/lib/openzeppelin-contracts`.

**Step 2: Verify remappings**

Ensure `contracts/foundry.toml` has:
```
remappings = [
  "@openzeppelin/=lib/openzeppelin-contracts/",
  "forge-std/=lib/forge-std/src/"
]
```

**Step 3: Build**

```bash
cd contracts
forge clean
forge build -vvv
```

Expected: `Compiler run successful!`

**Step 4: Run tests**

```bash
forge test
```

Expected: All tests pass (VerdictRegistry, PovEscrowERC20, DeterministicForkE2E).

**Step 5: Commit**

```bash
git add .gitmodules contracts/lib/openzeppelin-contracts
git status  # ensure vendored OZ deletions are staged
git commit -m "chore: migrate OpenZeppelin to git submodule"
```

---

## Task 2: Judge — Add MIN_CONFIDENCE and Validation Helpers

**Files:**
- Modify: `agent/judge/src/lib/judge.ts`

**Step 1: Add constant and tieBreaker**

At top of `judge.ts` (after imports), add:
```ts
const MIN_CONFIDENCE = 6000;

function tieBreaker(disputeId: Hex, debaterA: string, debaterB: string): string {
  const bit = Number(BigInt(keccak256(toHex(disputeId))) % 2n);
  return bit === 0 ? debaterA : debaterB;
}
```

**Step 2: Add validation function**

```ts
function validateVerdict(
  verdict: { winner?: string; confidenceBps?: number; scores?: Record<string, unknown> },
  debaterA: string,
  debaterB: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const a = debaterA.toLowerCase();
  const b = debaterB.toLowerCase();
  const w = String(verdict.winner ?? "").toLowerCase();
  if (w !== a && w !== b) errors.push(`winner must be ${a} or ${b}`);
  const conf = Number(verdict.confidenceBps);
  if (!Number.isInteger(conf) || conf < MIN_CONFIDENCE) errors.push(`confidenceBps must be integer >= ${MIN_CONFIDENCE}`);
  const scores = verdict.scores;
  if (!scores || typeof scores !== "object") errors.push("scores required");
  else {
    for (const key of ["debaterA", "debaterB"]) {
      const s = scores[key];
      if (!s || typeof s !== "object") errors.push(`scores.${key} required`);
      else for (const f of ["logic", "evidence", "persuasion"]) {
        const v = (s as Record<string, unknown>)[f];
        if (typeof v !== "number" || v < 1 || v > 10) errors.push(`scores.${key}.${f} must be 1-10`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
```

**Step 3: Add computeScore helper**

```ts
function sumScores(s: Record<string, unknown> | null | undefined): number {
  if (!s || typeof s !== "object") return 0;
  const logic = Number((s as Record<string, unknown>).logic) || 0;
  const evidence = Number((s as Record<string, unknown>).evidence) || 0;
  const persuasion = Number((s as Record<string, unknown>).persuasion) || 0;
  return logic + evidence + persuasion;
}
```

**Step 4: Commit**

```bash
git add agent/judge/src/lib/judge.ts
git commit -m "feat(judge): add MIN_CONFIDENCE, tieBreaker, validateVerdict, sumScores"
```

---

## Task 3: Judge — Apply Validation and Fallback in judgeDebate

**Files:**
- Modify: `agent/judge/src/lib/judge.ts`

**Step 1: After JSON parse, add validation and fallback**

Replace the block after `verdict = JSON.parse(cleaned)` (and the catch block) with logic that:
1. Calls `validateVerdict(verdict, input.debaterA.id, input.debaterB.id)`
2. If invalid: compute fallback winner via scores or tieBreaker; set `confidenceBps = MIN_CONFIDENCE`; set `validationStatus = "fallback"`
3. If valid: set `validationStatus = "valid"`
4. Compute `scoreSummary = { scoreA: sumScores(verdict.scores?.debaterA), scoreB: sumScores(verdict.scores?.debaterB) }`

**Step 2: Extend JudgeResult return**

Add to return object: `validationStatus`, `validationErrors` (when fallback), `scoreSummary`.

**Step 3: Run Judge locally (optional)**

```bash
cd agent/judge && npm run build
```

Expected: No TypeScript errors.

**Step 4: Commit**

```bash
git add agent/judge/src/lib/judge.ts
git commit -m "feat(judge): apply validation, deterministic fallback, validationStatus"
```

---

## Task 4: Escrow Validator — Add validateVerdictForSettlement

**Files:**
- Modify: `agent/judge/src/lib/escrow-validator.ts`

**Step 1: Add constant**

```ts
const MIN_CONFIDENCE = 6000;
```

**Step 2: Extend ABI for getEscrow**

Ensure getEscrow is in escrowAbi (already present).

**Step 3: Add validateVerdictForSettlement**

```ts
export async function validateVerdictForSettlement(
  disputeId: Hex,
  signedVerdict: { payload: { disputeId: Hex; winner: string; confidenceBps: string }; signature: Hex }
): Promise<{ valid: boolean; error?: string }> {
  try {
    const escrowAddr = process.env.POV_ESCROW_ADDRESS as Address;
    if (!escrowAddr) return { valid: false, error: "POV_ESCROW_ADDRESS not configured" };
    const escrow = await getClient().readContract({ address: escrowAddr, abi: escrowAbi, functionName: "getEscrow", args: [disputeId] });
    if (!escrow || escrow.payer === "0x0000000000000000000000000000000000000000") return { valid: false, error: "escrow does not exist" };
    const { payload, signature } = signedVerdict;
    const winner = payload.winner.toLowerCase();
    const payer = escrow.payer.toLowerCase();
    const payee = escrow.payee.toLowerCase();
    if (winner !== payer && winner !== payee) return { valid: false, error: "winner must be payer or payee" };
    const conf = parseInt(payload.confidenceBps, 10);
    if (!Number.isInteger(conf) || conf < MIN_CONFIDENCE) return { valid: false, error: `confidenceBps must be >= ${MIN_CONFIDENCE}` };
    if (!signature || signature.length < 2) return { valid: false, error: "signature required" };
    if (payload.disputeId !== disputeId) return { valid: false, error: "disputeId mismatch" };
    return { valid: true };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}
```

**Step 4: Commit**

```bash
git add agent/judge/src/lib/escrow-validator.ts
git commit -m "feat(escrow-validator): add validateVerdictForSettlement"
```

---

## Task 5: Verdict Listener — Validate and Log Telemetry

**Files:**
- Modify: `scripts/verdict-listener.ts`

**Step 1: Add getEscrow to escrow ABI**

Add to `escrowAbi` in verdict-listener.ts:
```ts
{
  type: "function",
  name: "getEscrow",
  inputs: [{ name: "disputeId", type: "bytes32" }],
  outputs: [{ type: "tuple", components: [
    { name: "token", type: "address" }, { name: "payer", type: "address" },
    { name: "payee", type: "address" }, { name: "amount", type: "uint256" },
    { name: "createdAt", type: "uint64" }, { name: "timeout", type: "uint64" },
    { name: "settled", type: "bool" }, { name: "refunded", type: "bool" },
  ] }],
  stateMutability: "view",
},
```

**Step 2: Add validateVerdictForSettlement helper (inline)**

```ts
const MIN_CONFIDENCE = 6000;
async function validateVerdictForSettlement(disputeId: Hex, signedVerdict: TeeJudgeResponse["signedVerdict"]): Promise<{ valid: boolean; error?: string }> {
  const escrow = await publicClient.readContract({ address: ESCROW_ADDRESS, abi: escrowAbi, functionName: "getEscrow", args: [disputeId] });
  if (!escrow || escrow.payer === "0x0000000000000000000000000000000000000000") return { valid: false, error: "escrow does not exist" };
  const { payload } = signedVerdict;
  const winner = payload.winner.toLowerCase();
  if (winner !== escrow.payer.toLowerCase() && winner !== escrow.payee.toLowerCase()) return { valid: false, error: "winner must be payer or payee" };
  const conf = parseInt(payload.confidenceBps, 10);
  if (!Number.isInteger(conf) || conf < MIN_CONFIDENCE) return { valid: false, error: `confidenceBps must be >= ${MIN_CONFIDENCE}` };
  if (!signedVerdict.signature || signedVerdict.signature.length < 2) return { valid: false, error: "signature required" };
  if (payload.disputeId !== disputeId) return { valid: false, error: "disputeId mismatch" };
  return { valid: true };
}
```

**Step 3: Before registerVerdict, call validation**

```ts
const val = await validateVerdictForSettlement(disputeId, judge.signedVerdict);
if (!val.valid) { console.error(`[PoV Listener] Verdict validation failed: ${val.error}`); return; }
```

**Step 4: Log validationStatus and scoreSummary**

```ts
const status = (judge as { validationStatus?: string }).validationStatus ?? "valid";
console.log(`[PoV Listener] verdict validationStatus: ${status}`);
if (status === "fallback") console.warn(`[PoV Listener] WARN: fallback used for disputeId ${disputeId}`);
const summary = (judge as { scoreSummary?: { scoreA: number; scoreB: number } }).scoreSummary;
if (summary) console.log(`[PoV Listener] scoreSummary:`, summary);
```

**Step 5: Commit**

```bash
git add scripts/verdict-listener.ts
git commit -m "feat(listener): validate verdict before settlement, log telemetry"
```

---

## Task 6: Tests — Align MIN_CONFIDENCE to 6000

**Files:**
- Modify: `contracts/test/DeterministicForkE2E.t.sol`

**Step 1: Update constant**

Change `MIN_CONFIDENCE_BPS = 7_000` to `MIN_CONFIDENCE_BPS = 6_000` if present.

**Step 2: Run tests**

```bash
cd contracts && forge test
```

Expected: All pass.

**Step 3: Commit**

```bash
git add contracts/test/DeterministicForkE2E.t.sol
git commit -m "test: align MIN_CONFIDENCE_BPS to 6000"
```

---

## Task 7: Verify Full Stack

**Step 1: Build and test**

```bash
cd scripts && npm install && npm run build
cd ../agent/judge && npm run build
cd ../contracts && forge test
```

Expected: All green.

**Step 2: Commit**

```bash
git add -A && git status
git commit -m "chore: verify Phase 2 build"  # if any uncommitted
```

---

## Task 8: TEE Judge Redeploy

**Files:**
- Use: `scripts/deploy-tee.sh`, `agent/judge/`

**Step 1: Verify env**

Ensure `.env` or `agent/judge/.env.tee` has:
- `EIGENAI_API_KEY`
- `ECLOUD_PRIVATE_KEY` (for EigenCompute deploy)

**Step 2: Deploy**

```bash
./scripts/deploy-tee.sh
```

Expected: Deploy succeeds; new Judge endpoint reported.

**Step 3: Health check**

```bash
curl http://<JUDGE_URL>/health
```

Expected: `{"ok":true,...}`

**Step 4: E2E**

```bash
./scripts/e2e-live.sh
```

Or manual: open escrow, run listener, verify settlement.

**Step 5: Update ACHIEVEMENTS**

If Judge URL changed, update `docs/ACHIEVEMENTS.md`.

---

## Task 9: Contract minConfidenceBps Alignment (if needed)

**Step 1: Check deployed registry**

```bash
cast call <VERDICT_REGISTRY> "minConfidenceBps()" --rpc-url $BASE_SEPOLIA_RPC
```

**Step 2: If < 6000, call setMinConfidenceBps**

```bash
cast send <VERDICT_REGISTRY> "setMinConfidenceBps(uint256)" 6000 --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY
```

(Requires owner.)

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-22-phase2-implementation.md`.

**Two execution options:**

1. **Subagent-Driven (this session)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** — Open a new session with executing-plans, batch execution with checkpoints

**Which approach?**
