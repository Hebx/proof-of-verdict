import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  http,
  type Account,
  type WalletClient,
} from "viem";
import { baseSepolia } from "viem/chains";

let _account: Account | null = null;

function getAccount(): Account {
  if (_account) return _account;

  const mnemonic = process.env.MNEMONIC;
  const privateKey = process.env.PRIVATE_KEY;

  if (mnemonic && mnemonic !== "test test test test test test test test test test test junk") {
    _account = mnemonicToAccount(mnemonic);
    console.log("[TEE Wallet] Using KMS-injected mnemonic");
  } else if (privateKey) {
    _account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log("[TEE Wallet] Using PRIVATE_KEY fallback (local dev)");
  } else {
    throw new Error("No MNEMONIC or PRIVATE_KEY available — are we in a TEE?");
  }

  return _account;
}

export function getWalletAddress(): string {
  return getAccount().address;
}

export function getWalletClient(): WalletClient {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
  return createWalletClient({
    account: getAccount(),
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
}

export { getAccount };
