import { ethers } from "ethers";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const CONTRACT_ADDRESS = "0x1324a1E9ECECa60c9DB8dc31f0F5f04a65cE5c5c";
const JUDGE_AGENT_URL = "http://localhost:3000/entrypoints/judgeDebate/invoke";
const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!RPC_URL || !PRIVATE_KEY) {
  console.error("Missing environment variables");
  process.exit(1);
}

const abi = [
  "event DebateJoined(uint256 indexed id, address opponent)",
  "function debates(uint256) view returns (uint256 id, address creator, address opponent, uint256 wager, string topic, uint8 status, address winner, address judge)",
  "function settleDebate(uint256 debateId, address winner, string reason) external"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

  console.log("Listening for DebateJoined events on Base Sepolia...");

  contract.on("DebateJoined", async (debateId, opponent) => {
    console.log(`New Debate Joined! ID: ${debateId}, Opponent: ${opponent}`);

    try {
      // 1. Fetch debate details
      const debate = await contract.debates(debateId);
      console.log(`Topic: ${debate.topic}`);

      // 2. Call Judge Agent
      // Note: In a real scenario, we'd fetch the arguments from a database or IPFS.
      // For now, we'll use mock arguments.
      console.log("Requesting verdict from Judge Agent...");
      const judgeResponse = await axios.post(JUDGE_AGENT_URL, {
        input: {
          topic: debate.topic,
          debaterA: {
            id: "Agent_Pro",
            argument: "Pro argument placeholder: This technology enhances human productivity by 10x."
          },
          debaterB: {
            id: "Agent_Con",
            argument: "Con argument placeholder: This technology poses significant privacy risks to users."
          }
        }
      });

      const verdict = judgeResponse.data.output.verdict;
      const winnerAddress = verdict.winner === "Agent_Pro" ? debate.creator : debate.opponent;
      
      console.log(`Verdict received! Winner: ${verdict.winner} (${winnerAddress})`);
      console.log(`Reasoning: ${verdict.reasoning}`);

      // 3. Settle Debate on-chain
      console.log("Settling debate on-chain...");
      const tx = await contract.settleDebate(debateId, winnerAddress, verdict.reasoning);
      await tx.wait();
      
      console.log(`Debate ${debateId} settled successfully! TX: ${tx.hash}`);

    } catch (error) {
      console.error("Error processing judgement:", error);
    }
  });
}

main().catch(console.error);
