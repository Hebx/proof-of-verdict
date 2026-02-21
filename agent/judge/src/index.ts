import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { judgeDebate, generateArgument } from "./lib/judge";
import { getWalletAddress } from "./lib/tee-wallet";
import { setArgument, getDispute, isReady, clearDispute } from "./lib/argument-store";
import { validateDebater } from "./lib/escrow-validator";
import { mountMcpOnExpress } from "./mcp";

dotenv.config();

const app = express();
const PORT = process.env.APP_PORT || process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    service: "ProofOfVerdict Judge",
    version: "0.1.0",
    status: "running",
    wallet: getWalletAddress(),
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

app.get("/wallet", (_req, res) => {
  res.json({ address: getWalletAddress() });
});

app.post("/judge", async (req, res) => {
  try {
    const result = await judgeDebate(req.body);
    res.json(result);
  } catch (err) {
    console.error("[Judge] Error:", err);
    res.status(500).json({ error: String(err) });
  }
});

app.post("/generateArgument", async (req, res) => {
  try {
    const { topic, side, context } = req.body;
    if (!topic || !side) {
      res.status(400).json({ error: "topic and side required" });
      return;
    }
    const result = await generateArgument(topic, side, context);
    res.json(result);
  } catch (err) {
    console.error("[Judge] generateArgument Error:", err);
    res.status(500).json({ error: String(err) });
  }
});

app.post("/submitArgument", async (req, res) => {
  try {
    const { disputeId, debaterId, argument, topic } = req.body;
    if (!disputeId || !debaterId || !argument) {
      res.status(400).json({ error: "disputeId, debaterId, and argument required" });
      return;
    }

    const validation = await validateDebater(disputeId as `0x${string}`, debaterId);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const result = setArgument(disputeId, debaterId, argument, topic);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }

    console.log(`[Judge] Argument submitted: disputeId=${disputeId} debaterId=${debaterId}`);
    res.json({ ok: true, disputeId, debaterId });
  } catch (err) {
    console.error("[Judge] submitArgument Error:", err);
    res.status(500).json({ error: String(err) });
  }
});

app.get("/dispute/:disputeId", (req, res) => {
  try {
    const { disputeId } = req.params;
    const entry = getDispute(disputeId);
    if (!entry) {
      res.json({ disputeId, debaterA: null, debaterB: null, ready: false });
      return;
    }
    res.json({
      disputeId: entry.disputeId,
      topic: entry.topic,
      debaterA: entry.debaterA ? { id: entry.debaterA.id, argumentLength: entry.debaterA.argument.length } : null,
      debaterB: entry.debaterB ? { id: entry.debaterB.id, argumentLength: entry.debaterB.argument.length } : null,
      ready: isReady(disputeId),
    });
  } catch (err) {
    console.error("[Judge] getDispute Error:", err);
    res.status(500).json({ error: String(err) });
  }
});

mountMcpOnExpress(app);

app.post("/judgeFromDispute", async (req, res) => {
  try {
    const { disputeId } = req.body;
    if (!disputeId) {
      res.status(400).json({ error: "disputeId required" });
      return;
    }

    const entry = getDispute(disputeId);
    if (!entry?.debaterA || !entry?.debaterB) {
      res.status(400).json({ error: "both arguments required; use POST /submitArgument first" });
      return;
    }

    const topic = entry.topic || process.env.DEBATE_TOPIC || "Resolve this dispute fairly.";
    const result = await judgeDebate({
      topic,
      debaterA: entry.debaterA,
      debaterB: entry.debaterB,
      disputeId,
      winnerAddress: entry.debaterA.id,
    });

    clearDispute(disputeId);
    console.log(`[Judge] Verdict from dispute: disputeId=${disputeId} winner=${result.verdict.winner}`);
    res.json(result);
  } catch (err) {
    console.error("[Judge] judgeFromDispute Error:", err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`[PoV Judge] Running on port ${PORT}`);
  console.log(`[PoV Judge] TEE wallet: ${getWalletAddress()}`);
  console.log(`[PoV Judge] EigenAI: ${process.env.EIGENAI_BASE_URL || "https://api.eigenai.com/v1"}`);
  console.log(`[PoV Judge] Health: http://0.0.0.0:${PORT}/health`);
});
