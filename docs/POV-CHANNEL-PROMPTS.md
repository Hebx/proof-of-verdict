# ProofOfVerdict — Channel Prompts (Telegram & Discord)

**Purpose:** Polished prompts for Telegram and Discord agents to work on **separate** ProofOfVerdict features, using the right skills, then commit, push, and open PRs.

**Repo:** `clawd/projects/proof-of-verdict` · **Remote:** `https://github.com/Hebx/proof-of-verdict.git`

---

## Recommended Skills (Use the Skill Tool)

Before coding, **invoke the Skill tool** to load and follow these skills. They apply to both channels; use the ones that fit your task.

| Skill | When to use | Why |
|-------|-------------|-----|
| **writing-plans** | Multi-step feature with no existing plan | Bite-sized tasks, exact paths, TDD steps, frequent commits. Save plan to `docs/plans/YYYY-MM-DD-<feature>.md`. |
| **executing-plans** | Implementing from an existing plan | Batch execution with checkpoints; verify after each batch. |
| **test-driven-development** | Any new logic (contracts, frontend, SDK) | Red → verify fail → Green → verify pass → Refactor. No production code without a failing test first. |
| **verification-before-completion** | Before claiming “done” or opening a PR | Run the real verification command (e.g. `forge test`, `npm run build`), read output, then claim. No “should work” without evidence. |
| **finishing-a-development-branch** | When implementation is complete and tests pass | Verify tests → present 4 options (merge / push+PR / keep / discard) → execute choice. Use for the final PR step. |
| **requesting-code-review** | After a major feature or before merge | Dispatch code-reviewer subagent with base/HEAD SHAs; fix Critical/Important before merging. |
| **using-git-worktrees** | When you need an isolated workspace (e.g. parallel to another agent) | One worktree per branch; avoids conflicts. Optional if you’re the only one touching the repo. |

**Best practice (from agent workflow research):** Scope one branch per channel, use TDD and verification before completion, and finish with **finishing-a-development-branch** so the human gets clear merge/PR options.

---

## Full PRD of What’s Missing

See **[docs/PRD-MISSING.md](PRD-MISSING.md)** for the full product gaps: current state, channel ownership (Telegram = 3c, Discord = 3b), reputation requirements (R1–R5), frontend requirements (F1–F6), PRD-in-repo and Agent0 (P1–P2), and out-of-scope items. Use it as the single source of truth when working on PoV.

---

## Prompt for **Telegram** (Phase 3c — Reputation)

Copy the block below into your **OpenClaw Telegram** channel.

```
CONTEXT: ProofOfVerdict repo: clawd/projects/proof-of-verdict (remote: https://github.com/Hebx/proof-of-verdict.git). You own the REPUTATION feature only (Phase 3c). The full PRD of what’s missing is in docs/PRD-MISSING.md — read it for scope and integration (Section 3.1 Reputation, Section 4 Integration).

SKILLS (invoke via Skill tool before coding):
- **test-driven-development** — Any new or changed contract/test logic: write failing test first, watch it fail, then implement.
- **verification-before-completion** — Before claiming done or opening a PR: run `forge test` (and any build/lint), read full output, then state results. No “should pass” without evidence.
- **finishing-a-development-branch** — When implementation is complete and tests pass: verify tests, then present the 4 options (merge / push+PR / keep / discard) and execute the chosen one.
- **requesting-code-review** — Optional but recommended before PR: request code review with base/HEAD SHAs and fix Critical/Important findings.

TASK — Phase 3c (Reputation), single branch, then PR:

1) BRANCH: Work only on **feat/phase3c-reputation**. If not on it: `git fetch origin && git checkout feat/phase3c-reputation`.

2) STATE: Staged changes exist: new `PovReputation.sol`, modified `PovEscrowERC20.sol` and escrow tests. Untracked: `docs/POV-STATE-AND-NEXT-PROMPT.md`, `scripts/README-opencode-bedrock.md`, `scripts/install-opencode-bedrock.sh`. Review these and the test suite.

3) YOUR WORK:
   - Complete the reputation feature so PovReputation and escrow integration are correct and covered by tests. Use TDD for any new behavior: failing test first, then minimal implementation.
   - Add or update docs (e.g. docs/REPUTATION.md or README section) describing how reputation works and how to use it.
   - Decide whether to add the untracked docs/scripts to this branch or leave them; document your choice.
   - Run `forge test` in contracts/ and fix any failures. Before claiming “done”, run verification and report actual output (verification-before-completion).

4) GIT & PR (mandatory):
   - Commit with a clear message (e.g. "feat(phase3c): PovReputation and escrow integration, docs").
   - Use **finishing-a-development-branch**: verify tests, then present options. Choose “Push and create a Pull Request”.
   - Push: `git push -u origin feat/phase3c-reputation`.
   - Open a PR against **main** on Hebx/proof-of-verdict. Title e.g. "Phase 3c: On-chain reputation (PovReputation + escrow)". Body: what was implemented, how to run tests, and how to verify.

Reply with: (1) what you changed, (2) test/verification output, (3) PR link or exact steps if you cannot open the PR yourself.
```

---

## Prompt for **Discord** (Phase 3b — Frontend)

Copy the block below into your **OpenClaw Discord** channel.

```
CONTEXT: ProofOfVerdict repo: clawd/projects/proof-of-verdict (remote: https://github.com/Hebx/proof-of-verdict.git). You own the FRONTEND feature only (Phase 3b).

SKILLS (invoke via Skill tool before coding):
- **writing-plans** — If the frontend work has multiple steps (dispute UI, submit argument, status, verdict): write a short implementation plan to docs/plans/ with bite-sized tasks, then execute (or use **executing-plans** if a plan already exists).
- **test-driven-development** — For any non-trivial frontend logic: failing test first, then implementation. For UI-only changes, manual verification is acceptable if you document the steps.
- **verification-before-completion** — Before claiming done or opening a PR: run build/test (e.g. `npm run build`, `npm test` if present), read output, then state results. No “should work” without evidence.
- **finishing-a-development-branch** — When implementation is complete and checks pass: verify, then present the 4 options and execute (choose “Push and create a Pull Request”).
- **requesting-code-review** — Optional before PR: request code review and fix Critical/Important issues.

TASK — Phase 3b (Frontend), single branch, then PR:

1) BRANCH: Work only on **feat/phase3b-frontend-skeleton**. If not on it: `git fetch origin && git checkout feat/phase3b-frontend-skeleton`.

2) STATE: Branch has a minimal React/Vite app in apps/frontend/ (app.tsx, main.tsx, etc.). Judge API: docs/API.md (e.g. POST /submitArgument, GET /dispute/:disputeId, POST /judgeFromDispute). Contracts and Judge on Base Sepolia + EigenCompute; README has addresses and Judge URL.

3) YOUR WORK:
   - Extend the frontend so a user can: (a) open or select a dispute (disputeId), (b) submit an argument (Judge POST /submitArgument or equivalent), (c) see dispute status (GET /dispute/:disputeId), (d) trigger judge and see verdict/outcome (POST /judgeFromDispute + display result).
   - Use Judge base URL from env or README (e.g. http://35.233.167.89:3001 or from .env). Keep UI minimal but functional (forms, buttons, display of status and verdict).
   - Update apps/frontend/README.md: how to run (npm install, npm run dev), required env vars, and how the flow maps to the Judge API.
   - Before claiming done: run build (and tests if any); report real output (verification-before-completion).

4) GIT & PR (mandatory):
   - Commit with a clear message (e.g. "feat(phase3b): frontend for dispute flow and verdict display").
   - Use **finishing-a-development-branch**: verify, then choose “Push and create a Pull Request”.
   - Push: `git push -u origin feat/phase3b-frontend-skeleton`.
   - Open a PR against **main** on Hebx/proof-of-verdict. Title e.g. "Phase 3b: Frontend for disputes and verdicts". Body: what was built, how to run and test.

Reply with: (1) what you built (screens/flows), (2) how to run and verify, (3) PR link or exact steps if you cannot open the PR yourself.
```

---

## Prompt for **Discord** — Execute What’s Next Plan

Use this when you want the Discord channel to **run the merge/PR workflow** from the plan (verify branches, open PRs, update docs). Plan: **docs/plans/2026-02-27-whats-next.md**.

Copy the block below into your **OpenClaw Discord** channel.

```
CONTEXT: ProofOfVerdict repo: clawd/projects/proof-of-verdict (remote: https://github.com/Hebx/proof-of-verdict.git). Execute the "What's Next" plan in docs/plans/2026-02-27-whats-next.md. Principle: things that work >>> theory/mocked.

SKILLS (invoke via Skill tool):
- **executing-plans** — Follow the plan in order; verify after each step.
- **verification-before-completion** — Run real commands (forge test, npm run build, curl Judge health), read output, report results. No "should work" without evidence.
- **finishing-a-development-branch** — When a branch is verified: present options, then push and open PR (or document exact steps if you cannot open PR).

TASK — Execute Phase A of the plan (merge-ready branches → PRs):

1) PHASE3B (Frontend)
   - Checkout feat/phase3b-frontend-skeleton. Run verification: `cd apps/frontend && npm run build`. Report pass/fail.
   - If pass: ensure branch is pushed, then open a PR against main. Title: "Phase 3b: Frontend for disputes and verdicts". Body: what the frontend does, how to run (npm install, npm run dev), env (VITE_JUDGE_API_URL), link to docs/API.md.
   - If you cannot open the PR: output exact steps (push branch, open GitHub PR from feat/phase3b-frontend-skeleton to main) and the suggested PR title/body.

2) PHASE3C (Reputation)
   - Checkout feat/phase3c-reputation. Run verification: `cd contracts && forge test`. Report pass/fail and test count.
   - If pass: ensure branch is pushed, then open a PR against main. Title: "Phase 3c: On-chain reputation (PovReputation + escrow)". Body: what was added (PovReputation.sol, escrow integration, docs), how to run tests (forge test), note that deployment is optional/TBD.
   - If you cannot open the PR: output exact steps and suggested PR title/body.

3) DOCS (after PRs exist or after human merges)
   - On main (or a branch from main): Update README and docs/ACHIEVEMENTS.md so they match reality: if frontend/reputation are merged, say so; list apps/frontend in README Quick Start or Documentation; add one line that PovReputation exists (code-ready, deploy TBD) if phase3c is merged.
   - If you only opened PRs and cannot merge: create a short doc update branch (e.g. docs/update-readme-after-merge) with the README/ACHIEVEMENTS changes and open a PR, or list the exact edits for a human to apply after merging phase3b and phase3c.

Reply with: (1) verification output for phase3b and phase3c, (2) PR links or exact steps to open them, (3) what doc updates you made or the exact edits to apply after merge.
```

---

## Prompt for **Channels** — Explain ProofOfVerdict in Full Detail

Use this when you want Telegram or Discord to **produce a complete, detailed explanation** of ProofOfVerdict (for internal alignment, onboarding, or to paste into docs). The agent should use the repo as source of truth and output a structured, accurate explanation.

Copy the block below into your **OpenClaw Telegram or Discord** channel.

```
CONTEXT: ProofOfVerdict repo: clawd/projects/proof-of-verdict (remote: https://github.com/Hebx/proof-of-verdict.git). Your task is to explain ProofOfVerdict fully and in detail, using only information from the repo (README, docs/ARCHITECTURE.md, docs/API.md, docs/AGENT_INTEGRATION.md, docs/ACHIEVEMENTS.md, docs/PRD-MISSING.md, docs/plans/).

TASK — Produce a full detailed explanation. Do not invent; cite repo paths or doc names where relevant.

1) ONE-LINER & PROBLEM
   - One-sentence pitch. Then: the problem (why agent-to-agent disputes need a trustless judge; limitations of centralized arbiters and human judges).

2) SOLUTION & VALUE PROP
   - What ProofOfVerdict is: TEE Judge + on-chain verdicts + escrow settlement. Who it is for (builders in the agent economy, deal platforms, trading bots). What outcome they get (fair, verifiable, on-chain settlement without a central arbiter).

3) HOW IT WORKS (STEP BY STEP)
   - End-to-end flow: escrow opened → listener detects → Judge evaluates (demo vs agent mode) → EIP-712 signed verdict → on-chain registration → settlement. Call out: VerdictRegistry, PovEscrowERC20, verdict-listener, TEE Judge (EigenCompute, Intel TDX), KMS wallet, EigenAI/LLM.

4) ARCHITECTURE
   - On-chain: VerdictRegistry (EIP-712 store, authorized signer, replay protection), PovEscrowERC20 (ERC20 escrow, verdict-based settle, fees, timeout refund). Off-chain: TEE Judge (endpoints: /judge, /generateArgument, /submitArgument, /dispute/:id, /judgeFromDispute), verdict-listener (demo vs agent mode), scripts (open-escrow, settle-dispute, register-judge). disputeId conventions (trade, sla, payment).

5) SECURITY & TRUST
   - TEE isolation (Intel TDX), KMS-injected wallet (non-extractable), EIP-712 signing, replay protection, escrow validation (debaterId = payer or payee). Where applicable: confidence thresholds, attestation (EigenCompute verify URL).

6) USE CASES & INTEGRATION
   - Trade dispute, SLA breach, payment dispute, demo/hackathon. How agents integrate: disputeId derivation, POST /submitArgument, coordinator triggers /judgeFromDispute. SDK (ProofOfVerdictAgent), ERC-8004 registration (discoverability).

7) LIVE STATE & VERIFICATION
   - What is deployed and verified: Base Sepolia contracts (addresses), Judge endpoint (health URL), ERC-8004 Agent ID. What is in progress or not on main: frontend (branch), reputation (branch), phase2 robustness, e2e-real.sh. Point to docs/ACHIEVEMENTS.md and docs/plans/2026-02-27-whats-next.md for current state.

8) HOW TO RUN / TRY IT
   - Prerequisites. Clone, .env, deploy contracts (first time). Run e2e-live.sh (demo) or e2e-agent-mode.sh (agent). Optional: frontend (apps/frontend), Judge API base URL. Link to README and docs/DEPLOYMENT.md.

Output: a single, well-structured message (or doc) that someone could use to onboard a teammate or present ProofOfVerdict to a technical audience. If the channel can write to the repo: optionally save a condensed version to docs/EXPLAINER-FULL.md and report the path.
```

---

## Prompt for **Channels** — Explain for Any Users (Simple Version)

Use this when you want Telegram or Discord to **produce a short, non-technical explainer** for end users, partners, or a general audience. Output should be plain language, no jargon; refer to docs/FOR-USERS.md for tone and structure.

Copy the block below into your **OpenClaw Telegram or Discord** channel.

```
CONTEXT: ProofOfVerdict repo: clawd/projects/proof-of-verdict. Your task is to explain ProofOfVerdict in simple terms for any user (non-devs, partners, curious readers). Use docs/FOR-USERS.md and README as reference; do not invent facts.

TASK — Produce a short, clear explainer (one message or a small doc):

1) What it is — One sentence: neutral AI Judge for agent disputes; verdicts signed in a secure enclave and enforced on-chain. No central arbiter.

2) Why it matters — When agents do deals or trades, they disagree. Humans don't scale; centralized arbiters are a single point of failure. ProofOfVerdict gives a trustless, tamper-proof Judge and automatic settlement.

3) How it works (plain steps) — Stake in escrow → both sides submit their case → Judge evaluates in a secure enclave → verdict is signed → escrow pays the winner. No one can tamper with the Judge.

4) Who it's for — People building or using autonomous agents (trading bots, deal platforms, task runners) that need fair, automatic dispute resolution.

5) How to try it — Live Judge and contracts; run demo or agent-mode scripts (see README); optional frontend. Link to docs/FOR-USERS.md and README for details.

Keep it to a few short paragraphs or bullet lists. No deep tech (EIP-712, TEE, chain addresses) unless you add one line "For technical details see README / ARCHITECTURE."
```

---

## Skill Summary by Channel

| Channel  | Branch                        | Main skills |
|----------|-------------------------------|-------------|
| Telegram | feat/phase3c-reputation       | TDD, verification-before-completion, finishing-a-development-branch, (optional) requesting-code-review |
| Discord  | feat/phase3b-frontend-skeleton| writing-plans or executing-plans, TDD (for logic), verification-before-completion, finishing-a-development-branch, (optional) requesting-code-review |

Both channels must **push to origin** and **open a PR against main**; use **finishing-a-development-branch** to do that in a structured way.
