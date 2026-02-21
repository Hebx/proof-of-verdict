import OpenAI from "openai";
import { keccak256, toHex, type Hex } from "viem";
import { signVerdict, type SignedVerdict } from "./verdict-signer";

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

const MODEL = process.env.EIGENAI_MODEL || "gpt-oss-120b-f16";

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

  console.log(`[Judge] Requesting verdict from EigenAI (${MODEL})...`);

  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  const raw = response.choices[0]?.message?.content || '{"error": "No verdict"}';
  console.log(`[Judge] Raw response: ${raw.slice(0, 200)}`);

  let verdict;
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

  const transcriptHash = keccak256(toHex(JSON.stringify(input)));
  const issuedAt = new Date().toISOString();

  let signedVerdict: SignedVerdict | null = null;

  if (input.disputeId && input.winnerAddress) {
    try {
      const now = Math.floor(Date.now() / 1000);
      signedVerdict = await signVerdict({
        disputeId: input.disputeId as Hex,
        winner: input.winnerAddress as Hex,
        confidenceBps: BigInt(verdict.confidenceBps),
        issuedAt: BigInt(now),
        deadline: BigInt(now + 86400),
        nonce: BigInt(now),
      });
      console.log(`[Judge] Verdict signed by TEE wallet: ${signedVerdict.signer}`);
    } catch (err) {
      console.error("[Judge] Failed to sign verdict:", err);
    }
  }

  return { verdict, transcriptHash, signedVerdict, eigenaiModel: MODEL, issuedAt };
}
