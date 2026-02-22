# E2E with Real Data Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make E2E work with real data (USDC Base Sepolia, two agents submitting via SDK) and document/verify so the flow is ready to ship.

**Architecture:** Add a script that spawns two logical agents using ProofOfVerdictAgent SDK (arguments from Judge generateArgument); add e2e-real.sh that runs listener (agent mode), open-escrow, then submit-two-arguments, then waits for settlement. Document "E2E with real data" and USDC in DEPLOYMENT.md and .env.example.

**Tech Stack:** TypeScript, tsx, viem, existing sdk (ProofOfVerdictAgent), bash.

**Design doc:** `docs/plans/2026-02-22-e2e-real-data-design.md`

---

## Task 1: Add submit-two-arguments.ts (two agents via SDK)

**Files:**
- Create: `scripts/submit-two-arguments.ts`

**Step 1: Create script that uses ProofOfVerdictAgent and Judge generateArgument**

Create `scripts/submit-two-arguments.ts` with:
- Load `../.env` (dotenv).
- Require env: `JUDGE_URL`, `DISPUTE_ID`, `PAYER_ADDRESS`, `PAYEE_ADDRESS`; optional `DEBATE_TOPIC` (default topic string).
- If `DISPUTE_ID` not set, print usage and exit 1.
- Create one `ProofOfVerdictAgent` with `{ judgeUrl: process.env.JUDGE_URL }`.
- Fetch PRO argument: `fetch(\`${JUDGE_URL}/generateArgument\`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, side: "pro", context: `Payer ${payer} argues for.` }) })`, then `(await res.json()).argument`.
- Fetch CON argument: same with `side: "con"` and context `Payee ${payee} argues against.`
- Call `agent.submitArgument(disputeId, payer, argPro, topic)` and `agent.submitArgument(disputeId, payee, argCon, topic)`.
- Log success or errors; exit 0 if both submit ok, else 1.

Do not add sdk as a dependency. Use inline fetch: POST to `JUDGE_URL/submitArgument` with body `JSON.stringify({ disputeId, debaterId, argument, topic })` for each agent. For generateArgument use POST to `JUDGE_URL/generateArgument` with `{ topic, side: "pro"|"con", context? }` and take `(await res.json()).argument`. This keeps scripts self-contained and works without building the sdk.

**Step 2: Add npm script**

In `scripts/package.json`, add to `scripts`: `"submit-two-arguments": "tsx submit-two-arguments.ts"`.

**Step 3: Verify script runs (usage)**

Run: `cd scripts && DISPUTE_ID=0x0000000000000000000000000000000000000000000000000000000000000001 PAYER_ADDRESS=0x46Ca9120Ea33E7AF921Db0a230831CB08AeB2910 PAYEE_ADDRESS=0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC npm run submit-two-arguments` (with JUDGE_URL in .env). Expected: script runs (may fail at Judge if dispute not open; we only need it to not crash on missing DISPUTE_ID).

**Step 4: Commit**

```bash
git add scripts/submit-two-arguments.ts scripts/package.json
git commit -m "feat(scripts): add submit-two-arguments for E2E real data (two agents via SDK)"
```

---

## Task 2: Add e2e-real.sh driver

**Files:**
- Create: `scripts/e2e-real.sh`

**Step 1: Create E2E driver**

Create `scripts/e2e-real.sh` (executable):
- ROOT = dirname of script, then cd to repo root (one level up from scripts).
- Source `.env`; require `BASE_SEPOLIA_RPC`, `PRIVATE_KEY`, `JUDGE_URL`, `PAYEE_ADDRESS`.
- Default `POV_TOKEN_ADDRESS` to USDC Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` if unset.
- Default `DEBATE_TOPIC` to a short topic string.
- Echo "E2E Real Data (USDC + two agents via SDK)" and env summary.
- Start listener in background: `cd scripts && DEBATE_MODE=agent POV_TOKEN_ADDRESS="$POV_TOKEN_ADDRESS" PAYEE_ADDRESS="$PAYEE" DEBATE_TOPIC="$DEBATE_TOPIC" npm run listener &`; LISTENER_PID=$!; cd ROOT.
- sleep 5.
- Open escrow: `cd scripts && PAYEE_ADDRESS="$PAYEE" POV_TOKEN_ADDRESS="$POV_TOKEN_ADDRESS" DEBATE_TOPIC="$DEBATE_TOPIC" npm run open-escrow 2>&1`; capture output in OPEN_OUT; cd ROOT.
- Extract disputeId: `DISPUTE_ID=$(echo "$OPEN_OUT" | grep -oE '0x[a-fA-F0-9]{64}' | head -1)`.
- If DISPUTE_ID empty, echo "Failed to get disputeId", kill LISTENER_PID, exit 1.
- Get payer from PRIVATE_KEY (e.g. viem’s privateKeyToAccount(PRIVATE_KEY).address) or set PAYER_ADDRESS in .env and use that. For simplicity use a known env: document that PAYER_ADDRESS can be set, else derive in script (e.g. node -e "const { privateKeyToAccount } = require('viem/accounts'); console.log(privateKeyToAccount(process.env.PRIVATE_KEY).address)") or assume open-escrow uses same PRIVATE_KEY so payer is the deployer; we can grep open-escrow output for "Payer: 0x" and parse, or add PAYER_ADDRESS to .env. Simplest: require PAYER_ADDRESS in .env for e2e-real (or derive in a small inline Node call).
- Run submit-two-arguments: `cd scripts && DISPUTE_ID="$DISPUTE_ID" PAYER_ADDRESS="$PAYER_ADDRESS" PAYEE_ADDRESS="$PAYEE" DEBATE_TOPIC="$DEBATE_TOPIC" npm run submit-two-arguments`; if non-zero, kill listener, exit 1.
- Wait for listener: `wait $LISTENER_PID` or sleep 120; then kill LISTENER_PID if still running.
- Echo "Done. Check output above for settlement."

**Step 2: Derive payer from PRIVATE_KEY in script (optional)**

To avoid requiring PAYER_ADDRESS, add one line that uses node/tsx to derive address from PRIVATE_KEY and export PAYER_ADDRESS. E.g. in bash: `export PAYER_ADDRESS=$(node -e "const { privateKeyToAccount } = require('viem/accounts'); console.log(privateKeyToAccount(process.env.PRIVATE_KEY).address)")` after sourcing .env. (Requires viem in scripts; scripts already have viem.) So e2e-real.sh can derive PAYER_ADDRESS after loading .env.

**Step 3: Make executable**

Run: `chmod +x scripts/e2e-real.sh`.

**Step 4: Commit**

```bash
git add scripts/e2e-real.sh
git commit -m "feat(scripts): add e2e-real.sh for E2E with USDC and two agents via SDK"
```

---

## Task 3: Document E2E with real data and USDC

**Files:**
- Modify: `docs/DEPLOYMENT.md`
- Modify: `.env.example`

**Step 1: Add "E2E with real data" section to DEPLOYMENT.md**

In DEPLOYMENT.md, add a new section (e.g. after "Verify" or before "Verdict Listener"):

```markdown
### E2E with Real Data (USDC + Two Agents)

To run E2E with real token and agent-originated arguments:

1. Set in `.env`:
   - `POV_TOKEN_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e` (USDC Base Sepolia; get testnet USDC from Circle testnet faucet if needed).
   - `JUDGE_URL`, `BASE_SEPOLIA_RPC`, `PRIVATE_KEY`, `PAYEE_ADDRESS`.
2. Run: `./scripts/e2e-real.sh`
3. Flow: listener (agent mode) starts → escrow opens with USDC → two agents submit arguments via SDK (arguments from Judge generateArgument) → listener runs Judge and settles.

Real data means: real chain (Base Sepolia), real Judge (TEE), real token (USDC testnet), and arguments submitted via `POST /submitArgument` (no hardcoded strings in the E2E script).
```

**Step 2: Add USDC to .env.example**

In `.env.example`, near `POV_TOKEN_ADDRESS`, add a comment or example line:

```
# For real-data E2E use USDC Base Sepolia (testnet):
# POV_TOKEN_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

**Step 3: Commit**

```bash
git add docs/DEPLOYMENT.md .env.example
git commit -m "docs: E2E with real data (USDC, two agents), add USDC Base Sepolia to example"
```

---

## Task 4: Optional — AGENT_INTEGRATION.md note

**Files:**
- Modify: `docs/AGENT_INTEGRATION.md`

**Step 1: Add note on two agents for E2E**

In AGENT_INTEGRATION.md, add a short paragraph after "SDK Usage" or at the end:

```markdown
### E2E with Two Agents (Real Data)

For a single-command E2E using real token (e.g. USDC Base Sepolia) and two logical agents, run `./scripts/e2e-real.sh`. The script uses the same SDK to submit both arguments (optionally with arguments from Judge `generateArgument`). In production, replace this with two independent services or agents each calling `ProofOfVerdictAgent#submitArgument`.
```

**Step 2: Commit**

```bash
git add docs/AGENT_INTEGRATION.md
git commit -m "docs: note E2E two-agent flow and production usage"
```

---

## Task 5: Run E2E real-data flow and verify

**Step 1: Run e2e-real.sh**

From repo root, with .env containing JUDGE_URL, BASE_SEPOLIA_RPC, PRIVATE_KEY, PAYEE_ADDRESS, and POV_TOKEN_ADDRESS set to USDC Base Sepolia (and payer has USDC balance or use MockERC20 first to confirm flow):

```bash
./scripts/e2e-real.sh
```

Expected: Listener starts, escrow opens, submit-two-arguments runs and both submissions succeed, listener receives event and runs Judge then settles. If USDC balance is missing, run once with POV_TOKEN_ADDRESS=MockERC20 to verify the script path, then document that users need USDC for real-data E2E.

**Step 2: Document verification**

If run succeeds, add to ACHIEVEMENTS.md or DEPLOYMENT.md one line: "Real-data E2E verified: e2e-real.sh with USDC (or MockERC20) and two SDK agents."

**Step 3: Commit (if any doc update)**

```bash
git add docs/ACHIEVEMENTS.md  # or DEPLOYMENT.md
git commit -m "docs: verify real-data E2E path"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-22-e2e-real-data.md`.

**Two execution options:**

1. **Subagent-Driven (this session)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Parallel Session (separate)** — Open a new session with executing-plans, batch execution with checkpoints.

Which approach?
