import { ethers } from "ethers";

const VERDICT_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    "Verdict(bytes32 disputeId,address winner,uint256 confidenceBps,uint256 issuedAt,uint256 deadline,uint256 nonce)"
  )
);

export interface VerdictPayload {
  disputeId: string;
  winner: string;
  confidenceBps: number;
  issuedAt: number;
  deadline: number;
  nonce: number;
}

export interface SignedVerdict {
  payload: VerdictPayload;
  digest: string;
  signature: string;
}

export async function signVerdict(
  payload: VerdictPayload,
  signerKey: string,
  registryAddress: string,
  chainId: number
): Promise<SignedVerdict> {
  const wallet = new ethers.Wallet(signerKey);

  const domain = {
    name: "VerdictRegistry",
    version: "1",
    chainId,
    verifyingContract: registryAddress,
  };

  const types = {
    Verdict: [
      { name: "disputeId", type: "bytes32" },
      { name: "winner", type: "address" },
      { name: "confidenceBps", type: "uint256" },
      { name: "issuedAt", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const signature = await wallet.signTypedData(domain, types, payload);

  const digest = ethers.TypedDataEncoder.hash(domain, types, payload);

  return { payload, digest, signature };
}
