# ProofOfVerdict — Pitch Deck (Content)

Use this as the narrative and copy for slides. Adapt length and tone to audience (investors, partners, hackathon judges).

---

## Slide 1 — Title

**ProofOfVerdict**  
*Trustless AI Judge for the agent economy*

- Agent-to-agent debate → verifiable verdict → on-chain settlement  
- Live on Base Sepolia + EigenCompute TEE  
- [Verify TEE](https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A) · [GitHub](https://github.com/Hebx/proof-of-verdict)

---

## Slide 2 — Problem

**When agents disagree, who decides?**

- AI agents are doing more on their own: trades, deals, tasks, payments.
- Disputes are inevitable: “I delivered” vs “You didn’t,” “SLA met” vs “SLA missed.”
- **Today:** Centralized arbiters (single point of failure), or human judges (don’t scale), or one side loses by default.
- **Gap:** No neutral, tamper-proof, scalable Judge that agents can trust and that settles stakes on-chain.

---

## Slide 3 — Solution

**ProofOfVerdict: an AI Judge in a secure enclave, verdicts on-chain.**

- Two parties **stake in escrow** and **submit arguments** to the Judge.
- The Judge runs inside a **TEE** (Intel TDX on EigenCompute)—no one can inspect or alter it.
- It evaluates the debate, **signs the verdict** (EIP-712), and the system **registers it on-chain** and **settles the escrow** to the winner.
- **Outcome:** Fair, verifiable, automatic. No central arbiter. No human in the loop.

---

## Slide 4 — How it works

1. **Escrow** — Challenger opens escrow with ERC20 stakes against the other party.  
2. **Arguments** — Both agents submit their case via the Judge API (or Judge generates both in demo mode).  
3. **Judge** — LLM in TEE evaluates and decides winner + confidence + reasoning.  
4. **Sign** — Verdict signed with KMS-injected wallet inside TEE (non-extractable).  
5. **Settle** — Verdict registered on VerdictRegistry; escrow pays winner automatically.

*One line:* Escrow → Debate → TEE Judge → Signed verdict → On-chain settlement.

---

## Slide 5 — Architecture (visual)

- **On-chain (Base Sepolia):** VerdictRegistry (EIP-712 verdict store), PovEscrowERC20 (ERC20 escrow + verdict-based settlement).  
- **Off-chain:** TEE Judge (EigenCompute, Intel TDX), verdict listener (watches escrow, triggers Judge, registers verdict, settles).  
- **APIs:** `/judge`, `/submitArgument`, `/judgeFromDispute`, `/dispute/:id`.  
- **Trust:** TEE isolation, KMS wallet, EIP-712, replay protection, escrow validation.

---

## Slide 6 — Use cases

| Use case        | Example                                      | Flow                                      |
|-----------------|----------------------------------------------|-------------------------------------------|
| Trade dispute   | “I shipped” / “Never received”                | disputeId = trade + tradeId → argue → settle |
| SLA breach      | “Task done on time” / “It was late”          | disputeId = sla + dealId + taskId        |
| Payment dispute | “I paid” / “No payment”                      | disputeId = payment + invoiceId          |
| Demo / hackathon| Quick PRO vs CON                             | Judge generates both args → single flow   |

*Primary persona:* Builders integrating autonomous agents that need dispute resolution when agreements break down.

---

## Slide 7 — Traction & verification

- **Live today:** VerdictRegistry + PovEscrowERC20 on Base Sepolia; TEE Judge on EigenCompute (health + API verified).  
- **Agent-mode E2E:** Full flow verified: open escrow → both agents submit arguments → Judge evaluates → verdict registered → escrow settled.  
- **ERC-8004:** Judge registered as discoverable agent on Base Sepolia.  
- **Docs:** README, architecture, API, agent integration, deployment, achievements.  
- **Principle:** Things that work > theory; verification commands and links in repo.

---

## Slide 8 — Security & trust

- **TEE:** Judge runs in Intel TDX enclave; operator cannot tamper.  
- **Wallet:** KMS-injected signing key; non-extractable, deterministic.  
- **Verdict:** EIP-712 typed data; verified on-chain; replay protection.  
- **Escrow:** Only payer/payee can submit arguments; validated via chain state.  
- **Attestation:** EigenCompute verification URL for TEE and image.

---

## Slide 9 — Roadmap (high level)

- **Done:** Contracts, TEE Judge, listener, scripts, E2E (demo + agent), SDK, ERC-8004, docs.  
- **Next:** Merge frontend + reputation branches; Judge robustness (validation, confidence thresholds); real-data E2E (e.g. USDC).  
- **Later:** Deploy PovReputation; deeper Agent0 integration; optional x402 / pay-per-judge.  

*See [ROADMAP.md](ROADMAP.md) for details.*

---

## Slide 10 — Ask / Contact

- **For builders:** Use the Judge API, integrate via SDK, run E2E scripts. Open source; contribute on GitHub.  
- **For partners:** Explore integrations (agent platforms, deal/trade systems, insurance, oracles).  
- **For investors:** [Customize: raise round, use of funds, milestones.]  

**Links**  
- Repo: https://github.com/Hebx/proof-of-verdict  
- TEE Verify: https://verify-sepolia.eigencloud.xyz/app/0x865104D466143234Cc503E9025CBe54a9131a51A  
- Contracts (Base Sepolia): in README  

**Contact**  
- [Your contact / Twitter / Discord / email]

---

*Use this content to build slides (Google Slides, Pitch, Notion, etc.). Keep visuals simple: problem → solution → flow → architecture → use cases → traction → security → roadmap → ask.*
