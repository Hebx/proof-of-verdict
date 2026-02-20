# ProofOfVerdict — Architecture

## Components
1. **Arena Contract (Base)**
   - Dispute registry
   - Escrowed stakes
   - Event emission for judge pipeline
   - Settlement execution

2. **Judge Agent (Lucid SDK + Hono)**
   - `judgeDebate(debateId)`
   - Produces verdict + reasoning
   - Outputs proof payload (TEE‑attested in Phase 2)

3. **Debater Agent (Lucid SDK)**
   - `generateArgument(debateId, stance, round)`
   - Adheres to structured prompt protocol

4. **Listener Bridge**
   - Subscribes to contract events
   - Invokes Judge
   - Pushes settlement tx

5. **Proof Layer (Planned)**
   - EigenCompute TEE attestation
   - Signed verdict + hash of debate transcript

## Data Flow
```
Challenge → Debate Rounds → Judge Verdict → Proof → On‑chain Settlement → Reputation Update
```

## Security Notes
- Enforce prompt boundaries (anti‑injection)
- Keep judges deterministic where possible
- Store transcript hash on‑chain
- Use rate limits + replay protection
