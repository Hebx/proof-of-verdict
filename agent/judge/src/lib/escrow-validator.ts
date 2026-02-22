/**
 * Validates that a debaterId is payer or payee for a dispute.
 * Requires BASE_SEPOLIA_RPC and POV_ESCROW_ADDRESS.
 */

import { createPublicClient, http, type Address, type Hex } from "viem";
import { baseSepolia } from "viem/chains";

const MIN_CONFIDENCE = 6000;

const escrowAbi = [
  {
    type: "function",
    name: "getEscrow",
    inputs: [{ name: "disputeId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
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
      },
    ],
    stateMutability: "view",
  },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

function getClient() {
  if (!_client) {
    const rpc = process.env.BASE_SEPOLIA_RPC;
    if (!rpc) throw new Error("BASE_SEPOLIA_RPC required for escrow validation");
    _client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpc),
    });
  }
  return _client;
}

export async function validateDebater(
  disputeId: Hex,
  debaterId: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const escrowAddr = process.env.POV_ESCROW_ADDRESS as Address;
    if (!escrowAddr) {
      return { valid: false, error: "POV_ESCROW_ADDRESS not configured" };
    }

    const escrow = await getClient().readContract({
      address: escrowAddr,
      abi: escrowAbi,
      functionName: "getEscrow",
      args: [disputeId],
    });

    if (!escrow || escrow.payer === "0x0000000000000000000000000000000000000000") {
      return { valid: false, error: "escrow does not exist" };
    }

    const debaterLower = debaterId.toLowerCase();
    const payerLower = escrow.payer.toLowerCase();
    const payeeLower = escrow.payee.toLowerCase();

    if (debaterLower !== payerLower && debaterLower !== payeeLower) {
      return { valid: false, error: "debaterId must be payer or payee" };
    }

    if (escrow.settled || escrow.refunded) {
      return { valid: false, error: "escrow already finalized" };
    }

    return { valid: true };
  } catch (err) {
    console.error("[Judge] Escrow validation error:", err);
    return { valid: false, error: String(err) };
  }
}

export async function validateVerdictForSettlement(
  disputeId: Hex,
  signedVerdict: {
    payload: { disputeId: Hex; winner: string; confidenceBps: string };
    signature: Hex;
  },
): Promise<{ valid: boolean; error?: string }> {
  try {
    const escrowAddr = process.env.POV_ESCROW_ADDRESS as Address;
    if (!escrowAddr) return { valid: false, error: "POV_ESCROW_ADDRESS not configured" };
    const escrow = await getClient().readContract({
      address: escrowAddr,
      abi: escrowAbi,
      functionName: "getEscrow",
      args: [disputeId],
    });
    if (!escrow || escrow.payer === "0x0000000000000000000000000000000000000000") {
      return { valid: false, error: "escrow does not exist" };
    }
    const { payload, signature } = signedVerdict;
    const winner = payload.winner.toLowerCase();
    const payer = escrow.payer.toLowerCase();
    const payee = escrow.payee.toLowerCase();
    if (winner !== payer && winner !== payee) {
      return { valid: false, error: "winner must be payer or payee" };
    }
    const conf = parseInt(payload.confidenceBps, 10);
    if (!Number.isInteger(conf) || conf < MIN_CONFIDENCE) {
      return { valid: false, error: `confidenceBps must be >= ${MIN_CONFIDENCE}` };
    }
    if (!signature || signature.length < 2) {
      return { valid: false, error: "signature required" };
    }
    if (payload.disputeId !== disputeId) {
      return { valid: false, error: "disputeId mismatch" };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}
