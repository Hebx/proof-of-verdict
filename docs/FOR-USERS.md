# ProofOfVerdict — For Users

A short, plain-language guide for anyone who wants to understand or try ProofOfVerdict.

---

## What is it?

**ProofOfVerdict** is a system where two parties can disagree, present their side to an AI Judge, and have the outcome decided fairly and enforced automatically—without a human or a company in the middle.

- **Who it’s for:** People building or using autonomous agents (trading bots, deal platforms, task runners) that need a neutral way to resolve disputes.
- **What you get:** A verdict that is signed in a secure enclave (TEE), recorded on-chain, and used to pay out escrowed stakes to the winner. No central arbiter. No one can tamper with the Judge.

---

## The problem it solves

When AI agents do deals or trades on their own, they sometimes disagree:

- “I delivered.” / “You didn’t.”
- “The task was done on time.” / “It was late.”
- “Payment was sent.” / “I never received it.”

Today, that usually means a human steps in or one side loses by default. That doesn’t scale and isn’t trustless. **ProofOfVerdict** gives you a Judge that:

- Runs in a **secure enclave** (no one can change or inspect its logic).
- Evaluates **both sides** of the dispute.
- **Signs** the verdict in a standard, verifiable way.
- Lets **on-chain escrow** pay the winner automatically.

---

## How it works (simple)

1. **Stake** — One party opens an escrow: “We’re disputing X; here’s the stake.”
2. **Argue** — Both sides submit their arguments to the Judge (or in demo mode, the Judge can generate both).
3. **Judge** — The AI Judge reads both arguments and decides who wins (with a confidence score and short reasoning).
4. **Sign** — The Judge signs the verdict inside the secure enclave. That signature is the proof.
5. **Settle** — The system registers the verdict on-chain and the escrow pays the winner (minus fees).

All of this can run without a human in the loop.

---

## How to try it

- **Live Judge:** The service is running; you can hit the health endpoint or use the API (see [API.md](API.md)).
- **Run the full flow:** Follow the [README](../README.md) Quick Start: clone the repo, set up `.env`, and run the demo script (`./scripts/e2e-live.sh`) or the agent-mode script (`./scripts/e2e-agent-mode.sh`).
- **Use the frontend:** If the frontend app is available in the repo, run it to select a dispute, submit arguments, and see the verdict (see `apps/frontend/README.md` if present).
- **Integrate your agents:** Use the [Agent Integration](AGENT_INTEGRATION.md) guide and the SDK to have your agents submit arguments and trigger the Judge.

---

## What’s live today

- **Contracts** on Base Sepolia: VerdictRegistry (stores verdicts), PovEscrowERC20 (escrow and settlement). Addresses are in the main [README](../README.md).
- **TEE Judge** on EigenCompute: responds to health checks and API calls; see [ACHIEVEMENTS.md](ACHIEVEMENTS.md) for verification.
- **Scripts** to open escrow, run the listener, settle disputes, and register the Judge as an agent (ERC-8004).

Frontend and on-chain reputation may be in progress; check the README and [ROADMAP.md](ROADMAP.md) for current status.

---

## Where to go next

| If you want to…              | Read / do this                          |
|-----------------------------|-----------------------------------------|
| Understand the system       | [ARCHITECTURE.md](ARCHITECTURE.md)      |
| Call the Judge API          | [API.md](API.md)                        |
| Integrate agents             | [AGENT_INTEGRATION.md](AGENT_INTEGRATION.md) |
| Deploy or run locally       | [DEPLOYMENT.md](DEPLOYMENT.md), [README](../README.md) |
| See what’s verified         | [ACHIEVEMENTS.md](ACHIEVEMENTS.md)      |
| See what’s coming           | [ROADMAP.md](ROADMAP.md)                |
