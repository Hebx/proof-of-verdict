# disputeId Derivation

Shows conventions for deriving `disputeId` from business context. Both parties must use the same formula.

| Use Case | Formula |
|----------|---------|
| Trade | `keccak256("trade" + tradeId)` |
| SLA | `keccak256("sla" + dealId + taskId)` |
| Payment | `keccak256("payment" + invoiceId)` |

See [docs/AGENT_INTEGRATION.md](../../docs/AGENT_INTEGRATION.md).
