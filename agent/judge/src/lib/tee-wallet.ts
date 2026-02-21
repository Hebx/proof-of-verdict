import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { type Account } from "viem";

let _account: Account | null = null;

function getAccount(): Account {
  if (_account) return _account;

  const mnemonic = process.env.MNEMONIC;
  const privateKey = process.env.PRIVATE_KEY;

  if (mnemonic && mnemonic.trim().split(/\s+/).length >= 12) {
    _account = mnemonicToAccount(mnemonic.trim());
    console.log("[TEE Wallet] Using mnemonic (KMS-injected or local)");
  } else if (privateKey) {
    _account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log("[TEE Wallet] Using PRIVATE_KEY fallback");
  } else {
    console.error("[TEE Wallet] No MNEMONIC or PRIVATE_KEY found");
    console.error("[TEE Wallet] MNEMONIC value:", mnemonic ? `${mnemonic.slice(0, 10)}...` : "undefined");
    throw new Error("No MNEMONIC or PRIVATE_KEY available");
  }

  return _account;
}

export function getWalletAddress(): string {
  return getAccount().address;
}

export { getAccount };
