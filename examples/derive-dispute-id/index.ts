/**
 * Derive disputeId from business context.
 * See docs/AGENT_INTEGRATION.md for conventions.
 */
import { keccak256, toHex } from "viem";

const conventions = {
  trade: (tradeId: string) => keccak256(toHex(`trade${tradeId}`)),
  sla: (dealId: string, taskId: string) =>
    keccak256(toHex(`sla${dealId}${taskId}`)),
  payment: (invoiceId: string) => keccak256(toHex(`payment${invoiceId}`)),
};

console.log("Trade:", conventions.trade("0xabc123"));
console.log("SLA:", conventions.sla("deal1", "task1"));
console.log("Payment:", conventions.payment("inv-789"));
