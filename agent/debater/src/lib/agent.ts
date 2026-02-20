import { z } from "zod";

import { createAgentApp } from "@lucid-agents/hono";

import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { createAxLLMClient } from "@lucid-agents/core/axllm";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";

const agent = await createAgent({
  name: "ProofOfVerdict Debater",
  version: "0.1.0",
  description: "Autonomous AI Debater for ProofOfVerdict arena",
})
  .use(http())
  .use(payments({ config: paymentsFromEnv() }))
  .build();

const axClient = createAxLLMClient();

const { app, addEntrypoint } = await createAgentApp(agent);

// Entrypoint: generateArgument
// This allows the debater to participate in a MoltCourt debate.
addEntrypoint({
  key: "generateArgument",
  description: "Generate a persuasive argument for a debate topic",
  input: z.object({
    topic: z.string(),
    side: z.enum(["pro", "con"]),
    context: z.string().optional(),
  }),
  handler: async ({ input }) => {
    const prompt = `
      You are a world-class debater. 
      Topic: "${input.topic}"
      Side: "${input.side}"
      ${input.context ? `Context: ${input.context}` : ""}
      
      Generate a persuasive, logical, and evidence-based argument for your side.
      Keep it under 1000 characters.
    `;

    const response = await axClient.chat.complete({
      messages: [{ role: "user", content: prompt }],
    });

    const argument = response.choices[0].message.content || "I have no argument at this time.";

    return {
      output: {
        argument,
        timestamp: new Date().toISOString(),
      },
    };
  },
});

export { app };
