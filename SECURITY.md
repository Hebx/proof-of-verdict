# Security

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly. Do not open a public issue.

- **Email:** [security contact to be added]
- **Preferred:** Private disclosure via GitHub Security Advisories

## Secrets Management

**Never commit secrets to the repository.**

| Secret | Where to Store | Notes |
|--------|----------------|------|
| `PRIVATE_KEY` | `.env` (gitignored) | Wallet key for escrow, contracts, deployer |
| `ECLOUD_PRIVATE_KEY` | `.env` (gitignored) | EigenCloud deployer key |
| `EIGENAI_API_KEY` | `agent/judge/.env.tee` (gitignored) | LLM inference |
| `PINATA_JWT` | `.env` (gitignored) | IPFS pinning for ERC-8004 |
| `BASE_SEPOLIA_RPC` | `.env` (gitignored) | May contain API key (e.g. Alchemy) |

- Copy `.env.example` to `.env` and fill in values locally
- `.env`, `.env.tee`, and `agent/judge/.env` are gitignored
- Use environment variables or a secrets manager in CI/CD

## Verification

- **TEE attestation:** Judge runs in Intel TDX enclave; verify at [EigenCompute Dashboard](https://verify-sepolia.eigencloud.xyz)
- **Docker digest:** Image hash recorded on-chain for code audit
- **EIP-712:** Verdicts are typed, structured, and replay-protected
