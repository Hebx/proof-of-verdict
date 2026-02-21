/**
 * Register ProofOfVerdict Judge as ERC-8004 agent (Use Case 2: Trustless Agents)
 *
 * Registers the TEE Judge on-chain for discovery, reputation, and trust signals.
 * Uses Agent0 SDK — see https://docs.eigencloud.xyz/eigenai/howto/build-trustless-agents
 *
 * Prerequisites:
 *   - PINATA_JWT for IPFS (get at pinata.cloud)
 *   - PRIVATE_KEY (owner wallet, will register the agent)
 *   - JUDGE_URL (e.g. http://35.233.167.89:3001)
 *   - TEE_WALLET_ADDRESS (optional, for agent wallet — requires TEE to sign if different from owner)
 *
 * Run: cd scripts && npm run register-judge
 */

import { SDK } from "agent0-sdk";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const RPC_URL = process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PINATA_JWT = process.env.PINATA_JWT;
const JUDGE_URL = process.env.JUDGE_URL ?? "http://35.233.167.89:3001";
const TEE_WALLET_ADDRESS = process.env.TEE_WALLET_ADDRESS ?? "0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC";

// Base Sepolia — Agent0 SDK supports ERC-8004 on Base Sepolia
const CHAIN_ID = 84532;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Missing PRIVATE_KEY in .env");
    process.exit(1);
  }
  if (!PINATA_JWT) {
    console.error("Missing PINATA_JWT in .env (required for IPFS via Pinata)");
    console.error("Get a JWT at https://app.pinata.cloud/");
    process.exit(1);
  }

  console.log("[PoV] Registering Judge as ERC-8004 agent…");
  console.log(`  Chain   : Base Sepolia (${CHAIN_ID})`);
  console.log(`  Judge   : ${JUDGE_URL}`);
  console.log(`  TEE     : ${TEE_WALLET_ADDRESS}`);

  const sdk = new SDK({
    chainId: CHAIN_ID,
    rpcUrl: RPC_URL,
    privateKey: PRIVATE_KEY,
    ipfs: "pinata",
    pinataJwt: PINATA_JWT,
  });

  const agent = sdk.createAgent(
    "ProofOfVerdict Judge",
    "TEE-attested debate judge using EigenAI deterministic inference. Evaluates arguments on logical coherence, evidence quality, and persuasiveness. Signs EIP-712 verdicts for on-chain settlement. Runs in EigenCompute Intel TDX enclave.",
    undefined, // Optional: add image URL for agent avatar
  );

  // MCP endpoint = Judge base URL (TEE uses REST only; MCP disabled — clients use this URL for REST)
  await agent.setMCP(JUDGE_URL.replace(/\/$/, "") + "/", undefined, false);

  // Trust: TEE attestation (EigenCompute), reputation, no crypto-economic stake for now
  agent.setTrust(true, false, true);

  agent.setMetadata({
    version: "0.1.0",
    category: "debate-judge",
    eigenComputeAppId: "0x865104D466143234Cc503E9025CBe54a9131a51A",
    capabilities: ["judge", "generateArgument", "submitArgument", "judgeFromDispute"],
  });

  agent.setActive(true);

  const handle = await agent.registerIPFS();
  const { result } = await handle.waitMined();

  console.log("\n[PoV] Judge registered as ERC-8004 agent");
  console.log(`  Agent ID : ${result.agentId}`);
  console.log(`  Agent URI: ${result.agentURI}`);
  console.log(`  TX       : ${handle.hash}`);

  // Note: To set TEE wallet as agent wallet, run from within TEE or with TEE private key:
  //   const loaded = await sdk.loadAgent(receipt.agentId);
  //   await loaded.setWallet(TEE_WALLET_ADDRESS, { newWalletPrivateKey: TEE_PRIVATE_KEY });
  //   await loaded.registerIPFS();
}

main().catch((err) => {
  console.error("[PoV] Registration failed:", err);
  process.exit(1);
});
