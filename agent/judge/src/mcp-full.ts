/**
 * MCP (Model Context Protocol) tools for ProofOfVerdict Judge.
 * Exposes submit_argument, get_dispute_status, request_verdict for agent orchestration.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { setArgument, getDispute, isReady, clearDispute } from "./lib/argument-store";
import { judgeDebate } from "./lib/judge";
import { validateDebater } from "./lib/escrow-validator";

function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "proof-of-verdict-judge",
      version: "0.1.0",
    },
    { capabilities: { tools: {} } },
  );

  const srv = server.server;

  srv.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "submit_argument",
        description: "Submit your argument for a dispute. debaterId must be payer or payee from the escrow.",
        inputSchema: zodToJsonSchema(
          z.object({
            disputeId: z.string().describe("Hex dispute ID (bytes32)"),
            debaterId: z.string().describe("Your address (payer or payee)"),
            argument: z.string().max(2000).describe("Your argument text"),
            topic: z.string().optional().describe("Debate topic (optional)"),
          }),
          { target: "jsonSchema2019-09" },
        ) as object,
      },
      {
        name: "get_dispute_status",
        description: "Get dispute status. Returns whether both arguments are submitted.",
        inputSchema: zodToJsonSchema(
          z.object({
            disputeId: z.string().describe("Hex dispute ID"),
          }),
          { target: "jsonSchema2019-09" },
        ) as object,
      },
      {
        name: "request_verdict",
        description: "Request verdict when both arguments are submitted. Returns signed verdict for on-chain registration.",
        inputSchema: zodToJsonSchema(
          z.object({
            disputeId: z.string().describe("Hex dispute ID"),
          }),
          { target: "jsonSchema2019-09" },
        ) as object,
      },
    ],
  }));

  srv.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const a = (args || {}) as Record<string, unknown>;

    if (name === "submit_argument") {
      const disputeId = a.disputeId as string;
      const debaterId = a.debaterId as string;
      const argument = a.argument as string;
      const topic = a.topic as string | undefined;

      if (!disputeId || !debaterId || !argument) {
        return {
          content: [{ type: "text", text: "disputeId, debaterId, and argument required" }],
          isError: true,
        };
      }

      const validation = await validateDebater(disputeId as `0x${string}`, debaterId);
      if (!validation.valid) {
        return {
          content: [{ type: "text", text: validation.error ?? "Validation failed" }],
          isError: true,
        };
      }

      const result = setArgument(disputeId, debaterId, argument, topic);
      if (!result.ok) {
        return {
          content: [{ type: "text", text: result.error ?? "Failed" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true, disputeId, debaterId }) }],
      };
    }

    if (name === "get_dispute_status") {
      const disputeId = a.disputeId as string;
      if (!disputeId) {
        return {
          content: [{ type: "text", text: "disputeId required" }],
          isError: true,
        };
      }

      const entry = getDispute(disputeId);
      const status = {
        disputeId,
        topic: entry?.topic,
        debaterA: entry?.debaterA ? { id: entry.debaterA.id, argumentLength: entry.debaterA.argument.length } : null,
        debaterB: entry?.debaterB ? { id: entry.debaterB.id, argumentLength: entry.debaterB.argument.length } : null,
        ready: isReady(disputeId),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(status) }],
      };
    }

    if (name === "request_verdict") {
      const disputeId = a.disputeId as string;
      if (!disputeId) {
        return {
          content: [{ type: "text", text: "disputeId required" }],
          isError: true,
        };
      }

      const entry = getDispute(disputeId);
      if (!entry?.debaterA || !entry?.debaterB) {
        return {
          content: [{ type: "text", text: "Both arguments required. Use submit_argument first." }],
          isError: true,
        };
      }

      try {
        const topic = entry.topic || process.env.DEBATE_TOPIC || "Resolve this dispute fairly.";
        const result = await judgeDebate({
          topic,
          debaterA: entry.debaterA,
          debaterB: entry.debaterB,
          disputeId,
          winnerAddress: entry.debaterA.id,
        });
        clearDispute(disputeId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  return server;
}

export function mountMcpOnExpress(app: import("express").Express): void {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  server.connect(transport).catch((err) => {
    console.error("[Judge] MCP transport connect error:", err);
  });

  app.post("/mcp", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      res.status(400).json({ jsonrpc: "2.0", error: { code: -32600, message: "Request body must be JSON object" }, id: null });
      return;
    }

    try {
      await transport.handleRequest(req, res, payload as object);
    } catch (err) {
      console.error("[Judge] MCP handleRequest error:", err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: String(err) }, id: null });
      }
    }
  });

  app.options("/mcp", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
    res.status(204).end();
  });

  console.log("[Judge] MCP endpoint: POST /mcp");
}
