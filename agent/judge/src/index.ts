import { Hono } from "hono";
import { judgeDebate } from "./lib/judge";
import { getWalletAddress } from "./lib/tee-wallet";

const app = new Hono();
const port = parseInt(process.env.PORT || "3001");

app.get("/", (c) => c.json({ service: "ProofOfVerdict Judge", version: "0.1.0", status: "running" }));

app.get("/health", (c) => c.json({ ok: true, timestamp: Date.now() }));

app.get("/wallet", async (c) => {
  const address = getWalletAddress();
  return c.json({ address });
});

app.post("/judge", async (c) => {
  const body = await c.req.json();
  const result = await judgeDebate(body);
  return c.json(result);
});

console.log(`[PoV Judge] Starting on port ${port}...`);
console.log(`[PoV Judge] TEE wallet: ${getWalletAddress()}`);
console.log(`[PoV Judge] EigenAI: ${process.env.EIGENAI_BASE_URL || "https://api.eigenai.com/v1"}`);

export default { port, fetch: app.fetch };
