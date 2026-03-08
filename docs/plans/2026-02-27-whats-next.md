# ProofOfVerdict — What’s Next (Plan)

**Date:** 2026-02-27  
**Principle:** Things that work >>> things that are theory or mocked.

---

## 1. Current Repo State

### Main branch (`main` @ `6e644b7`)

| Area | On main | Verified |
|------|---------|----------|
| **Contracts** | VerdictRegistry, PovEscrowERC20 | ✅ `forge test` passes (3 tests) |
| **TEE Judge** | agent/judge (EigenCompute), escrow-validator | ✅ Live at `http://35.233.167.89:3001` |
| **Scripts** | verdict-listener, open-escrow, settle-dispute, register-judge, e2e-live.sh, e2e-agent-mode.sh | ✅ E2E flow documented in ACHIEVEMENTS.md |
| **SDK** | `sdk/` ProofOfVerdictAgent | Present |
| **Frontend** | **None** — no `apps/` on main | N/A |
| **Reputation** | **None** — no PovReputation | N/A |
| **Judge robustness** | **None** — no MIN_CONFIDENCE, validateVerdict, tieBreaker | N/A |
| **e2e-real.sh** | **None** — only e2e-live.sh, e2e-agent-mode.sh | N/A |

### Feature branches (not merged)

| Branch | Commits ahead of main | What it adds | Verified |
|--------|------------------------|--------------|----------|
| **feat/phase3b-frontend-skeleton** | 2 | React/Vite app: dispute selector, argument form, status, verdict display, Judge trigger. Talks to live Judge API. | ✅ `npm run build` passes |
| **feat/phase3c-reputation** | 1 | PovReputation.sol + escrow integration, REPUTATION.md | ✅ `forge test` passes (23 tests) |
| **feat/phase2-judge-robustness** | Many | MIN_CONFIDENCE, tieBreaker, validateVerdict, escrow-validator hardening, listener telemetry | ⚠️ Not re-verified this session |
| **feat/e2e-real-data** | Many | e2e-real.sh, submit-two-arguments, USDC Base Sepolia, two-agent E2E via SDK | ⚠️ Docs say “verified”; not re-run this session |
| **feat/phase3a-prd-agent0-dx** | — | Agent0 SDK integration (status unclear) | ❓ |
| **feat/e2e-real-data-green** | — | Likely green variant of e2e-real-data | ❓ |

---

## 2. What’s Working vs Theory vs Mocked

### Working (evidence from this analysis)

- **Contracts (main):** VerdictRegistry + PovEscrowERC20 tests pass.
- **Contracts (phase3c):** PovReputation + escrow + VerdictRegistry tests pass (23 tests).
- **Frontend (phase3b):** Builds; uses live Judge base URL; no mocks in judgeApi.
- **Judge API:** Live at `http://35.233.167.89:3001`; health and flows documented in ACHIEVEMENTS.md.
- **Scripts on main:** e2e-live.sh, e2e-agent-mode.sh, listener, open-escrow, settle-dispute, register-judge exist and are documented.

### Not on main (theory until merged and re-verified)

- **Phase 2 judge robustness:** MIN_CONFIDENCE, validateVerdict, tieBreaker — only on branch; main Judge has no such logic.
- **e2e-real.sh:** USDC + two-agent E2E only on feat/e2e-real-data.
- **Frontend:** Only on feat/phase3b-frontend-skeleton.
- **Reputation:** Only on feat/phase3c-reputation; PovReputation not deployed.

### Unclear / to verify

- Whether **e2e-agent-mode.sh** or **e2e-real.sh** still pass against current Judge and RPC (env, token, addresses).
- Whether **phase2** branch tests and listener still pass after merge.
- **Agent0 / phase3a** integration status.

---

## 3. Recommended Order of Operations

Prioritize **merge and verify** of already-working branches so main reflects reality.

### Phase A — Merge working branches (no new features)

1. **Merge feat/phase3b-frontend-skeleton → main**
   - **Why:** Frontend builds and uses real Judge API; no mocks.
   - **Pre-merge:** Run `npm run build` in `apps/frontend` again.
   - **Post-merge:** Document in README that `apps/frontend` is the UI for dispute flow and verdict display.

2. **Merge feat/phase3c-reputation → main**
   - **Why:** 23 contract tests pass; adds PovReputation and docs.
   - **Pre-merge:** Run `forge test` on the branch again.
   - **Post-merge:** Reputation is **code-ready** but not yet deployed; add one line in README/DEPLOYMENT that PovReputation exists and deployment is optional/TBD.

3. **Re-verify and optionally merge feat/phase2-judge-robustness → main**
   - **Why:** Judge validation and fallback improve production robustness.
   - **Pre-merge:** Run Judge tests (if any), run listener + e2e-agent-mode.sh against Judge with phase2 code.
   - **Conflict risk:** phase2 and e2e-real-data both touch Judge/listener; merge phase2 first, then rebase e2e-real-data if needed.

4. **Re-verify and optionally merge feat/e2e-real-data → main**
   - **Why:** e2e-real.sh + USDC two-agent E2E is “real data” vs demo-only.
   - **Pre-merge:** Run `e2e-real.sh` (or equivalent) with required env (USDC, two agents); confirm settlement.
   - **Note:** May need rebase on main after phase2 merge.

### Phase B — Integration and docs (after Phase A)

5. **Single source of truth for “what’s live”**
   - Update README and ACHIEVEMENTS.md so they match main after merges (frontend, reputation contract, e2e-real if merged).
   - Add a short “Branches / PRs” or “Recent merges” note so the next reader knows what’s in main vs pending.

6. **Optional: PRD and Agent0 (phase3a)**
   - Only after Phase A is stable. Decide whether to add `docs/PRD.md` and deepen Agent0 integration; document as “roadmap” if not implemented.

### Phase C — Deploy and harden (only when needed)

7. **Deploy PovReputation** (if product needs it)
   - Deploy script, set escrow address, update README.
   - Wire listener or Judge to record outcomes if desired.

8. **x402 / pay-per-judge**
   - Treat as research/roadmap until there is a concrete use case; no code change in this plan.

---

## 4. Verification Checklist (before claiming “done”)

Use this before merging or closing PRs:

- [ ] **Contracts:** `cd contracts && forge test` — all pass.
- [ ] **Frontend:** `cd apps/frontend && npm run build` — succeeds.
- [ ] **Judge:** `curl -s http://35.233.167.89:3001/health` — returns `{"ok":true,...}`.
- [ ] **E2E (agent mode):** With correct `.env`, run `./scripts/e2e-agent-mode.sh` (or `e2e-real.sh` if merged) and confirm settlement or documented failure.
- [ ] **README/ACHIEVEMENTS:** Match current main (no frontend/reputation/e2e-real claims if not merged).

---

## 5. What to avoid

- **Don’t** add more “planned” or “theoretical” features to main before merging the working branches above.
- **Don’t** document “frontend” or “reputation” as “live” on main until they are merged and, where applicable, deployed.
- **Don’t** skip re-running the verification checklist after merges.

---

## 6. Summary

| Priority | Action | Rationale |
|----------|--------|-----------|
| 1 | Merge phase3b (frontend) → main | Working UI; builds; uses real Judge. |
| 2 | Merge phase3c (reputation) → main | All contract tests pass; code-ready. |
| 3 | Re-verify and merge phase2 (judge robustness) → main | Production hardening; verify then merge. |
| 4 | Re-verify and merge e2e-real-data → main | Real-data E2E; verify then merge. |
| 5 | Update README/ACHIEVEMENTS to match main | Single source of truth. |
| 6 | PRD / Agent0 / x402 | Roadmap only; after main is stable. |

**Next concrete step:** Open PR for `feat/phase3b-frontend-skeleton` → `main`, run the verification checklist, then merge. Repeat for phase3c, then phase2 and e2e-real-data after re-verification.
