import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const RPC_URL = process.env.BASE_SEPOLIA_RPC!;
const PRIVATE_KEY = process.env.PRIVATE_KEY! as Hex;
const ESCROW_ADDRESS = process.env.POV_ESCROW_ADDRESS! as Address;
const DISPUTE_ID = process.env.DISPUTE_ID! as Hex;

const escrowAbi = [
  {
    type: "function",
    name: "refund",
    inputs: [{ name: "disputeId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

async function main() {
  if (!RPC_URL || !PRIVATE_KEY || !ESCROW_ADDRESS || !DISPUTE_ID) {
    throw new Error("Missing BASE_SEPOLIA_RPC / PRIVATE_KEY / POV_ESCROW_ADDRESS / DISPUTE_ID");
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

  const { request } = await publicClient.simulateContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "refund",
    args: [DISPUTE_ID],
    account,
  });
  const tx = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`[refund-dispute] Refunded. TX: ${tx}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
