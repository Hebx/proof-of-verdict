/**
 * Submit two arguments (PRO and CON) for a dispute via Judge generateArgument + submitArgument.
 * Used by e2e-real.sh for E2E with real data (two logical agents, no hardcoded strings).
 * Requires: JUDGE_URL, DISPUTE_ID, PAYER_ADDRESS, PAYEE_ADDRESS; optional DEBATE_TOPIC.
 */
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const JUDGE_URL = process.env.JUDGE_URL;
const DISPUTE_ID = process.env.DISPUTE_ID;
const PAYER_ADDRESS = process.env.PAYER_ADDRESS;
const PAYEE_ADDRESS = process.env.PAYEE_ADDRESS;
const DEBATE_TOPIC =
  process.env.DEBATE_TOPIC ??
  "Is decentralized AI more trustworthy than centralized AI?";

function usage(): void {
  console.error(
    "Usage: DISPUTE_ID=0x... PAYER_ADDRESS=0x... PAYEE_ADDRESS=0x... [JUDGE_URL=...] [DEBATE_TOPIC=...] npm run submit-two-arguments",
  );
  console.error("Required: JUDGE_URL, DISPUTE_ID, PAYER_ADDRESS, PAYEE_ADDRESS");
}

async function generateArgument(
  judgeUrl: string,
  topic: string,
  side: "pro" | "con",
  context: string,
): Promise<string> {
  const res = await fetch(`${judgeUrl}/generateArgument`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, side, context }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`generateArgument ${side} failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { argument: string };
  return data.argument;
}

async function submitArgument(
  judgeUrl: string,
  disputeId: string,
  debaterId: string,
  argument: string,
  topic: string,
): Promise<void> {
  const res = await fetch(`${judgeUrl}/submitArgument`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ disputeId, debaterId, argument, topic }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`submitArgument failed: ${res.status} ${text}`);
  }
}

async function main(): Promise<void> {
  if (!JUDGE_URL || !DISPUTE_ID || !PAYER_ADDRESS || !PAYEE_ADDRESS) {
    usage();
    process.exit(1);
  }

  const payer = PAYER_ADDRESS.trim();
  const payee = PAYEE_ADDRESS.trim();

  try {
    const fallbackPro = `PRO: Decentralized AI reduces single-point control and improves auditability via open protocols, independent verifiers, and cryptographic proofs.`;
    const fallbackCon = `CON: Centralized AI can provide faster patching, clearer accountability, and consistent safety governance that fragmented decentralized systems may struggle to coordinate.`;

    let argPro = fallbackPro;
    let argCon = fallbackCon;

    try {
      console.log("[submit-two-arguments] Fetching PRO argument…");
      argPro = await generateArgument(
        JUDGE_URL,
        DEBATE_TOPIC,
        "pro",
        `Payer ${payer} argues for.`,
      );
    } catch (e) {
      console.warn("[submit-two-arguments] generateArgument(PRO) failed, using fallback text:", e);
    }

    console.log("[submit-two-arguments] Submitting PRO (payer)…");
    await submitArgument(JUDGE_URL, DISPUTE_ID, payer, argPro, DEBATE_TOPIC);

    try {
      console.log("[submit-two-arguments] Fetching CON argument…");
      argCon = await generateArgument(
        JUDGE_URL,
        DEBATE_TOPIC,
        "con",
        `Payee ${payee} argues against.`,
      );
    } catch (e) {
      console.warn("[submit-two-arguments] generateArgument(CON) failed, using fallback text:", e);
    }

    console.log("[submit-two-arguments] Submitting CON (payee)…");
    await submitArgument(JUDGE_URL, DISPUTE_ID, payee, argCon, DEBATE_TOPIC);

    console.log("[submit-two-arguments] Both arguments submitted successfully.");
    process.exit(0);
  } catch (e) {
    console.error("[submit-two-arguments] Error:", e);
    process.exit(1);
  }
}

main();
