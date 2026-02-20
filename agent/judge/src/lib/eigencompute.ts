/**
 * EigenCompute TEE Runtime Module
 *
 * This module runs INSIDE the EigenCompute TEE (Intel TDX via Google Confidential Space).
 * The judge agent is deployed as a Docker container to EigenCompute, where:
 *
 *   1. KMS injects a deterministic MNEMONIC (wallet bound to this TEE instance)
 *   2. Docker digest is recorded on-chain for code verifiability
 *   3. Intel TDX provides hardware-isolated execution (encrypted memory)
 *   4. EigenAI provides deterministic, verifiable LLM inference
 *
 * The combination means:
 *   - The judge code is verifiable (Docker digest on-chain)
 *   - The inference is reproducible (EigenAI deterministic)
 *   - The signing key is TEE-bound (KMS mnemonic)
 *   - No one (including the operator) can tamper with execution
 */

export function isTeeEnvironment(): boolean {
  const mnemonic = process.env.MNEMONIC;
  return !!mnemonic && mnemonic !== "test test test test test test test test test test test junk";
}

export function getTeeInfo() {
  return {
    isTee: isTeeEnvironment(),
    environment: process.env.ECLOUD_ENV || "unknown",
    appId: process.env.ECLOUD_APP_ID || "unknown",
    enclaveType: "Intel TDX",
    kmsProvider: "EigenLabs (Mainnet Alpha)",
  };
}
