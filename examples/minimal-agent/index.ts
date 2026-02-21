/**
 * Minimal agent integration example.
 * Run: DISPUTE_ID=0x... JUDGE_URL=http://35.233.167.89:3001 npm start
 *
 * Prerequisites: Run scripts/open-escrow first, set DISPUTE_ID from output.
 */
import "dotenv/config";
import { ProofOfVerdictAgent } from "../../sdk/src/index.js";

const JUDGE_URL = process.env.JUDGE_URL ?? "http://35.233.167.89:3001";
const DISPUTE_ID = process.env.DISPUTE_ID;
const PAYER = "0x46Ca9120Ea33E7AF921Db0a230831CB08AeB2910";
const PAYEE = "0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC";

async function main() {
  if (!DISPUTE_ID) {
    console.error("Set DISPUTE_ID (from scripts/open-escrow output)");
    process.exit(1);
  }
  const agent = new ProofOfVerdictAgent({ judgeUrl: JUDGE_URL });

  console.log("Submitting Agent A (payer) argument...");
  await agent.submitArgument(
    DISPUTE_ID,
    PAYER,
    "PRO: Decentralized AI is more trustworthy due to TEE attestation.",
  );
  console.log("Submitting Agent B (payee) argument...");
  await agent.submitArgument(
    DISPUTE_ID,
    PAYEE,
    "CON: Centralized AI has better accountability and audit trails.",
  );
  console.log("Polling until ready...");
  const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 min
  const start = Date.now();
  let status;
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    status = await agent.getDisputeStatus(DISPUTE_ID);
    if (status.ready) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!status?.ready) throw new Error("Polling timed out; dispute not ready");
  const verdict = await agent.requestVerdict(DISPUTE_ID);
  console.log("Verdict:", JSON.stringify(verdict, null, 2));
}

main().catch(console.error);
