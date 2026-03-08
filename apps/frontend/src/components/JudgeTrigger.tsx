import { useState } from "react";
import { judgeApi, type JudgeFromDisputeResponse } from "../api/judgeApi";

interface JudgeTriggerProps {
  disputeId: string;
  ready: boolean;
  onVerdict?: (verdict: JudgeFromDisputeResponse) => void;
}

export function JudgeTrigger({ disputeId, ready, onVerdict }: JudgeTriggerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrigger = async () => {
    if (!ready) return;

    setLoading(true);
    setError(null);

    try {
      const result = await judgeApi.judgeFromDispute(disputeId);
      onVerdict?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger judge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #e0e0e0", padding: 16, borderRadius: 8, marginBottom: 16 }}>
      <h4 style={{ marginTop: 0 }}>Trigger Judge</h4>

      <p style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
        Once both debaters have submitted arguments, trigger the TEE Judge to evaluate the dispute
        and produce a signed verdict.
      </p>

      <button
        onClick={handleTrigger}
        disabled={!ready || loading}
        style={{
          padding: "12px 24px",
          background: ready ? "#dc3545" : "#6c757d",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: !ready || loading ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {loading ? "Judging..." : ready ? "🧑‍⚖️ Trigger Verdict" : "Waiting for Arguments"}
      </button>

      {!ready && (
        <p style={{ fontSize: 12, color: "#856404", marginTop: 8 }}>
          ⚠️ Both debaters must submit arguments before triggering the judge.
        </p>
      )}

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f8d7da",
            color: "#721c24",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
