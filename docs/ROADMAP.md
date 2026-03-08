# ProofOfVerdict — Roadmap

High-level product and technical roadmap. **Principle:** Things that work > theory; merge and verify before adding new scope.

---

## Phase 1 — Foundation ✅

**Status: Done (on main)**

| Item | Description |
|------|-------------|
| Contracts | VerdictRegistry, PovEscrowERC20 on Base Sepolia |
| TEE Judge | EigenCompute (Intel TDX), `/judge`, `/generateArgument`, `/submitArgument`, `/dispute/:id`, `/judgeFromDispute` |
| Listener | verdict-listener.ts — demo + agent mode |
| Scripts | open-escrow, settle-dispute, register-judge, e2e-live.sh, e2e-agent-mode.sh |
| SDK | ProofOfVerdictAgent, submitArgument, E2E with two agents |
| Docs | README, ARCHITECTURE, API, AGENT_INTEGRATION, DEPLOYMENT, ACHIEVEMENTS, SECURITY |
| ERC-8004 | Judge registered for discovery on Base Sepolia |

---

## Phase 2 — Judge robustness & real-data E2E

**Status: In progress (branches)**

| Item | Branch | Description |
|------|--------|-------------|
| Judge validation | feat/phase2-judge-robustness | MIN_CONFIDENCE, tieBreaker, validateVerdict, escrow-validator hardening, listener telemetry |
| Real-data E2E | feat/e2e-real-data | e2e-real.sh, submit-two-arguments, USDC Base Sepolia, two-agent E2E via SDK |

**Next steps:** Re-verify tests and E2E; merge to main in order (phase2 first, then e2e-real-data).

---

## Phase 3a — PRD & Agent0 integration

**Status: Roadmap / optional**

| Item | Description |
|------|-------------|
| PRD in repo | docs/PRD.md — scope, economic model, alignment with EigenTribe/ecosystem |
| Agent0 SDK | Deeper integration: discovery, invocation from Agent0 beyond ERC-8004 registration |

---

## Phase 3b — Frontend ✅ (branch ready)

**Status: Implemented on feat/phase3b-frontend-skeleton; pending merge**

| Item | Description |
|------|-------------|
| React/Vite app | Dispute selector, argument form, dispute status, verdict display, Judge trigger |
| Judge API | Uses live Judge base URL; POST /submitArgument, GET /dispute/:id, POST /judgeFromDispute |
| Docs | apps/frontend/README.md — run, env, flow |

**Next steps:** Verify build; open PR to main; merge; update README/ACHIEVEMENTS.

---

## Phase 3c — Reputation ✅ (branch ready)

**Status: Implemented on feat/phase3c-reputation; pending merge**

| Item | Description |
|------|-------------|
| PovReputation | On-chain reputation contract; score per agent; record outcome on settlement |
| Escrow integration | PovEscrowERC20 (or listener) updates reputation when verdict is settled |
| Tests | 23 tests (PovReputation + VerdictRegistry + PovEscrowERC20) |
| Docs | REPUTATION.md (or equivalent) |

**Next steps:** Verify tests; open PR to main; merge. Deployment of PovReputation is optional/TBD.

---

## Phase 4 — Merge & docs (current focus)

**Status: Execute now**

1. Merge **feat/phase3b-frontend-skeleton** → main (frontend).  
2. Merge **feat/phase3c-reputation** → main (reputation contract + tests).  
3. Re-verify and merge **feat/phase2-judge-robustness** → main.  
4. Re-verify and merge **feat/e2e-real-data** → main.  
5. Update **README** and **ACHIEVEMENTS.md** so they match main (frontend, reputation, e2e-real).

*See docs/plans/2026-02-27-whats-next.md for verification checklist and order.*

---

## Phase 5 — Deploy & ecosystem

**Status: After Phase 4**

| Item | Description |
|------|-------------|
| Deploy PovReputation | Deploy script; set escrow address; optional: wire listener/Judge to record outcomes |
| x402 / pay-per-judge | Research; “pay per judge call” or facilitator integration; not in current codebase |
| Agent0 / PRD | If needed: lock PRD in repo; deepen Agent0 integration |

---

## Timeline (indicative)

| When | Focus |
|------|--------|
| Now | Phase 4 — merge phase3b, phase3c; verify and merge phase2, e2e-real-data; update docs |
| Next | Phase 5 — deploy PovReputation if product needs it; document x402/Agent0 as roadmap |
| Later | Phase 3a (PRD, Agent0) if required for partners or funding |

---

## References

- **Plan (what’s next):** [docs/plans/2026-02-27-whats-next.md](plans/2026-02-27-whats-next.md)  
- **Gaps (PRD):** [docs/PRD-MISSING.md](PRD-MISSING.md)  
- **Channel prompts:** [docs/POV-CHANNEL-PROMPTS.md](POV-CHANNEL-PROMPTS.md)  
- **Achievements:** [docs/ACHIEVEMENTS.md](ACHIEVEMENTS.md)
