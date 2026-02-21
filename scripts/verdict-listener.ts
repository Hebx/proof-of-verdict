import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiItem,
  type Hex,
  type Address,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

// ── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.BASE_SEPOLIA_RPC!;
const PRIVATE_KEY = process.env.PRIVATE_KEY! as Hex;
const REGISTRY_ADDRESS = (process.env.VERDICT_REGISTRY_ADDRESS ??
  "0xf68dDB6c1A075F29A5b89eb0a24728652f4Ab962") as Address;
const ESCROW_ADDRESS = (process.env.POV_ESCROW_ADDRESS ??
  "0xEd0cdbfD19b8e3e1f0E6BB95e047731EbC8a4B82") as Address;
const JUDGE_URL =
  process.env.JUDGE_URL ?? "http://35.233.167.89:3001";
const JUDGE_TIMEOUT_MS = 120_000;
const DEBATE_TOPIC =
  process.env.DEBATE_TOPIC ?? "Is decentralized AI more trustworthy than centralized AI?";

if (!RPC_URL || !PRIVATE_KEY) {
  console.error("Missing BASE_SEPOLIA_RPC or PRIVATE_KEY in .env");
  process.exit(1);
}

// ── ABIs ────────────────────────────────────────────────────────────────────

const escrowAbi = [
  {
    type: "event",
    name: "EscrowOpened",
    inputs: [
      { name: "disputeId", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "payee", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timeout", type: "uint64", indexed: false },
    ],
  },
  {
    type: "function",
    name: "settle",
    inputs: [{ name: "disputeId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const registryAbi = [
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

// ── Types ───────────────────────────────────────────────────────────────────

interface TeeJudgeRequest {
  topic: string;
  debaterA: { id: string; argument: string };
  debaterB: { id: string; argument: string };
  disputeId: string;
  winnerAddress: string;
}

interface TeeJudgeResponse {
  verdict: {
    winner: string;
    confidenceBps: number;
    reasoning: string;
    scores: Record<string, unknown>;
  };
  transcriptHash: Hex;
  signedVerdict: {
    payload: {
      disputeId: Hex;
      winner: Address;
      confidenceBps: string;
      issuedAt: string;
      deadline: string;
      nonce: string;
    };
    digest: Hex;
    signature: Hex;
    signer: Address;
  };
  eigenaiModel: string;
  issuedAt: string;
}

// ── Clients ─────────────────────────────────────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────────────────────

async function generateArgument(
  side: "pro" | "con",
  context?: string,
): Promise<string> {
  const res = await fetch(`${JUDGE_URL}/generateArgument`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: DEBATE_TOPIC, side, context }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`generateArgument ${side} failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { argument: string };
  return data.argument;
}

async function requestVerdict(
  disputeId: Hex,
  payer: Address,
  payee: Address,
): Promise<TeeJudgeResponse> {
  // Step 0: Get live debate arguments from both agents
  console.log("[PoV Listener] Agent A (payer) generating PRO argument…");
  const argA = await generateArgument("pro", `Payer ${payer} argues for.`);
  console.log("[PoV Listener] Agent B (payee) generating CON argument…");
  const argB = await generateArgument("con", `Payee ${payee} argues against.`);
  console.log("[PoV Listener] Arguments received, requesting verdict…");

  const body: TeeJudgeRequest = {
    topic: DEBATE_TOPIC,
    debaterA: { id: payer, argument: argA },
    debaterB: { id: payee, argument: argB },
    disputeId,
    winnerAddress: payer, // Fallback only; judge uses verdict.winner for signing
  };

  const res = await fetch(`${JUDGE_URL}/judge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TEE Judge returned ${res.status}: ${text}`);
  }

  return res.json() as Promise<TeeJudgeResponse>;
}

async function registerVerdict(judge: TeeJudgeResponse): Promise<Hex> {
  const { payload, signature } = judge.signedVerdict;

  const { request } = await publicClient.simulateContract({
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

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function settleEscrow(disputeId: Hex): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "settle",
    args: [disputeId],
    account,
  });

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[PoV Listener] Watching for EscrowOpened events…");
  console.log(`  Registry : ${REGISTRY_ADDRESS}`);
  console.log(`  Escrow   : ${ESCROW_ADDRESS}`);
  console.log(`  Judge    : ${JUDGE_URL}`);
  console.log(`  Operator : ${account.address}`);

  publicClient.watchContractEvent({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    eventName: "EscrowOpened",
    onLogs: (logs) => {
      for (const log of logs) {
        handleEscrowOpened(log).catch((err) =>
          console.error("[PoV Listener] Error handling event:", err),
        );
      }
    },
  });
}

async function handleEscrowOpened(log: any) {
  const { disputeId, payer, payee, token, amount, timeout } = log.args;

  console.log(`\n[PoV Listener] EscrowOpened — 2 agents will debate live`);
  console.log(`  Topic   : ${DEBATE_TOPIC}`);
  console.log(`  Dispute : ${disputeId}`);
  console.log(`  Payer   : ${payer} (Agent A, PRO)`);
  console.log(`  Payee   : ${payee} (Agent B, CON)`);
  console.log(`  Token   : ${token}`);
  console.log(`  Amount  : ${formatUnits(amount, 18)}`);
  console.log(`  Timeout : ${timeout}s`);

  // Step 1 – get signed verdict from TEE Judge
  console.log("[PoV Listener] Requesting verdict from TEE Judge…");
  const judgeResult = await requestVerdict(disputeId, payer, payee);

  const sv = judgeResult.signedVerdict;
  const v = judgeResult.verdict;
  console.log(`[PoV Listener] Verdict received`);
  console.log(`  Winner        : ${sv.payload.winner}`);
  console.log(`  Confidence    : ${sv.payload.confidenceBps} bps`);
  console.log(`  Reasoning     : ${v.reasoning}`);
  console.log(`  Signer (TEE)  : ${sv.signer}`);

  // Step 2 – register verdict on-chain
  console.log("[PoV Listener] Registering verdict on VerdictRegistry…");
  const regTx = await registerVerdict(judgeResult);
  console.log(`  TX: ${regTx}`);

  // Step 3 – settle the escrow
  console.log("[PoV Listener] Settling escrow…");
  const settleTx = await settleEscrow(disputeId);
  console.log(`  TX: ${settleTx}`);

  console.log("[PoV Listener] Done ✓");
}

main().catch((err) => {
  console.error("[PoV Listener] Fatal:", err);
  process.exit(1);
});
