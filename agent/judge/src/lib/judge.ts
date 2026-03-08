import OpenAI from "openai";
import { keccak256, toHex, type Hex } from "viem";
import { signVerdict, type SignedVerdict } from "./verdict-signer";

const MIN_CONFIDENCE = 6000;

function tieBreaker(disputeId: Hex, debaterA: string, debaterB: string): string {
  const bit = Number(BigInt(keccak256(toHex(disputeId))) % 2n);
  return bit === 0 ? debaterA : debaterB;
}

function validateVerdict(
  verdict: { winner?: string; confidenceBps?: number; scores?: Record<string, unknown> | null },
  debaterA: string,
  debaterB: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const a = debaterA.toLowerCase();
  const b = debaterB.toLowerCase();
  const w = String(verdict.winner ?? "").toLowerCase();
  if (w !== a && w !== b) errors.push(`winner must be ${a} or ${b}`);
  const conf = Number(verdict.confidenceBps);
  if (!Number.isInteger(conf) || conf < MIN_CONFIDENCE) errors.push(`confidenceBps must be integer >= ${MIN_CONFIDENCE}`);
  const scores = verdict.scores ?? undefined;
  if (!scores || typeof scores !== "object") errors.push("scores required");
  else {
    for (const key of ["debaterA", "debaterB"]) {
      const s = scores[key];
      if (!s || typeof s !== "object") errors.push(`scores.${key} required`);
      else
        for (const f of ["logic", "evidence", "persuasion"]) {
          const v = (s as Record<string, unknown>)[f];
          if (typeof v !== "number" || v < 1 || v > 10) errors.push(`scores.${key}.${f} must be 1-10`);
        }
    }
  }
  return { valid: errors.length === 0, errors };
}

function sumScores(s: Record<string, unknown> | null | undefined): number {
  if (!s || typeof s !== "object") return 0;
  const logic = Number((s as Record<string, unknown>).logic) || 0;
  const evidence = Number((s as Record<string, unknown>).evidence) || 0;
  const persuasion = Number((s as Record<string, unknown>).persuasion) || 0;
  return logic + evidence + persuasion;
}

let _openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.EIGENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("EIGENAI_API_KEY or OPENAI_API_KEY required");
    _openai = new OpenAI({
      apiKey,
      baseURL: process.env.EIGENAI_BASE_URL || "https://api.eigenai.com/v1",
    });
  }
  return _openai;
}

// EigenAI: deepseek-v3.1 (best), gpt-oss-120b | OpenAI: gpt-4o
const MODEL =
  process.env.EIGENAI_MODEL ||
  (process.env.EIGENAI_BASE_URL?.includes("openai.com")
    ? "gpt-4o"
    : "deepseek-v3.1");

interface DebateInput {
  topic: string;
  debaterA: { id: string; argument: string };
  debaterB: { id: string; argument: string };
  debateId?: string;
  winnerAddress?: string;
  disputeId?: string;
}

interface JudgeResult {
  verdict: {
    winner: string;
    confidenceBps: number;
    reasoning: string;
    scores: Record<string, unknown> | null;
  };
  transcriptHash: string;
  signedVerdict: SignedVerdict | null;
  eigenaiModel: string;
  issuedAt: string;
  /** Seed used for deterministic EigenAI inference (replay/audit) */
  eigenaiSeed?: number;
  /** EigenAI response signature when available (verifiable inference) */
  eigenaiSignature?: string;
  /** "valid" | "fallback" (fallback when LLM output failed validation) */
  validationStatus: "valid" | "fallback";
  /** Present when validationStatus === "fallback" */
  validationErrors?: string[];
  /** Aggregated scores for telemetry */
  scoreSummary: { scoreA: number; scoreB: number };
}

export async function judgeDebate(input: DebateInput): Promise<JudgeResult> {
  const prompt = `You are a fair, impartial judge in a structured debate arena.

Topic: "${input.topic}"

Debater A (${input.debaterA.id}):
${input.debaterA.argument}

Debater B (${input.debaterB.id}):
${input.debaterB.argument}

Evaluate both arguments on: logical coherence, evidence quality, persuasiveness, and rhetorical skill.

Respond ONLY with valid JSON, no markdown:
{
  "winner": "<debater id>",
  "confidenceBps": <integer 5000-10000>,
  "reasoning": "<2-3 sentence explanation>",
  "scores": {
    "debaterA": { "logic": <1-10>, "evidence": <1-10>, "persuasion": <1-10> },
    "debaterB": { "logic": <1-10>, "evidence": <1-10>, "persuasion": <1-10> }
  }
}`;

  // Deterministic inference: same inputs → same verdict (EigenAI trustless agents)
  // Seed from disputeId when available for replay/audit; fallback to 42
  const seed = input.disputeId
    ? Number(BigInt(keccak256(toHex(input.disputeId))) % (2n ** 31n))
    : 42;

  const judgeStart = Date.now();
  console.log(`[Judge] LLM judge: requesting verdict (${MODEL}, seed=${seed})...`);

  let response: OpenAI.Chat.Completions.ChatCompletion | null = null;
  let raw = '{"error":"fallback"}';
  try {
    response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      seed,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
    raw = response.choices[0]?.message?.content || '{"error": "No verdict"}';
  } catch (err) {
    console.warn("[Judge] LLM judge failed, using deterministic fallback:", err);
  }
  const judgeElapsed = Date.now() - judgeStart;
  console.log(`[Judge] LLM judge: done in ${judgeElapsed}ms, raw: ${raw.slice(0, 150)}...`);

  let verdict: {
    winner?: string;
    confidenceBps?: number;
    reasoning?: string;
    scores?: Record<string, unknown> | null;
  };
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    verdict = JSON.parse(cleaned);
  } catch {
    verdict = {
      winner: input.debaterA.id,
      confidenceBps: 5000,
      reasoning: raw,
      scores: null,
    };
  }

  const validation = validateVerdict(verdict, input.debaterA.id, input.debaterB.id);
  let validationStatus: "valid" | "fallback";
  let validationErrors: string[] | undefined;
  if (!validation.valid) {
    validationStatus = "fallback";
    validationErrors = validation.errors;
    const scoreA = sumScores(verdict.scores?.debaterA as Record<string, unknown> | undefined);
    const scoreB = sumScores(verdict.scores?.debaterB as Record<string, unknown> | undefined);
    let fallbackWinner: string;
    if (scoreA > scoreB) fallbackWinner = input.debaterA.id;
    else if (scoreB > scoreA) fallbackWinner = input.debaterB.id;
    else {
      const disputeIdForTie = (input.disputeId as Hex) ?? ("0x0000000000000000000000000000000000000000000000000000000000000000" as Hex);
      fallbackWinner = tieBreaker(disputeIdForTie, input.debaterA.id, input.debaterB.id);
    }
    verdict.winner = fallbackWinner;
    verdict.confidenceBps = MIN_CONFIDENCE;
  } else {
    validationStatus = "valid";
  }
  const scoreSummary = {
    scoreA: sumScores(verdict.scores?.debaterA as Record<string, unknown> | undefined),
    scoreB: sumScores(verdict.scores?.debaterB as Record<string, unknown> | undefined),
  };

  const transcriptHash = keccak256(toHex(JSON.stringify(input)));
  const issuedAt = new Date().toISOString();

  let signedVerdict: SignedVerdict | null = null;

  // Use judge's verdict winner (not caller-provided) for signing — must be payer or payee
  const a = (input.debaterA.id as string).toLowerCase();
  const b = (input.debaterB.id as string).toLowerCase();
  const w = String(verdict.winner || "").toLowerCase();
  const winnerAddr =
    w === a ? input.debaterA.id : w === b ? input.debaterB.id : input.winnerAddress;
  if (input.disputeId && winnerAddr) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const confidenceBps = Number(verdict.confidenceBps) || MIN_CONFIDENCE;
      signedVerdict = await signVerdict({
        disputeId: input.disputeId as Hex,
        winner: winnerAddr as Hex,
        confidenceBps: BigInt(confidenceBps),
        issuedAt: BigInt(now),
        deadline: BigInt(now + 86400),
        nonce: BigInt(now),
      });
      console.log(`[Judge] Verdict signed by TEE wallet: ${signedVerdict.signer}`);
    } catch (err) {
      console.error("[Judge] Failed to sign verdict:", err);
    }
  }

  const serializable = signedVerdict
    ? {
        payload: {
          disputeId: signedVerdict.payload.disputeId,
          winner: signedVerdict.payload.winner,
          confidenceBps: signedVerdict.payload.confidenceBps.toString(),
          issuedAt: signedVerdict.payload.issuedAt.toString(),
          deadline: signedVerdict.payload.deadline.toString(),
          nonce: signedVerdict.payload.nonce.toString(),
        },
        digest: signedVerdict.digest,
        signature: signedVerdict.signature,
        signer: signedVerdict.signer,
      }
    : null;

  const eigenaiSignature = (response as { signature?: string } | null)?.signature;

  const normalizedVerdict = {
    winner: verdict.winner ?? input.debaterA.id,
    confidenceBps: Number(verdict.confidenceBps) || MIN_CONFIDENCE,
    reasoning: verdict.reasoning ?? "",
    scores: verdict.scores ?? null,
  };

  return {
    verdict: normalizedVerdict,
    transcriptHash,
    signedVerdict: serializable as any,
    eigenaiModel: MODEL,
    issuedAt,
    eigenaiSeed: seed,
    ...(eigenaiSignature && { eigenaiSignature }),
    validationStatus,
    ...(validationErrors && validationErrors.length > 0 && { validationErrors }),
    scoreSummary,
  };
}

/** Generate a debate argument for a topic (pro or con). Used by listener for live debates. */
export async function generateArgument(
  topic: string,
  side: "pro" | "con",
  context?: string,
): Promise<{ argument: string }> {
  const start = Date.now();
  console.log(`[Judge] LLM generateArgument: ${side.toUpperCase()} (${MODEL}) starting...`);

  const prompt = `You are a world-class debater.
Topic: "${topic}"
Side: ${side.toUpperCase()}
${context ? `Context: ${context}` : ""}

Generate a persuasive, logical, evidence-based argument for your side. Keep it under 500 characters.`;

  let argument = `No argument for ${side} at this time.`;
  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });
    argument = response.choices[0]?.message?.content || argument;
  } catch (err) {
    console.warn(`[Judge] LLM generateArgument failed for ${side.toUpperCase()}, using fallback:`, err);
    argument =
      side === "pro"
        ? `PRO: Decentralized AI improves transparency and reduces single points of control through open protocols and verifiable execution.`
        : `CON: Centralized AI can provide stronger operational accountability, coordinated safety controls, and faster response to incidents.`;
  }

  const elapsed = Date.now() - start;
  const trimmed = argument.trim();
  console.log(`[Judge] LLM generateArgument: ${side.toUpperCase()} done in ${elapsed}ms (${trimmed.length} chars)`);
  return { argument: trimmed };
}
