# Minimal Agent Integration

Run the full agent flow: submit both arguments, poll until ready, request verdict.

## Prerequisites

1. Run `scripts/open-escrow` first
2. Copy the `disputeId` from output

## Run

```bash
DISPUTE_ID=0x... JUDGE_URL=http://35.233.167.89:3001 npm start
```

Or use the E2E script: `JUDGE_URL=http://35.233.167.89:3001 ./scripts/e2e-agent-mode.sh`
