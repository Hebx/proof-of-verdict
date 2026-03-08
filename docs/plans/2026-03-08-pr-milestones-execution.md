# PR Milestones Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **For this session:** Execute with superpowers:subagent-driven-development, dispatching-parallel-agents first, and strict test-driven-development for code changes.

**Goal:** Merge the open ProofOfVerdict PR milestones safely by splitting risky scope, enforcing TDD, and shipping reviewable, verified branches with commit/push checkpoints.

**Architecture:** Use one orchestration branch for the plan and run each implementation milestone in an isolated worktree branch. First run parallel subagents for independent preflight validation and risk confirmation, then execute milestone tasks with subagent-driven development in sequence, requiring red-green-refactor evidence and code reviews after each task.

**Tech Stack:** Git/GitHub CLI, Foundry, TypeScript (tsx), docs markdown, subagent workflows.

---

### Task 1: Parallel Preflight Validation (Dispatching-Parallel-Agents)

**Files:**
- Modify: none (validation-only)
- Test: `contracts/test/*.t.sol`, `apps/frontend`, `docs/*` (read checks)

**Step 1: Dispatch parallel validation subagents**

- Agent A (frontend PR #3): verify install/build and report blockers.
- Agent B (reputation PR #4): verify tests and identify missing/weak coverage.
- Agent C (docs PR #5): check broken links and premature claims.
- Agent D (clean PR #6): verify scope and supersedence path for PR #2.

**Step 2: Collect and normalize findings**

- Produce a table: status, blockers, required code changes, and independent/sequential constraints.

**Step 3: Gate continuation**

- Continue only when there are no unresolved environment blockers.

**Step 4: Commit**

No commit for validation-only task.

---

### Task 2: Reputation Test Hardening (TDD, Subagent-Driven)

**Files:**
- Modify: `contracts/test/PovReputation.t.sol` (or create if missing)
- Modify: `contracts/src/PovReputation.sol` (only if test demands change)
- Test: `contracts/test/PovReputation.t.sol`

**Step 1: Write failing tests first**

- Add tests for:
  - score bounds and clamping behavior,
  - unauthorized `recordOutcome` rejection,
  - escrow address update behavior.

**Step 2: Run targeted tests to verify RED**

Run: `cd contracts && forge test --match-contract PovReputationTest -vv`
Expected: FAIL with behavior gaps (or fail due missing test target).

**Step 3: Implement minimal code to pass**

- Update `PovReputation.sol` minimally only where failing tests demand it.

**Step 4: Verify GREEN**

Run:
- `cd contracts && forge test --match-contract PovReputationTest -vv`
- `cd contracts && forge test`
Expected: PASS.

**Step 5: Commit + push**

```bash
git add contracts/src/PovReputation.sol contracts/test/PovReputation.t.sol
git commit -m "test(reputation): add TDD coverage for score and access invariants"
git push -u origin <branch>
```

---

### Task 3: Docs Accuracy and Link Integrity for PR #5 (TDD-style docs checks)

**Files:**
- Modify: `README.md`
- Modify: `docs/ACHIEVEMENTS.md`
- Modify: `docs/ROADMAP.md` (if needed for state wording)
- Test: link/file existence checks (scripted or command checklist)

**Step 1: Write failing docs checks first**

- Add/prepare a deterministic check list for required links/files.
- Ensure current state fails when docs reference not-yet-merged artifacts.

**Step 2: Run docs checks (RED)**

Run checks that confirm current mismatch between claims and main.

**Step 3: Minimal docs fix**

- Update wording to "pending merge" where applicable.
- Keep "live" claims only for merged/deployed components.

**Step 4: Verify docs checks (GREEN)**

- Re-run link/file checks until all pass.

**Step 5: Commit + push**

```bash
git add README.md docs/ACHIEVEMENTS.md docs/ROADMAP.md
git commit -m "docs: align live claims with merged state and fix references"
git push -u origin <branch>
```

---

### Task 4: PR #6 Finalization and PR #2 Supersedence

**Files:**
- Modify: PR body/description via GitHub CLI
- Modify: optional docs note in `docs/ROADMAP.md`

**Step 1: Validate PR #6 scope**

Run: `git diff --name-only origin/main...origin/feat/e2e-real-data-clean`
Expected: only intended e2e/judge/scripts/docs files.

**Step 2: Verify checks**

Run:
- `cd contracts && forge test`
- `cd scripts && npm run`

**Step 3: Update tracking notes**

- Add note in PR #6 and PR #2 that #6 supersedes #2.

**Step 4: Commit + push (if docs changed)**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark clean e2e PR as superseding oversized branch"
git push -u origin <branch>
```

---

### Task 5: Merge Readiness Gate and Ordered Review

**Files:**
- Modify: `docs/plans/2026-03-08-pr-milestones-execution.md` (status section update)

**Step 1: Re-run global verification**

Run:
- `cd contracts && forge test`
- `cd apps/frontend && npm install && npm run build` (on frontend branch)
- `cd scripts && npm run`

**Step 2: Require two-stage review per milestone**

- Spec compliance review subagent (required).
- Code quality review subagent (required).

**Step 3: Update merge order**

Target sequence:
1. PR #3 frontend
2. PR #4 reputation
3. PR #5 docs alignment (post #3/#4)
4. PR #6 clean e2e branch
5. Close/supersede PR #2

**Step 4: Commit + push plan status**

```bash
git add docs/plans/2026-03-08-pr-milestones-execution.md
git commit -m "docs(plan): add milestone execution status and merge gate results"
git push -u origin docs/2026-03-08-milestone-execution-plan
```
