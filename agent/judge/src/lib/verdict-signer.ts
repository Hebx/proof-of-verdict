import { getAccount } from "./tee-wallet";
import { hashTypedData, type Hex } from "viem";
import { baseSepolia } from "viem/chains";

const REGISTRY_ADDRESS = process.env.VERDICT_REGISTRY_ADDRESS as Hex;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "84532");

const domain = {
  name: "VerdictRegistry" as const,
  version: "1" as const,
  chainId: CHAIN_ID,
  verifyingContract: REGISTRY_ADDRESS,
} as const;

const types = {
  Verdict: [
    { name: "disputeId", type: "bytes32" },
    { name: "winner", type: "address" },
    { name: "confidenceBps", type: "uint256" },
    { name: "issuedAt", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export interface VerdictPayload {
  disputeId: Hex;
  winner: Hex;
  confidenceBps: bigint;
  issuedAt: bigint;
  deadline: bigint;
  nonce: bigint;
}

export interface SignedVerdict {
  payload: VerdictPayload;
  digest: Hex;
  signature: Hex;
  signer: string;
}

export async function signVerdict(payload: VerdictPayload): Promise<SignedVerdict> {
  const account = getAccount();

  const digest = hashTypedData({
    domain,
    types,
    primaryType: "Verdict",
    message: payload,
  });

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: "Verdict",
    message: payload,
  });

  return {
    payload,
    digest,
    signature,
    signer: account.address,
  };
}
