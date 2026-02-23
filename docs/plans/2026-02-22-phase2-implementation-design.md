# Phase 2 Implementation — Design Document

**Date:** 2026-02-22  
**Status:** Approved  
**Project:** ProofOfVerdict

---

## 1. Overview & Scope

**Goal:** Implement the Phase 2 Judge Robustness plan end-to-end and deploy it.

**Scope:**
1. OZ submodule migration — Replace vendored OpenZeppelin with git submodule; ensure `forge build` and `forge test` pass.
2. Judge robustness — Strict validation, deterministic fallback (MIN_CONFIDENCE 6000 BPS), `validationStatus` / `scoreSummary` in `judge.ts`.
3. Escrow validator hardening — Reject low-confidence verdicts and invalid winners before settlement.
4. Verdict listener telemetry — Log `validationStatus`, fallback usage, `scoreSummary`.
5. TEE Judge redeploy — Build, deploy to EigenCompute, verify health and E2E.

**Out of scope:** Phase 3 (frontend, reputation, x402); contract redeployment unless required.

**Success criteria:** `forge build` and `forge test` green; Judge deployed and responding; demo or agent-mode E2E passes.

---

## 2. OZ Submodule Migration

**Goal:** Replace vendored OpenZeppelin with git submodule; verify build and tests.

**Steps:**
1. Submodule setup — Run `git submodule update --init --recursive` if `.gitmodules` and submodule ref exist.
2. Remappings — Ensure `remappings.txt` and `foundry.toml` use `@openzeppelin/=lib/openzeppelin-contracts/`.
3. Imports — All Solidity imports use `@openzeppelin/contracts/...` (already in place).
4. OZ v5 compatibility — Keep `Ownable(msg.sender)` in constructors.
5. Verification — `forge clean && forge build -vvv` and `forge test` pass.

**Deliverable:** Green build and tests; commit as `chore: migrate OpenZeppelin to git submodule`.

---

## 3. Judge Robustness (`judge.ts`)

**Constants:** `const MIN_CONFIDENCE = 6000;`

**Validation (after JSON parse):**
- `winner ∈ {debaterA.id, debaterB.id}` (case-insensitive)
- `confidenceBps` integer and `>= MIN_CONFIDENCE`
- `scores` exists with both debaters; each field (logic, evidence, persuasion) ∈ [1, 10]
- If any fails → deterministic fallback

**Deterministic fallback:**
- If scores valid: `scoreA = sum(scores.debaterA)`, `scoreB = sum(scores.debaterB)`; if `scoreA !== scoreB` → winner by score; else → `tieBreaker(disputeId)`
- Else → `winner = tieBreaker(disputeId)`
- `tieBreaker(disputeId)`: `keccak256(disputeId) % 2 === 0 ? debaterA.id : debaterB.id`
- `confidenceBps = MIN_CONFIDENCE` when fallback used

**Extended `JudgeResult`:**
- `validationStatus: "valid" | "fallback"`
- `validationErrors?: string[]`
- `scoreSummary?: { scoreA: number; scoreB: number }`

**Prompt hardening:** Explicit winner constraint, confidence range 5000–10000, JSON-only, example block, delimited debater IDs.

---

## 4. Escrow Validator Hardening

**New function:** `validateVerdictForSettlement(disputeId, signedVerdict, escrowAddress?)`

**Checks:**
- Fetch escrow via `getEscrow(disputeId)`; `winner` is payer or payee
- `confidenceBps >= 6000`
- `signature` exists and non-empty
- `payload.disputeId === disputeId`

**Output:** `{ valid: boolean; error?: string }`

**Listener:** Call before `registerVerdict`; if invalid, log and skip settlement.

---

## 5. Verdict Listener Enhancements

- Call `validateVerdictForSettlement` before `registerVerdict`.
- Log `validationStatus`; if `"fallback"` → WARN.
- Log `scoreSummary` when present.
- Expect extended Judge response; treat missing fields as `"valid"` for backward compatibility.

---

## 6. Verification & TEE Redeploy

**Pre-redeploy:** `forge build`, `forge test` pass; update `DeterministicForkE2E` to `MIN_CONFIDENCE_BPS = 6000` if needed.

**Redeploy:** Build Judge Docker image; deploy via `./scripts/deploy-tee.sh`; verify `/health`; run E2E.

**Contract alignment:** If deployed `VerdictRegistry.minConfidenceBps < 6000`, call `setMinConfidenceBps(6000)` as owner.

---

## Decisions Locked

| Decision | Value |
|----------|-------|
| MIN_CONFIDENCE | 6000 BPS |
| OZ migration | Complete first, then Phase 2 code |
| TEE redeploy | Included in Phase 2 scope |
| Approach | Strict sequential |
