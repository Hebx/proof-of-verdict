# ProofOfVerdict Reputation System

The ProofOfVerdict reputation system provides on-chain tracking of agent performance in disputes. It incentivizes good behavior and allows participants to evaluate counterparty risk before entering escrow agreements.

## Overview

`PovReputation` is a Solidity contract that tracks:
- **Completed jobs**: Total number of disputes an agent has participated in
- **Successful jobs**: Number of disputes where the agent was the winner
- **Reputation score**: A numerical score (0-1000) representing overall performance

## How It Works

### Scoring Logic

| Outcome | Score Change | Description |
|---------|--------------|-------------|
| Win (settlement) | +10 points | Agent won a dispute via verdict |
| Loss (settlement) | -5 points | Agent lost a dispute via verdict |
| Refund (timeout) | -5 points | Payee penalized when payer refunds after timeout |

The score is clamped between 0 and 1000 (`MAX_SCORE`).

### Integration with Escrow

The `PovEscrowERC20` contract integrates with `PovReputation` via the `setReputation()` function:

```solidity
// In PovEscrowERC20.settle()
if (reputation != address(0)) {
    address loser = verdict.winner == escrow.payer ? escrow.payee : escrow.payer;
    IPovReputation(reputation).recordOutcome(verdict.winner, true);
    IPovReputation(reputation).recordOutcome(loser, false);
}
```

When a dispute is settled:
1. Winner gets +10 reputation points
2. Loser gets -5 reputation points

When a refund occurs (timeout expired, payer withdraws):
1. Payee gets -5 reputation points (penalty for non-delivery)

## Contract Interface

### PovReputation

```solidity
// Read functions
function escrow() external view returns (address);
function completedJobs(address agent) external view returns (uint32);
function successfulJobs(address agent) external view returns (uint32);
function reputationScore(address agent) external view returns (int32);
function MAX_SCORE() external pure returns (uint32);

function getReputation(address agent) external view returns (
    int32 score,
    uint32 completed,
    uint32 success
);

// Write functions (escrow only)
function recordOutcome(address agent, bool success) external;

// Admin functions (owner only)
function setEscrow(address escrow_) external;
```

### PovEscrowERC20 Integration

```solidity
// Set the reputation contract address
function setReputation(address reputation_) external onlyOwner;

// Events
event ReputationUpdated(address indexed reputation);
```

## Usage Examples

### Check Agent Reputation

```solidity
PovReputation rep = PovReputation(REPUTATION_ADDRESS);
(int32 score, uint32 completed, uint32 success) = rep.getReputation(agentAddress);

// Calculate success rate
uint256 successRate = completed > 0 
    ? (uint256(success) * 100) / completed 
    : 0;
```

### Deploy and Configure

```solidity
// 1. Deploy PovReputation with escrow address
PovReputation reputation = new PovReputation(address(escrowContract));

// 2. Set reputation contract in escrow (owner only)
escrowContract.setReputation(address(reputation));
```

## Security Considerations

1. **Only Escrow Can Record**: Only the configured `PovEscrowERC20` contract can call `recordOutcome()`. This prevents manipulation.

2. **Owner-Controlled Escrow Updates**: The contract owner can update the escrow address via `setEscrow()`, allowing for escrow contract upgrades.

3. **Score Bounds**: Scores are clamped to prevent underflow/overflow:
   - Minimum: 0 (cannot go negative)
   - Maximum: 1000 (`MAX_SCORE`)

4. **Zero Address Protection**: Constructor and `setEscrow()` reject zero addresses.

## Events

```solidity
event EscrowUpdated(address indexed escrow);
event ReputationUpdated(
    address indexed agent,
    int32 score,
    uint32 completed,
    uint32 success,
    bool outcome
);
```

## Testing

Run the reputation test suite:

```bash
cd contracts
forge test --match-contract PovReputationTest -v
```

The test suite covers:
- Constructor validation
- Access control (owner vs non-owner)
- Score calculation and bounds
- Multiple agents
- Event emission
- Error conditions

## Future Enhancements

Potential improvements for the reputation system:

1. **Time-Decayed Scores**: Recent performance weighted more heavily
2. **Stake-Weighted Reputation**: Reputation based on value of disputes won/lost
3. **Judge-Specific Ratings**: Separate reputation per judge/arbitrator
4. **Dispute Category Scores**: Different reputation tracks for different dispute types
5. **On-Chain Reputation Gates**: Minimum score requirements for high-value escrows
