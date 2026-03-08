import type { JudgeFromDisputeResponse } from "../api/judgeApi";

interface VerdictDisplayProps {
  verdict: JudgeFromDisputeResponse | null;
}

export function VerdictDisplay({ verdict }: VerdictDisplayProps) {
  if (!verdict) return null;

  const { verdict: verdictData, signedVerdict, eigenaiModel, issuedAt } = verdict;
  const winner = verdictData.winner;
  const confidence = verdictData.confidenceBps / 100; // Convert bps to percentage

  return (
    <div
      style={{
        border: "2px solid #28a745",
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        background: "#f8fff8",
      }}
    >
      <h3 style={{ marginTop: 0, color: "#155724" }}>🏆 Verdict Reached</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: 16,
            background: "#d4edda",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#155724", marginBottom: 4 }}>Winner</div>
          <code
            style={{
              fontSize: 14,
              wordBreak: "break-all",
              background: "rgba(255,255,255,0.5)",
              padding: "4px 8px",
              borderRadius: 4,
            }}
          >
            {winner.slice(0, 10)}...{winner.slice(-8)}
          </code>
        </div>

        <div
          style={{
            padding: 16,
            background: "#d4edda",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#155724", marginBottom: 4 }}>Confidence</div>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#155724" }}>
            {confidence.toFixed(1)}%
          </div>
        </div>

        <div
          style={{
            padding: 16,
            background: "#e2e3f3",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#383d7a", marginBottom: 4 }}>Model</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#383d7a" }}>{eigenaiModel}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Reasoning</div>
        <div
          style={{
            padding: 12,
            background: "white",
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {verdictData.reasoning}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Scores</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ padding: 12, background: "#f8f9fa", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Debater A</div>
            <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
              <span>Logic: {verdictData.scores.debaterA.logic}/10</span>
              <span>Evidence: {verdictData.scores.debaterA.evidence}/10</span>
              <span>Persuasion: {verdictData.scores.debaterA.persuasion}/10</span>
            </div>
          </div>
          <div style={{ padding: 12, background: "#f8f9fa", borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Debater B</div>
            <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
              <span>Logic: {verdictData.scores.debaterB.logic}/10</span>
              <span>Evidence: {verdictData.scores.debaterB.evidence}/10</span>
              <span>Persuasion: {verdictData.scores.debaterB.persuasion}/10</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 16 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Signed Verdict (EIP-712)</div>
        <div style={{ fontSize: 12, color: "#888" }}>
          <div>Signer: {signedVerdict.signer}</div>
          <div>Issued: {new Date(issuedAt).toLocaleString()}</div>
          <div style={{ marginTop: 8 }}>
            Signature: {" "}
            <code
              style={{
                background: "#f5f5f5",
                padding: "2px 6px",
                borderRadius: 4,
                wordBreak: "break-all",
              }}
            >
              {signedVerdict.signature.slice(0, 30)}...
              {signedVerdict.signature.slice(-20)}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
