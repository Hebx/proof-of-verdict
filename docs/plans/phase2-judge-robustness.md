# Phase 2 — Judge Robustness

**Project:** ProofOfVerdict  
**Phase:** 2 — Judge Logic Hardening  
**Status:** Design Approved  
**Approach:** Strict Structured Validation (LLM selects winner, system enforces robustness)

---

## 🎯 Objectives

1. Enforce no-tie invariant (judge must always resolve to A or B)
2. Enforce minimum confidence threshold (>= 6000 BPS)
3. Ensure deterministic replay via seeded inference
4. Harden against malformed / adversarial LLM outputs
5. Introduce deterministic fallback logic
6. Improve auditability & telemetry

---

# 1️⃣ Strict Schema Validation Layer

After LLM JSON parsing, enforce:

- `winner ∈ {debaterA.id, debaterB.id}`
- `confidenceBps` is integer
- `confidenceBps >= MIN_CONFIDENCE`
- `scores` exists and contains both debaters
- Each score field (logic, evidence, persuasion) ∈ [1, 10]

If any validation rule fails → trigger deterministic fallback.

Add constant:

```ts
const MIN_CONFIDENCE = 6000;
```

---

# 2️⃣ Deterministic Fallback Engine

Fallback is used when:

- Winner invalid
- Confidence below threshold
- Scores malformed
- JSON parse fails

### Fallback Logic

```ts
if (scores exist and valid) {
  scoreA = sum(scores.debaterA)
  scoreB = sum(scores.debaterB)

  if (scoreA !== scoreB) {
    winner = scoreA > scoreB ? A : B
  } else {
    winner = tieBreaker(disputeId)
  }
} else {
  winner = tieBreaker(disputeId)
}
```

### Tie Breaker

```ts
const bit = keccak(disputeId) % 2
winner = bit === 0 ? A : B
```

Deterministic, replay-safe, auditable.

### Confidence During Fallback

```ts
confidenceBps = MIN_CONFIDENCE
```

---

# 3️⃣ Prompt Hardening Improvements

Enhance prompt with:

- Explicit winner constraint
- Explicit confidence range constraint
- Explicit no-markdown instruction
- Explicit JSON-only instruction
- Example JSON block

Wrap debater IDs in strict delimiters to reduce injection risk.

---

# 4️⃣ Determinism & Audit Enhancements

Extend `JudgeResult` with:

```ts
validationStatus: "valid" | "fallback"
validationErrors?: string[]
scoreSummary?: {
  scoreA: number
  scoreB: number
}
```

This allows:

- Clear audit trail
- Replay debugging
- Transparency into fallback events

---

# 5️⃣ Escrow Validator Hardening

In `escrow-validator.ts`:

- Reject verdict if winner not payer/payee
- Reject if confidence < MIN_CONFIDENCE
- Verify signature integrity
- Verify disputeId matches expected

Escrow settlement must never rely on weak verdict.

---

# 6️⃣ Verdict Listener Enhancements

In `scripts/verdict-listener.ts`:

Log:

- validationStatus
- fallback usage
- scoreSummary

Warn if fallback triggered.

---

# ✅ Resulting System Properties

| Property | Status |
|----------|--------|
| No ties | ✅ |
| No weak verdict settlement | ✅ |
| Deterministic replay | ✅ |
| Fallback safety | ✅ |
| Audit transparency | ✅ |
| Minimal architectural change | ✅ |

---

# 📦 Files Impacted

- `agent/judge/src/lib/judge.ts`
- `agent/judge/src/lib/escrow-validator.ts`
- `scripts/verdict-listener.ts`

---

# 🔐 Security Considerations

- No re-execution allowed during fallback (preserve determinism)
- Seed derived strictly from `disputeId`
- No external entropy
- No model temperature > 0

---

# 🚀 Phase 2 Completion Criteria

- All validation enforced
- Deterministic fallback implemented
- Escrow refuses low-confidence verdict
- Replay produces identical result
- Telemetry logs fallback events

---

**Next Step:** Generate implementation plan (no coding until executed under separate approval).