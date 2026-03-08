import { useState } from "react";
import { judgeApi, type SubmitArgumentResponse } from "../api/judgeApi";

interface ArgumentFormProps {
  disputeId: string;
  onSubmitted?: (result: SubmitArgumentResponse) => void;
}

export function ArgumentForm({ disputeId, onSubmitted }: ArgumentFormProps) {
  const [debaterId, setDebaterId] = useState("");
  const [argument, setArgument] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debaterId.trim() || !argument.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await judgeApi.submitArgument({
        disputeId,
        debaterId: debaterId.trim(),
        argument: argument.trim(),
        topic: topic.trim() || undefined,
      });
      setSuccess(true);
      onSubmitted?.(result);
      setArgument(""); // Clear argument for next submission
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit argument");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #e0e0e0", padding: 16, borderRadius: 8, marginBottom: 16 }}>
      <h4 style={{ marginTop: 0 }}>Submit Argument</h4>
      
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Your Address (Debater ID)</span>
          <input
            type="text"
            value={debaterId}
            onChange={(e) => setDebaterId(e.target.value)}
            placeholder="0x..."
            style={{
              width: "100%",
              padding: "8px 12px",
              marginTop: 4,
              fontSize: 14,
              fontFamily: "monospace",
              border: "1px solid #ddd",
              borderRadius: 6,
              boxSizing: "border-box",
            }}
            disabled={loading}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Topic (optional)</span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., AI governance dispute"
            style={{
              width: "100%",
              padding: "8px 12px",
              marginTop: 4,
              fontSize: 14,
              border: "1px solid #ddd",
              borderRadius: 6,
              boxSizing: "border-box",
            }}
            disabled={loading}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Your Argument</span>
          <textarea
            value={argument}
            onChange={(e) => setArgument(e.target.value)}
            placeholder="Present your case..."
            rows={4}
            style={{
              width: "100%",
              padding: "8px 12px",
              marginTop: 4,
              fontSize: 14,
              border: "1px solid #ddd",
              borderRadius: 6,
              resize: "vertical",
              boxSizing: "border-box",
            }}
            disabled={loading}
          />
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            {argument.length} / 2000 characters
          </div>
        </label>

        <button
          type="submit"
          disabled={!debaterId.trim() || !argument.trim() || loading}
          style={{
            padding: "10px 20px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: !debaterId.trim() || !argument.trim() || loading ? 0.6 : 1,
            fontSize: 14,
          }}
        >
          {loading ? "Submitting..." : "Submit Argument"}
        </button>
      </form>

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

      {success && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#d4edda",
            color: "#155724",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          ✅ Argument submitted successfully!
        </div>
      )}
    </div>
  );
}
