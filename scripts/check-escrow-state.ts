import { createPublicClient, http, type Hex, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const RPC_URL = process.env.BASE_SEPOLIA_RPC!;
const ESCROW_ADDRESS = process.env.POV_ESCROW_ADDRESS as Address;
const DISPUTE_ID = process.env.DISPUTE_ID as Hex;

const escrowAbi = [
  {
    type: "function",
    name: "getEscrow",
    inputs: [{ name: "disputeId", type: "bytes32" }],
    outputs: [
      {
        components: [
          { name: "token", type: "address" },
          { name: "payer", type: "address" },
          { name: "payee", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "createdAt", type: "uint64" },
          { name: "timeout", type: "uint64" },
          { name: "settled", type: "bool" },
          { name: "refunded", type: "bool" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
  },
] as const;

async function main() {
  if (!RPC_URL || !ESCROW_ADDRESS || !DISPUTE_ID) {
    console.error("Missing BASE_SEPOLIA_RPC / POV_ESCROW_ADDRESS / DISPUTE_ID");
    process.exit(1);
  }

  const client = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const e = await client.readContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "getEscrow",
    args: [DISPUTE_ID],
  });

  console.log(`[check-escrow] settled=${e.settled} refunded=${e.refunded} amount=${e.amount.toString()}`);

  if (!e.settled && !e.refunded) {
    console.error("[check-escrow] Escrow is still unresolved.");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
