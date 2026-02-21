/**
 * Derive disputeId from business context.
 * Both parties must use the same convention to agree on disputeId.
 *
 * Usage:
 *   TRADE_ID=0xabc... npx tsx derive-dispute-id.ts
 *   DEAL_ID=deal123 TASK_ID=task456 npx tsx derive-dispute-id.ts
 *   INVOICE_ID=inv-789 npx tsx derive-dispute-id.ts
 */

import { keccak256, toHex } from "viem";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const TRADE_ID = process.env.TRADE_ID;
const DEAL_ID = process.env.DEAL_ID;
const TASK_ID = process.env.TASK_ID;
const INVOICE_ID = process.env.INVOICE_ID;

function deriveDisputeId(): { disputeId: string; convention: string } {
  if (TRADE_ID) {
    const payload = `trade${TRADE_ID}`;
    return {
      disputeId: keccak256(toHex(payload)),
      convention: `keccak256("trade" + tradeId)`,
    };
  }
  if (DEAL_ID && TASK_ID) {
    const payload = `sla${DEAL_ID}${TASK_ID}`;
    return {
      disputeId: keccak256(toHex(payload)),
      convention: `keccak256("sla" + dealId + taskId)`,
    };
  }
  if (INVOICE_ID) {
    const payload = `payment${INVOICE_ID}`;
    return {
      disputeId: keccak256(toHex(payload)),
      convention: `keccak256("payment" + invoiceId)`,
    };
  }

  console.error("Set one of: TRADE_ID, (DEAL_ID + TASK_ID), INVOICE_ID");
  process.exit(1);
}

const { disputeId, convention } = deriveDisputeId();
console.log("disputeId:", disputeId);
console.log("convention:", convention);
