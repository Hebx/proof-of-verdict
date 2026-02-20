import { ethers } from "ethers";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const REGISTRY_ADDRESS = process.env.VERDICT_REGISTRY_ADDRESS!;
const ESCROW_ADDRESS = process.env.POV_ESCROW_ADDRESS!;
const JUDGE_URL = process.env.JUDGE_AGENT_URL || "http://localhost:3001/entrypoints/judgeDebate/invoke";
const RPC_URL = process.env.BASE_SEPOLIA_RPC!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

if (!RPC_URL || !PRIVATE_KEY) {
  console.error("Missing RPC_URL or PRIVATE_KEY");
  process.exit(1);
}

const registryAbi = [
  "event VerdictRegistered(bytes32 indexed disputeId, address indexed winner, uint256 confidenceBps, uint256 issuedAt, uint256 deadline, uint256 nonce, bytes32 digest)",
];

const escrowAbi = [
  "event EscrowOpened(bytes32 indexed disputeId, address indexed payer, address indexed payee, address token, uint256 amount, uint64 timeout)",
  "function settle(bytes32 disputeId) external",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, wallet);

  console.log("[PoV Listener] Listening for EscrowOpened events...");
  console.log(`  Registry: ${REGISTRY_ADDRESS}`);
  console.log(`  Escrow:   ${ESCROW_ADDRESS}`);

  escrow.on("EscrowOpened", async (disputeId, payer, payee, token, amount) => {
    console.log(`\n[PoV Listener] New escrow opened!`);
    console.log(`  Dispute: ${disputeId}`);
    console.log(`  Payer: ${payer} vs Payee: ${payee}`);
    console.log(`  Amount: ${ethers.formatUnits(amount, 18)} tokens`);

    try {
      console.log("[PoV Listener] Requesting verdict from Judge...");
      const judgeResponse = await axios.post(JUDGE_URL, {
        input: {
          topic: `Dispute ${disputeId}`,
          debaterA: { id: payer, argument: "Challenger argument" },
          debaterB: { id: payee, argument: "Defender argument" },
          debateId: disputeId,
        },
      });

      const { verdict } = judgeResponse.data.output;
      console.log(`[PoV Listener] Verdict: ${verdict.winner} (${verdict.confidenceBps} bps)`);

      console.log("[PoV Listener] Settling escrow...");
      const tx = await escrow.settle(disputeId);
      await tx.wait();
      console.log(`[PoV Listener] Settled! TX: ${tx.hash}`);
    } catch (error) {
      console.error("[PoV Listener] Error:", error);
    }
  });
}

main().catch(console.error);
