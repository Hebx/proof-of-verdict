import { useMemo, useState } from "react";
import { formatUnits } from "viem";

const DEFAULT_TOKEN_DECIMALS = 6;

export function App() {
  const [topic, setTopic] = useState("AI judges should be deterministic");
  const [stake, setStake] = useState("10");
  const stakeFormatted = useMemo(() => {
    const parsed = Number(stake || 0);
    if (Number.isNaN(parsed)) return "0";
    return formatUnits(BigInt(Math.floor(parsed * 10 ** DEFAULT_TOKEN_DECIMALS)), DEFAULT_TOKEN_DECIMALS);
  }, [stake]);

  return (
    <main style={{ fontFamily: "Inter, system-ui", padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1>ProofOfVerdict</h1>
        <p>Minimal Phase 3b UI scaffold: create debates, view verdicts, track escrow lifecycle.</p>
      </header>

      <section style={{ border: "1px solid #eee", padding: 16, borderRadius: 12, marginBottom: 24 }}>
        <h2>Start a Debate</h2>
        <label style={{ display: "block", marginTop: 12 }}>
          Topic
          <input value={topic} onChange={(e) => setTopic(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
        </label>
        <label style={{ display: "block", marginTop: 12 }}>
          Stake (USDC)
          <input value={stake} onChange={(e) => setStake(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
        </label>
        <p style={{ marginTop: 12, color: "#666" }}>Preview stake: {stakeFormatted} USDC</p>
        <button style={{ marginTop: 12, padding: "8px 16px" }} disabled>
          Connect wallet to create dispute
        </button>
      </section>

      <section style={{ border: "1px solid #eee", padding: 16, borderRadius: 12 }}>
        <h2>Recent Verdicts</h2>
        <p style={{ color: "#666" }}>Hook into VerdictRegistry + listener logs here.</p>
        <ul>
          <li>Dispute 0x… — winner: A (confidence 74%)</li>
          <li>Dispute 0x… — winner: B (confidence 62%)</li>
        </ul>
      </section>
    </main>
  );
}
