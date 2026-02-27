// Judge API client for ProofOfVerdict
// Base URL: http://35.233.167.89:3001 (configurable via env)

const JUDGE_BASE_URL = import.meta.env.VITE_JUDGE_API_URL || "http://35.233.167.89:3001";

export interface DebaterInfo {
  id: string;
  argumentLength: number;
}

export interface DisputeStatus {
  disputeId: string;
  topic?: string;
  debaterA?: DebaterInfo;
  debaterB?: DebaterInfo;
  ready: boolean;
}

export interface SubmitArgumentRequest {
  disputeId: string;
  debaterId: string;
  argument: string;
  topic?: string;
}

export interface SubmitArgumentResponse {
  ok: boolean;
  disputeId: string;
  debaterId: string;
}

export interface VerdictScores {
  logic: number;
  evidence: number;
  persuasion: number;
}

export interface VerdictResult {
  winner: string;
  confidenceBps: number;
  reasoning: string;
  scores: {
    debaterA: VerdictScores;
    debaterB: VerdictScores;
  };
}

export interface SignedVerdictPayload {
  disputeId: string;
  winner: string;
  confidenceBps: string;
  issuedAt: string;
  deadline: string;
  nonce: string;
}

export interface SignedVerdict {
  payload: SignedVerdictPayload;
  digest: string;
  signature: string;
  signer: string;
}

export interface JudgeFromDisputeResponse {
  verdict: VerdictResult;
  transcriptHash: string;
  signedVerdict: SignedVerdict;
  eigenaiModel: string;
  issuedAt: string;
  eigenaiSeed: number;
  eigenaiSignature?: string;
}

export interface ServiceInfo {
  service: string;
  version: string;
  status: string;
  wallet: string;
}

class JudgeApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "JudgeApiError";
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new JudgeApiError(
      response.status,
      errorData.error || `HTTP ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export const judgeApi = {
  baseUrl: JUDGE_BASE_URL,

  // Health check / service info
  getServiceInfo(): Promise<ServiceInfo> {
    return fetchJson<ServiceInfo>(`${JUDGE_BASE_URL}/`);
  },

  // Get dispute status
  getDisputeStatus(disputeId: string): Promise<DisputeStatus> {
    return fetchJson<DisputeStatus>(
      `${JUDGE_BASE_URL}/dispute/${encodeURIComponent(disputeId)}`
    );
  },

  // Submit argument for a dispute
  submitArgument(request: SubmitArgumentRequest): Promise<SubmitArgumentResponse> {
    return fetchJson<SubmitArgumentResponse>(`${JUDGE_BASE_URL}/submitArgument`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  // Trigger verdict from dispute
  judgeFromDispute(disputeId: string): Promise<JudgeFromDisputeResponse> {
    return fetchJson<JudgeFromDisputeResponse>(`${JUDGE_BASE_URL}/judgeFromDispute`, {
      method: "POST",
      body: JSON.stringify({ disputeId }),
    });
  },
};

export default judgeApi;
