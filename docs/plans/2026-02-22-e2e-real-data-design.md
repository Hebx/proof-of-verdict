# E2E with Real Data — Design Document

**Date:** 2026-02-22  
**Status:** Approved  
**Project:** ProofOfVerdict

---

## 1. Overview & Scope

**Goal:** Make the E2E flow work with real data (real token, real agent-originated arguments) and document/verify it so the system is ready to ship to users.

**Scope:**
- **(A)** Document what counts as "real data" E2E and how to verify it.
- **(B)** Support USDC on Base Sepolia as the real token (canonical testnet address).
- **(C)** Real agent-originated arguments: two logical agents submit via the ProofOfVerdictAgent SDK; E2E spawns them via a single script that uses the SDK (no hardcoded strings).

**Out of scope:** Changing contracts or Judge API; integrating a different agent framework (e.g. Eigen AgentKit) for debaters.

**Success criteria:** One documented, runnable E2E path using USDC (or configured token), agent mode, and two SDK-based submitters; full flow (open escrow → two agents submit → listener settles) completes successfully.

---

## 2. Real-Data Definition and Verification (A)

- **Real chain:** Base Sepolia (already used).
- **Real Judge:** TEE at `JUDGE_URL` (already used).
- **Real token (B):** USDC on Base Sepolia at `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Circle testnet USDC). Document how to obtain testnet USDC if needed (faucet/mint).
- **Real agent arguments (C):** Two parties each call `POST /submitArgument` via the PoV SDK; no hardcoded argument strings in the E2E script. Arguments may be LLM-generated (Judge `generateArgument`) or supplied by the caller.

**Verification:** A single documented "real data E2E" path: run with USDC as token, agent mode, and a "two-agent submitter" using the SDK; full flow (open escrow → two agents submit → listener runs judgeFromDispute → register → settle) completes successfully.

**Deliverable:** A short "E2E with real data" section in DEPLOYMENT.md or README: definition of real, env vars (including USDC), and how to run and verify.

---

## 3. Two Agents via SDK (Spawn)

- **Mechanism:** One script (e.g. `scripts/submit-two-arguments.ts`) that:
  - Accepts `disputeId`, `payer`, `payee`, `topic`, `JUDGE_URL` (from env or args).
  - Instantiates two `ProofOfVerdictAgent` instances (same Judge URL).
  - Obtains two arguments:
    - **Option A (recommended for ship-ready):** Call Judge `GET /generateArgument` (or existing helper) once for PRO and once for CON so arguments are LLM-generated but submitted by two logical agents via the SDK.
    - **Option B:** Accept two arguments from env or CLI for full control.
  - Calls `agentA.submitArgument(disputeId, payer, argPro, topic)` and `agentB.submitArgument(disputeId, payee, argCon, topic)`.

- **Spawn:** E2E driver (e.g. `e2e-real.sh`) runs this script after opening escrow (using the disputeId printed by open-escrow). "Spawn" = run one Node/TS script that acts as both agents for E2E. Production users can replace this with two independent services using the same SDK.

- **Dependencies:** Existing `sdk` (ProofOfVerdictAgent) and Judge REST API; scripts already use `tsx` and env. No agent0-sdk for debaters (only for Judge registration).

---

## 4. USDC on Base Sepolia (B)

- **Token address:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (canonical Base Sepolia USDC).
- **Config:** `POV_TOKEN_ADDRESS` in `.env`; when set to this address, E2E uses USDC. Document in `.env.example` and DEPLOYMENT.md.
- **Contracts:** No change; escrow is token-agnostic. Users need USDC balance (or faucet/mint on testnet).
- **Optional:** One line in docs pointing to Circle's "USDC on test networks" for faucet/mint.

---

## 5. E2E Flow Ready to Ship

- **Script:** `scripts/e2e-real.sh` (or `e2e-live-real.sh`):
  1. Load `.env`; require `JUDGE_URL`, `BASE_SEPOLIA_RPC`, `PRIVATE_KEY`, `PAYEE_ADDRESS`; optional `POV_TOKEN_ADDRESS` defaulting to USDC Base Sepolia.
  2. Start verdict-listener in background with `DEBATE_MODE=agent`, same env (and `POV_TOKEN_ADDRESS`).
  3. Run open-escrow (scripts/open-escrow); capture `disputeId` from output (e.g. grep/sed).
  4. Run `submit-two-arguments.ts` with `disputeId`, payer (from PRIVATE_KEY or env), payee, topic.
  5. Wait for listener to finish (or a fixed timeout); optionally poll `GET /dispute/:id` until `ready`, then wait for settlement.
  6. Exit 0 if settlement is observed or listener completes without error.

- **Success criteria:** Escrow opened with USDC (or configured token), both arguments submitted via SDK, listener calls Judge and settles; no hardcoded arguments in the E2E script; flow is documented and runnable with one command for "real data E2E".

---

## 6. Docs and Env

- **Docs:** "E2E with real data" section (definition, how to run, verification). DEPLOYMENT.md: USDC Base Sepolia address and `POV_TOKEN_ADDRESS`. AGENT_INTEGRATION.md: note that "two agents" can be one script using the SDK for E2E; production = two independent callers.
- **Env:** `.env.example`: comment or line for `POV_TOKEN_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e` (USDC Base Sepolia) for real-data E2E.

---

## Decisions Locked

| Decision | Value |
|----------|--------|
| Real token (testnet) | USDC Base Sepolia `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Two agents | One script using ProofOfVerdictAgent SDK; arguments from Judge generateArgument (option A) or env/CLI (option B) |
| E2E driver | New script e2e-real.sh (or e2e-live-real.sh) orchestrating listener, open-escrow, submit-two-arguments |
