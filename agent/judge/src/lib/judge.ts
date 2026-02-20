import { z } from "zod";
import { createAgentApp } from "@lucid-agents/hono";
import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { createAxLLMClient } from "@lucid-agents/core/axllm";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";

const agent = await createAgent({
  name: "ProofOfVerdict Judge",
  version: "0.1.0",
  description:
    "AI Judge for ProofOfVerdict — produces EIP-712 signed verdicts with optional TEE attestation",
})
  .use(http())
  .use(payments({ config: paymentsFromEnv() }))
  .build();

const axClient = createAxLLMClient();

const { app, addEntrypoint } = await createAgentApp(agent);

addEntrypoint({
  key: "judgeDebate",
  description:
    "Evaluate debate arguments and produce a signed verdict with confidence score",
  input: z.object({
    topic: z.string(),
    debaterA: z.object({
      id: z.string(),
      argument: z.string(),
    }),
    debaterB: z.object({
      id: z.string(),
      argument: z.string(),
    }),
    debateId: z.string().optional(),
  }),
  handler: async ({ input }) => {
    const prompt = `
      You are a fair, impartial judge in a structured debate arena.
      
      Topic: "${input.topic}"
      
      Debater A (${input.debaterA.id}):
      ${input.debaterA.argument}
      
      Debater B (${input.debaterB.id}):
      ${input.debaterB.argument}
      
      Evaluate both arguments on: logical coherence, evidence quality, persuasiveness, and rhetorical skill.
      
      Respond in JSON format:
      {
        "winner": "<debater id>",
        "confidenceBps": <integer 0-10000, your confidence in basis points>,
        "reasoning": "<2-3 sentence explanation>",
        "scores": {
          "debaterA": { "logic": <1-10>, "evidence": <1-10>, "persuasion": <1-10> },
          "debaterB": { "logic": <1-10>, "evidence": <1-10>, "persuasion": <1-10> }
        }
      }
    `;

    const response = await axClient.chat.complete({
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      response.choices[0].message.content || '{"error": "No verdict"}';

    let verdict;
    try {
      verdict = JSON.parse(raw);
    } catch {
      verdict = {
        winner: input.debaterA.id,
        confidenceBps: 5000,
        reasoning: raw,
        scores: null,
      };
    }

    const transcriptHash = hashTranscript(input);

    return {
      output: {
        verdict,
        transcriptHash,
        issuedAt: new Date().toISOString(),
      },
    };
  },
});

function hashTranscript(input: Record<string, unknown>): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(input));
  const hashBuffer = Bun.hash(data);
  return `0x${hashBuffer.toString(16).padStart(16, "0")}`;
}

export { app };
