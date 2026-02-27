# ProofOfVerdict Frontend

React + Vite frontend for interacting with the ProofOfVerdict dispute resolution system.

## Features

- **Dispute Selection**: Enter a dispute ID to load its current status
- **Argument Submission**: Submit arguments as a debater (payer or payee)
- **Status Tracking**: View real-time status of both debaters' submissions
- **Verdict Triggering**: Trigger the TEE Judge when both arguments are submitted
- **Verdict Display**: View the complete verdict with scores, reasoning, and EIP-712 signature

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_JUDGE_API_URL` | `http://35.233.167.89:3001` | Judge API base URL |

## User Flow

### 1. Select a Dispute
Enter a dispute ID (hex format, e.g., `0x80339e3ac6e2da2878f13d6e2109b19eb94ee9e2b44970993340e4552f0594e3`) to load its status.

### 2. Submit Arguments
Each debater submits their argument using:
- **Your Address**: Your wallet address (must be the payer or payee from the escrow)
- **Topic** (optional): A brief topic for the debate
- **Argument**: Your case (max 2000 characters)

API: `POST /submitArgument`

### 3. Check Status
The status panel shows:
- Whether Debater A has submitted
- Whether Debater B has submitted
- If the dispute is ready for verdict (both arguments submitted)

API: `GET /dispute/:disputeId`

### 4. Trigger Verdict
Once both arguments are submitted, click "Trigger Verdict" to call the TEE Judge.

API: `POST /judgeFromDispute`

### 5. View Results
The verdict display shows:
- **Winner**: Address of the winning debater
- **Confidence**: Judge's confidence percentage
- **Reasoning**: Explanation of the decision
- **Scores**: Logic, Evidence, and Persuasion scores for both debaters
- **Signed Verdict**: EIP-712 signature ready for on-chain registration

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Judge API     │────▶│   TEE Judge     │
│  (React/Vite)   │     │ (Express/Node)  │     │ (EigenCompute)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        │ GET /dispute/:id
        │ POST /submitArgument
        │ POST /judgeFromDispute
        ▼
┌─────────────────┐
│  VerdictDisplay │
│  - Winner       │
│  - Confidence   │
│  - Scores       │
│  - Signature    │
└─────────────────┘
```

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **viem** - Ethereum utilities (formatUnits, etc.)
- **TypeScript** - Type safety

## Related Documentation

- [API Reference](../../docs/API.md) - Complete Judge API documentation
- [Architecture](../../docs/ARCHITECTURE.md) - System architecture
- [Agent Integration](../../docs/AGENT_INTEGRATION.md) - SDK for agent integration
