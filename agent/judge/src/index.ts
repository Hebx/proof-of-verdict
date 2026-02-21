import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { judgeDebate, generateArgument } from "./lib/judge";
import { getWalletAddress } from "./lib/tee-wallet";

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

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`[PoV Judge] Running on port ${PORT}`);
  console.log(`[PoV Judge] TEE wallet: ${getWalletAddress()}`);
  console.log(`[PoV Judge] EigenAI: ${process.env.EIGENAI_BASE_URL || "https://api.eigenai.com/v1"}`);
  console.log(`[PoV Judge] Health: http://0.0.0.0:${PORT}/health`);
});
