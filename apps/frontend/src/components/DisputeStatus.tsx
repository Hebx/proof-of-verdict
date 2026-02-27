import type { DisputeStatus } from "../api/judgeApi";

interface DisputeStatusDisplayProps {
  status: DisputeStatus | null;
  loading?: boolean;
  error?: string | null;
}

export function DisputeStatusDisplay({ status, loading, error }: DisputeStatusDisplayProps) {
  if (loading) {
    return (
      <div style={{ border: "1px solid #e0e0e0", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <p style={{ margin: 0, color: "#666" }}>Loading dispute status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          border: "1px solid #f5c6cb",
          padding: 16,
          borderRadius: 8,
          marginBottom: 16,
          background: "#f8d7da",
        }}
      >
        <p style={{ margin: 0, color: "#721c24" }}>
          <strong>Error loading dispute:</strong> {error}
        </p>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={{ border: "1px solid #e0e0e0", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <p style={{ margin: 0, color: "#666" }}>Enter a dispute ID above to view its status.</p>
      </div>
    );
  }

  const hasDebaterA = !!status.debaterA;
  const hasDebaterB = !!status.debaterB;

  return (
    <div style={{ border: "1px solid #e0e0e0", padding: 16, borderRadius: 8, marginBottom: 16 }}>
      <h4 style={{ marginTop: 0, marginBottom: 12 }}>Dispute Status</h4>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Dispute ID</div>
        <code
          style={{
            fontSize: 13,
            background: "#f5f5f5",
            padding: "4px 8px",
            borderRadius: 4,
            wordBreak: "break-all",
          }}
        >
          {status.disputeId}
        </code>
      </div>

      {status.topic && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Topic</div>
          <div style={{ fontSize: 14 }}>{status.topic}</div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            padding: 12,
            background: hasDebaterA ? "#d4edda" : "#fff3cd",
            borderRadius: 6,
            border: `1px solid ${hasDebaterA ? "#c3e6cb" : "#ffeeba"}`,
          }}
        >
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Debater A</div>
          {hasDebaterA ? (
            <>
              <code style={{ fontSize: 12, wordBreak: "break-all" }}>{status.debaterA!.id}</code>
              <div style={{ fontSize: 12, color: "#28a745", marginTop: 4 }}>
                ✅ Submitted ({status.debaterA!.argumentLength} chars)
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#856404" }}>⏳ Waiting for argument...</div>
          )}
        </div>

        <div
          style={{
            padding: 12,
            background: hasDebaterB ? "#d4edda" : "#fff3cd",
            borderRadius: 6,
            border: `1px solid ${hasDebaterB ? "#c3e6cb" : "#ffeeba"}`,
          }}
        >
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Debater B</div>
          {hasDebaterB ? (
            <>
              <code style={{ fontSize: 12, wordBreak: "break-all" }}>{status.debaterB!.id}</code>
              <div style={{ fontSize: 12, color: "#28a745", marginTop: 4 }}>
                ✅ Submitted ({status.debaterB!.argumentLength} chars)
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#856404" }}>⏳ Waiting for argument...</div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: 12,
          background: status.ready ? "#d4edda" : "#f8f9fa",
          borderRadius: 6,
          border: `1px solid ${status.ready ? "#c3e6cb" : "#dee2e6"}`,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          {status.ready ? (
            <span style={{ color: "#155724" }}>✅ Ready for Verdict</span>
          ) : (
            <span style={{ color: "#6c757d" }}>⏳ Awaiting Arguments</span>
          )}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#666" }}>
          {status.ready
            ? "Both debaters have submitted arguments. You can now trigger the judge."
            : "Both debaters must submit arguments before the judge can evaluate."}
        </p>
      </div>
    </div>
  );
}
