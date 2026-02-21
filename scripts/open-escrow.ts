/**
 * Open an escrow on PovEscrowERC20 (Base Sepolia).
 * Requires: Deploy MockERC20 first (forge script DeployMockERC20), set POV_TOKEN_ADDRESS.
 * Payer (PRIVATE_KEY) must have tokens. Run verdict-listener to trigger settlement.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type Address,
  parseUnits,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const RPC_URL = process.env.BASE_SEPOLIA_RPC!;
const PRIVATE_KEY = process.env.PRIVATE_KEY! as Hex;
const ESCROW_ADDRESS = (process.env.POV_ESCROW_ADDRESS ??
  "0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82") as Address;
const TOKEN_ADDRESS = process.env.POV_TOKEN_ADDRESS! as Address;
const PAYEE = process.env.PAYEE_ADDRESS! as Address;

const escrowAbi = [
  {
    type: "function",
    name: "openEscrow",
    inputs: [
      { name: "disputeId", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "payee", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "timeout", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

async function main() {
  if (!RPC_URL || !PRIVATE_KEY || !TOKEN_ADDRESS || !PAYEE) {
    console.error(
      "Missing: BASE_SEPOLIA_RPC, PRIVATE_KEY, POV_TOKEN_ADDRESS, PAYEE_ADDRESS",
    );
    process.exit(1);
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const disputeId = keccak256(
    toHex(`pov-dispute-${Date.now()}-${Math.random().toString(36).slice(2)}`),
  );
  const amount = parseUnits("100", 18);
  const timeout = 86400; // 1 day

  console.log("[open-escrow] Payer:", account.address);
  console.log("[open-escrow] Payee:", PAYEE);
  console.log("[open-escrow] Token:", TOKEN_ADDRESS);
  console.log("[open-escrow] Amount: 100 POV");
  console.log("[open-escrow] DisputeId:", disputeId);

  // 1. Approve escrow (payer must already have tokens from DeployMockERC20)
  console.log("[open-escrow] Approving escrow…");
  const { request: approveReq } = await publicClient.simulateContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "approve",
    args: [ESCROW_ADDRESS, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")], // max approval
    account,
  });
  const approveHash = await walletClient.writeContract(approveReq);
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log("[open-escrow] Approved. TX:", approveHash);

  // 2. Open escrow
  console.log("[open-escrow] Opening escrow…");
  const { request: openReq } = await publicClient.simulateContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "openEscrow",
    args: [disputeId, TOKEN_ADDRESS, PAYEE, amount, timeout],
    account,
  });
  const openHash = await walletClient.writeContract(openReq);
  await publicClient.waitForTransactionReceipt({ hash: openHash });
  console.log("[open-escrow] EscrowOpened. TX:", openHash);
  console.log("[open-escrow] Done. Listener (if running) will auto-settle.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
