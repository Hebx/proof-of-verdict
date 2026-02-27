# ProofOfVerdict — PRD: What’s Missing

**Version:** 1.0  
**Date:** 2026-02-27  
**Purpose:** Single source of truth for product gaps. Use by Telegram (Phase 3c) and Discord (Phase 3b) for scope and integration.

**Repo:** `clawd/projects/proof-of-verdict` · **Remote:** `https://github.com/Hebx/proof-of-verdict.git`

---

## 1. Current State (Implemented)

| Area | Status | Notes |
|------|--------|--------|
| **Contracts** | Done | VerdictRegistry, PovEscrowERC20 on Base Sepolia (addresses in README) |
| **TEE Judge** | Done | EigenCompute (Intel TDX), `/judge`, `/generateArgument`, `/submitArgument`, `/judgeFromDispute`, `/dispute/:id` |
| **Listener** | Done | verdict-listener.ts — demo + agent mode, validateVerdictForSettlement, telemetry |
| **Scripts** | Done | open-escrow, settle-dispute, register-judge, e2e-live.sh, e2e-real.sh, e2e-agent-mode.sh |
| **SDK** | Done | `sdk/` — ProofOfVerdictAgent, submitArgument, E2E with two agents |
| **ERC-8004** | Done | Judge registered for discovery |
| **Docs** | Done | README, ARCHITECTURE, API, AGENT_INTEGRATION, DEPLOYMENT, ACHIEVEMENTS, ECOSYSTEM, SECURITY |

---

## 2. Channel Ownership

| Channel | Branch | Scope |
|---------|--------|--------|
| **Telegram** | `feat/phase3c-reputation` | Reputation (on-chain PovReputation + escrow integration, tests, docs) |
| **Discord** | `feat/phase3b-frontend-skeleton` | Frontend (dispute flow UI, Judge API integration, apps/frontend README) |

Do not cross into the other channel’s branch. Coordinate only via docs and main.

---

## 3. What’s Missing (Full PRD)

### 3.1 Phase 3c — Reputation (Telegram)

**Owner:** Telegram · **Branch:** `feat/phase3c-reputation`

| # | Requirement | Detail | Done? |
|---|-------------|--------|-------|
| R1 | **PovReputation contract** | On-chain reputation: score per agent (address), updatable on verdict settlement. | In progress (staged) |
| R2 | **Escrow integration** | PovEscrowERC20 (or listener) updates PovReputation when verdict is settled (winner/loser). | In progress |
| R3 | **Tests** | Forge tests for PovReputation and escrow integration; TDD where new behavior is added. | In progress |
| R4 | **Docs** | docs/REPUTATION.md or README section: how reputation works, how to query, how it’s updated. | No |
| R5 | **Verification** | `forge test` passes; no regressions. | Pending |

**Integration points:** VerdictRegistry (verdict result), PovEscrowERC20 (settle flow), verdict-listener (optional: call reputation update after settle).

**Deliverable:** PR to main: “Phase 3c: On-chain reputation (PovReputation + escrow)”.

---

### 3.2 Phase 3b — Frontend (Discord)

**Owner:** Discord · **Branch:** `feat/phase3b-frontend-skeleton`

| # | Requirement | Detail | Done? |
|---|-------------|--------|-------|
| F1 | **Dispute selection** | User can open or select a dispute (disputeId input). | Plan in phase3b-frontend.md |
| F2 | **Submit argument** | UI calls Judge `POST /submitArgument` (disputeId, debaterId, argument, topic?). | No |
| F3 | **Dispute status** | UI shows dispute state via `GET /dispute/:disputeId` (ready, debaterA, debaterB). | No |
| F4 | **Trigger judge** | Button/action calls `POST /judgeFromDispute` with disputeId. | No |
| F5 | **Verdict display** | Show verdict outcome (winner, confidence, summary) after judge returns. | No |
| F6 | **Env & README** | apps/frontend/.env.example (Judge URL), README: run, env vars, flow vs Judge API. | Partial |

**Integration points:** Judge API (base URL from env/README), existing contracts (no change).

**Deliverable:** PR to main: “Phase 3b: Frontend for disputes and verdicts”.

---

### 3.3 Phase 3a — PRD in Repo & Agent0 (Not Assigned to a Channel)

| # | Requirement | Detail | Done? |
|---|-------------|--------|-------|
| P1 | **docs/PRD.md in repo** | Single PRD on main. Content exists on `feat/phase3a-prd-agent0-integration` (PRD v0.1); merge or copy to main and add “What’s missing” (this doc) or link. | No (only on branch) |
| P2 | **Agent0 SDK integration** | Deeper integration: discovery, invocation from Agent0 beyond ERC-8004 registration. Branch `feat/phase1-agent0-dx` exists; status unclear. | No |

**Suggestion:** Human or future task: merge phase3a PRD into main; later assign Agent0 work to a channel.

---

### 3.4 Out of Scope for Current Phases

| Area | Status | Notes |
|------|--------|--------|
| **x402** | Not in scope | “Pay per dispute” / Judge API monetization; ecosystem research. |
| **KB/memory (Eigen)** | Not in PoV repo | `kb/eigen/`, EigenTribe research — see clawd/docs/plans/POV-EIGEN-AUDIT-PLAN.md; operational/KB work. |
| **Notion sync** | Operational | Glorian/Notion updates; not code in proof-of-verdict. |

---

## 4. Integration Summary

- **Reputation (Telegram):** New contract PovReputation; PovEscrowERC20 (and/or listener) updates it on settlement; VerdictRegistry unchanged.
- **Frontend (Discord):** Read-only to Judge API + optional read from chain (e.g. disputeId); no contract changes.
- **PRD:** docs/PRD.md on main = PRD v0.1 + reference to this “what’s missing” doc.

---

## 5. Success Criteria (High Level)

- **Phase 3c:** Reputation contract deployed (or deployment path documented), escrow flow updates reputation, tests green, docs clear.
- **Phase 3b:** User can complete one full flow: select dispute → submit both arguments → trigger judge → see verdict.
- **PRD:** Repo has docs/PRD.md on main describing product and current gaps.

---

## 6. References

- [POV-CHANNEL-PROMPTS.md](POV-CHANNEL-PROMPTS.md) — Telegram/Discord task prompts and skills
- [POV-STATE-AND-NEXT-PROMPT.md](POV-STATE-AND-NEXT-PROMPT.md) — State analysis and legacy Telegram prompt
- [AGENT_INTEGRATION.md](AGENT_INTEGRATION.md) — disputeId, agent mode, SDK
- [phase3b-frontend.md](plans/phase3b-frontend.md) — Frontend implementation plan
- [POV-EIGEN-AUDIT-PLAN.md](/home/openclaw/clawd/docs/plans/POV-EIGEN-AUDIT-PLAN.md) — KB, Eigen, Notion tasks (outside PoV repo)
