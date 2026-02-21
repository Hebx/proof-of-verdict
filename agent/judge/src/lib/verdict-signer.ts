import { getAccount } from "./tee-wallet";
import { hashTypedData, type Hex } from "viem";

const CHAIN_ID = parseInt(process.env.CHAIN_ID || "84532");

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

export async function signVerdict(payload: VerdictPayload): Promise<SignedVerdict> {
  const registryAddress = process.env.VERDICT_REGISTRY_ADDRESS as Hex;
  const account = getAccount();

  const domain = {
    name: "VerdictRegistry" as const,
    version: "1" as const,
    chainId: CHAIN_ID,
    verifyingContract: registryAddress,
  };

  const digest = hashTypedData({
    domain,
    types,
    primaryType: "Verdict",
    message: payload,
  });

  if (!account.signTypedData) {
    throw new Error("Account does not support signTypedData");
  }

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: "Verdict",
    message: payload,
  });

  return { payload, digest, signature, signer: account.address };
}
