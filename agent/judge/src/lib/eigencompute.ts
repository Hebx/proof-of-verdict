/**
 * EigenCompute TEE Runtime — runs INSIDE the Intel TDX enclave.
 * KMS injects MNEMONIC, Docker digest recorded on-chain.
 */
export function isTeeEnvironment(): boolean {
  const m = process.env.MNEMONIC;
  return !!m && m.trim().split(/\s+/).length >= 12;
}

export function getTeeInfo() {
  return {
    isTee: isTeeEnvironment(),
    environment: process.env.ECLOUD_ENV || "unknown",
  };
}
