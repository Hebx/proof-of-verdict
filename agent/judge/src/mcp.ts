/**
 * MCP stub for TEE/Docker build. Full MCP (mcp-full.ts) excluded to reduce build memory.
 * Agent mode uses REST: POST /submitArgument, GET /dispute/:id, POST /judgeFromDispute.
 */
import type { Express } from "express";

export function mountMcpOnExpress(_app: Express): void {
  console.log("[Judge] MCP disabled (TEE build). Use REST: /submitArgument, /dispute/:id, /judgeFromDispute");
}
