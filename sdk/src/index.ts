/**
 * ProofOfVerdict Agent SDK
 * Minimal SDK for agent-to-agent dispute resolution.
 */

export interface ProofOfVerdictAgentOptions {
  judgeUrl: string;
  rpcUrl?: string;
  privateKey?: `0x${string}`;
}

export interface DisputeStatus {
  disputeId: string;
  topic?: string;
  debaterA?: { id: string; argumentLength: number };
  debaterB?: { id: string; argumentLength: number };
  ready: boolean;
}

export class ProofOfVerdictAgent {
  constructor(private options: ProofOfVerdictAgentOptions) {}

  async submitArgument(
    disputeId: string,
    debaterId: string,
    argument: string,
    topic?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`${this.options.judgeUrl}/submitArgument`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disputeId, debaterId, argument, topic }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: data.ok ?? true };
  }

  async getDisputeStatus(disputeId: string): Promise<DisputeStatus> {
    const res = await fetch(`${this.options.judgeUrl}/dispute/${disputeId}`);
    if (!res.ok) {
      throw new Error(`getDisputeStatus failed: ${res.status}`);
    }
    return res.json() as Promise<DisputeStatus>;
  }

  async requestVerdict(disputeId: string): Promise<unknown> {
    const res = await fetch(`${this.options.judgeUrl}/judgeFromDispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disputeId }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`judgeFromDispute failed: ${res.status} ${text}`);
    }
    return res.json();
  }
}
