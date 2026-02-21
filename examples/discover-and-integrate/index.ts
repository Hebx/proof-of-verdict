/**
 * Discover Judge via Agent0 and integrate.
 * Run: BASE_SEPOLIA_RPC=... npm start
 */
import "dotenv/config";
import {
  discoverJudge,
  createProofOfVerdictAgent,
} from "../../sdk/src/index.js";

async function main() {
  const rpcUrl =
    process.env.BASE_SEPOLIA_RPC ?? process.env.RPC_URL ?? "https://sepolia.base.org";
  const judgeUrl = await discoverJudge({
    chainId: 84532,
    rpcUrl,
    fallbackUrl: process.env.JUDGE_URL,
  });
  console.log("Discovered Judge:", judgeUrl);
  const agent = await createProofOfVerdictAgent({
    rpcUrl,
    judgeUrl,
  });
  const status = await agent.getDisputeStatus(
    "0x" + "00".repeat(32),
  );
  console.log("Dispute status:", status);
}

main().catch(console.error);
