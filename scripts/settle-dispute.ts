/**
 * Manually settle a dispute using the Judge verdict.
 * Use when listener didn't catch the event (e.g. RPC subscription issues).
 *
 * Usage: DISPUTE_ID=0x... npm run settle-dispute
 * Or pass disputeId as arg after fetching verdict from Judge.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const RPC_URL = process.env.BASE_SEPOLIA_RPC!;
const PRIVATE_KEY = process.env.PRIVATE_KEY! as Hex;
const REGISTRY_ADDRESS = (process.env.VERDICT_REGISTRY_ADDRESS ??
  "0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962") as Address;
const ESCROW_ADDRESS = (process.env.POV_ESCROW_ADDRESS ??
  "0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82") as Address;
const JUDGE_URL = process.env.JUDGE_URL ?? "http://35.233.167.89:3001";
const DEBATE_TOPIC = process.env.DEBATE_TOPIC ?? "Is decentralized AI more trustworthy than centralized AI?";

const registryAbi = [
  {
    type: "function",
    name: "verdictRegistered",
    inputs: [{ name: "disputeId", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registerVerdict",
    inputs: [
      {
        name: "verdict",
        type: "tuple",
        components: [
          { name: "disputeId", type: "bytes32" },
          { name: "winner", type: "address" },
          { name: "confidenceBps", type: "uint256" },
          { name: "issuedAt", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "nonce", type: "uint256" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
] as const;

const escrowAbi = [
  {
    type: "function",
    name: "settle",
    inputs: [{ name: "disputeId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

async function main() {
  const disputeId = (process.env.DISPUTE_ID ?? process.argv[2]) as Hex;
  if (!disputeId) {
    console.error("Usage: DISPUTE_ID=0x... npx tsx settle-dispute.ts");
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

  const payer = account.address;
  const payee = "0x483a425aa0f3a43C10883ea2372Cf5dc03F075dC" as Address;

  const alreadyRegistered = await publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: registryAbi,
    functionName: "verdictRegistered",
    args: [disputeId],
  });

  if (!alreadyRegistered) {
    console.log("[settle-dispute] Verdict not yet registered. Fetching from Judge (2-agent debate)...");
    const argA = await (
      await fetch(`${JUDGE_URL}/generateArgument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: DEBATE_TOPIC, side: "pro", context: `Payer ${payer} argues for.` }),
      })
    ).json();
    const argB = await (
      await fetch(`${JUDGE_URL}/generateArgument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: DEBATE_TOPIC, side: "con", context: `Payee ${payee} argues against.` }),
      })
    ).json();

    console.log("[settle-dispute] Requesting verdict from Judge...");
    const judgeRes = await fetch(`${JUDGE_URL}/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: DEBATE_TOPIC,
        debaterA: { id: payer, argument: argA.argument },
        debaterB: { id: payee, argument: argB.argument },
        disputeId,
        winnerAddress: payer,
      }),
    });
    const judge = (await judgeRes.json()) as any;
    if (!judge.signedVerdict) {
      console.error("[settle-dispute] No signed verdict:", judge);
      process.exit(1);
    }

    const { payload, signature } = judge.signedVerdict;
    console.log(`[settle-dispute] Winner: ${payload.winner}`);

    console.log("[settle-dispute] Registering verdict...");
    const { request: regReq } = await publicClient.simulateContract({
      address: REGISTRY_ADDRESS,
      abi: registryAbi,
      functionName: "registerVerdict",
      args: [
        {
          disputeId: payload.disputeId,
          winner: payload.winner,
          confidenceBps: BigInt(payload.confidenceBps),
          issuedAt: BigInt(payload.issuedAt),
          deadline: BigInt(payload.deadline),
          nonce: BigInt(payload.nonce),
        },
        signature,
      ],
      account,
    });
    const regHash = await walletClient.writeContract(regReq);
    await publicClient.waitForTransactionReceipt({ hash: regHash });
    console.log(`[settle-dispute] Verdict registered: ${regHash}`);
  } else {
    console.log("[settle-dispute] Verdict already registered, skipping to settle.");
  }

  console.log("[settle-dispute] Settling escrow...");
  let settleHash: `0x${string}`;
  try {
    const { request: settleReq } = await publicClient.simulateContract({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      functionName: "settle",
      args: [disputeId],
      account,
    });
    settleHash = await walletClient.writeContract(settleReq);
  } catch (simErr) {
    // Some RPCs return stale state for simulate; try direct write
    console.log("[settle-dispute] Simulate failed, trying direct write...");
    settleHash = await walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      functionName: "settle",
      args: [disputeId],
      account,
    });
  }
  await publicClient.waitForTransactionReceipt({ hash: settleHash });
  console.log(`[settle-dispute] Escrow settled: ${settleHash}`);
  console.log("[settle-dispute] Done ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
