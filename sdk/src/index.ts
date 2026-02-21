/**
 * ProofOfVerdict Agent SDK
 * Minimal SDK for agent-to-agent dispute resolution.
 */

import { ProofOfVerdictError } from "./errors.js";

export { ProofOfVerdictError };
export const POV_JUDGE_AGENT_ID = "84532:961" as const;

export interface ProofOfVerdictAgentOptions {
  judgeUrl: string;
  rpcUrl?: string;
  privateKey?: `0x${string}`;
  timeoutMs?: number;
  retries?: number;
}

export interface DisputeStatus {
  disputeId: string;
  topic?: string;
  debaterA?: { id: string; argumentLength: number };
  debaterB?: { id: string; argumentLength: number };
  ready: boolean;
}

export interface SubmitArgumentResult {
  ok: boolean;
  disputeId?: string;
  debaterId?: string;
  error?: string;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const retries = opts.retries ?? 0;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (res.status >= 500 && i < retries) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (i === retries) {
        clearTimeout(timeout);
        throw lastErr;
      }
    }
  }
  throw lastErr;
}

export async function discoverJudge(options: {
  chainId?: number;
  rpcUrl: string;
  fallbackUrl?: string;
}): Promise<string> {
  const chainId = options.chainId ?? 84532;
  try {
    const { SDK } = await import("agent0-sdk");
    const sdk = new SDK({
      chainId,
      rpcUrl: options.rpcUrl,
    });
    const agent = await sdk.getAgent(`${chainId}:961`);
    const url = agent?.web ?? agent?.mcp;
    if (url) return url.replace(/\/$/, "");
  } catch {
    /* discovery failed */
  }
  if (options.fallbackUrl) return options.fallbackUrl;
  throw new ProofOfVerdictError(
    "Judge discovery failed; provide judgeUrl or fallbackUrl",
    "DISCOVERY_FAILED",
  );
}

export async function createProofOfVerdictAgent(
  options: ProofOfVerdictAgentOptions & { rpcUrl: string; chainId?: number },
): Promise<ProofOfVerdictAgent> {
  const judgeUrl =
    options.judgeUrl ??
    (await discoverJudge({
      chainId: options.chainId ?? 84532,
      rpcUrl: options.rpcUrl,
      fallbackUrl: process.env.JUDGE_URL,
    }));
  return new ProofOfVerdictAgent({ ...options, judgeUrl });
}

export class ProofOfVerdictAgent {
  constructor(private options: ProofOfVerdictAgentOptions) {}

  private get fetchOpts() {
    return {
      timeoutMs: this.options.timeoutMs ?? 30_000,
      retries: this.options.retries ?? 0,
    };
  }

  async submitArgument(
    disputeId: string,
    debaterId: string,
    argument: string,
    topic?: string,
  ): Promise<SubmitArgumentResult> {
    const res = await fetchWithRetry(
      `${this.options.judgeUrl}/submitArgument`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeId, debaterId, argument, topic }),
      },
      this.fetchOpts,
    );
    const data = (await res.json()) as {
      ok?: boolean;
      disputeId?: string;
      debaterId?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new ProofOfVerdictError(
        data.error ?? `HTTP ${res.status}`,
        "SUBMIT_ARGUMENT_FAILED",
        res.status,
      );
    }
    return {
      ok: data.ok ?? true,
      disputeId: data.disputeId,
      debaterId: data.debaterId,
    };
  }

  async getDisputeStatus(disputeId: string): Promise<DisputeStatus> {
    const res = await fetchWithRetry(
      `${this.options.judgeUrl}/dispute/${disputeId}`,
      {},
      this.fetchOpts,
    );
    if (!res.ok) {
      const text = await res.text();
      throw new ProofOfVerdictError(
        `getDisputeStatus failed: ${res.status} ${text}`,
        "GET_DISPUTE_FAILED",
        res.status,
      );
    }
    return res.json() as Promise<DisputeStatus>;
  }

  async requestVerdict(disputeId: string): Promise<unknown> {
    const res = await fetchWithRetry(
      `${this.options.judgeUrl}/judgeFromDispute`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeId }),
      },
      this.fetchOpts,
    );
    if (!res.ok) {
      const text = await res.text();
      throw new ProofOfVerdictError(
        `judgeFromDispute failed: ${res.status} ${text}`,
        "JUDGE_FROM_DISPUTE_FAILED",
        res.status,
      );
    }
    return res.json();
  }
}
