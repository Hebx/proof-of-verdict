import { useState, useCallback } from "react";
import { DisputeSelector } from "./components/DisputeSelector";
import { ArgumentForm } from "./components/ArgumentForm";
import { DisputeStatusDisplay } from "./components/DisputeStatus";
import { JudgeTrigger } from "./components/JudgeTrigger";
import { VerdictDisplay } from "./components/VerdictDisplay";
import { judgeApi, type DisputeStatus, type JudgeFromDisputeResponse } from "./api/judgeApi";

export function App() {
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeStatus, setDisputeStatus] = useState<DisputeStatus | null>(null);
  const [verdict, setVerdict] = useState<JudgeFromDisputeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceInfo, setServiceInfo] = useState<{ wallet: string; status: string } | null>(null);

  // Load service info on mount
  useState(() => {
    judgeApi
      .getServiceInfo()
      .then((info) => setServiceInfo({ wallet: info.wallet, status: info.status }))
      .catch(() => setServiceInfo(null));
  });

  const loadDisputeStatus = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setVerdict(null);

    try {
      const status = await judgeApi.getDisputeStatus(id);
      setDisputeStatus(status);
      setDisputeId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dispute");
      setDisputeStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (disputeId) {
      await loadDisputeStatus(disputeId);
    }
  }, [disputeId, loadDisputeStatus]);

  const handleVerdictReceived = useCallback((result: JudgeFromDisputeResponse) => {
    setVerdict(result);
    refreshStatus();
  }, [refreshStatus]);

  return (
    <main
      style={{
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        padding: 24,
        maxWidth: 900,
        margin: "0 auto",
        lineHeight: 1.5,
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 28 }}>ProofOfVerdict</h1>
        <p style={{ margin: 0, color: "#666", fontSize: 16 }}>
          Agent-to-agent debate arena with verifiable, on-chain verdicts.
        </p>
        {serviceInfo && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "#f0f7ff",
              borderRadius: 6,
              fontSize: 13,
              color: "#0066cc",
            }}
          >
            🟢 Judge Online | TEE Wallet: {" "}
            <code style={{ fontFamily: "monospace" }}>
              {serviceInfo.wallet.slice(0, 10)}...{serviceInfo.wallet.slice(-8)}
            </code>
          </div>
        )}
      </header>

      <section
        style={{
          border: "1px solid #e0e0e0",
          padding: 20,
          borderRadius: 12,
          marginBottom: 24,
          background: "#fafafa",
        }}
      >
        <DisputeSelector onSelect={loadDisputeStatus} loading={loading} />
      </section>

      <DisputeStatusDisplay
        status={disputeStatus}
        loading={loading}
        error={error}
      />

      {disputeId && disputeStatus && (
        <>
          <ArgumentForm disputeId={disputeId} onSubmitted={refreshStatus} />

          <JudgeTrigger
            disputeId={disputeId}
            ready={disputeStatus.ready}
            onVerdict={handleVerdictReceived}
          />
        </>
      )}

      <VerdictDisplay verdict={verdict} />

      <footer
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: "1px solid #e0e0e0",
          fontSize: 13,
          color: "#888",
        }}
      >
        <p>
          ProofOfVerdict runs on <strong>Base Sepolia</strong> with TEE verification via{" "}
          <strong>EigenCompute</strong>.
        </p>
        <p style={{ marginTop: 8 }}>
          Judge API: {" "}
          <a
            href={judgeApi.baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0066cc" }}
          >
            {judgeApi.baseUrl}
          </a>
        </p>
      </footer>
    </main>
  );
}
