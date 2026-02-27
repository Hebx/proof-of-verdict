import { useState } from "react";

interface DisputeSelectorProps {
  onSelect: (disputeId: string) => void;
  loading?: boolean;
}

export function DisputeSelector({ onSelect, loading }: DisputeSelectorProps) {
  const [disputeId, setDisputeId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disputeId.trim()) {
      onSelect(disputeId.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Select Dispute</h3>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={disputeId}
          onChange={(e) => setDisputeId(e.target.value)}
          placeholder="Enter dispute ID (0x...)"
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 14,
            fontFamily: "monospace",
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!disputeId.trim() || loading}
          style={{
            padding: "8px 16px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: !disputeId.trim() || loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        Enter a dispute ID to view status, submit arguments, or trigger verdict.
      </p>
    </form>
  );
}
