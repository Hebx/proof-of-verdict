/**
 * In-memory store for agent-submitted arguments.
 * Keyed by disputeId. Used for async agent-to-agent flow.
 * Production: replace with Redis or PostgreSQL.
 */

const ARGUMENT_MAX_LENGTH = 2000;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface DisputeEntry {
  disputeId: string;
  topic?: string;
  debaterA?: { id: string; argument: string };
  debaterB?: { id: string; argument: string };
  createdAt: number;
}

const store = new Map<string, DisputeEntry>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (now - entry.createdAt > TTL_MS) store.delete(id);
  }
}

export function getDispute(disputeId: string): DisputeEntry | undefined {
  pruneExpired();
  return store.get(disputeId);
}

export function setArgument(
  disputeId: string,
  debaterId: string,
  argument: string,
  topic?: string,
): { ok: boolean; error?: string } {
  if (argument.length > ARGUMENT_MAX_LENGTH) {
    return { ok: false, error: `argument exceeds ${ARGUMENT_MAX_LENGTH} chars` };
  }

  pruneExpired();

  const existing = store.get(disputeId);
  const entry: DisputeEntry = existing ?? {
    disputeId,
    topic,
    createdAt: Date.now(),
  };

  // Update topic if provided and not yet set
  if (topic && !entry.topic) entry.topic = topic;

  const idLower = debaterId.toLowerCase();

  // Check if this debater already submitted
  if (entry.debaterA && entry.debaterA.id.toLowerCase() === idLower) {
    return { ok: false, error: "argument already submitted for this debater" };
  }
  if (entry.debaterB && entry.debaterB.id.toLowerCase() === idLower) {
    return { ok: false, error: "argument already submitted for this debater" };
  }

  // Assign to debaterA or debaterB slot (order doesn't matter for Judge)
  if (!entry.debaterA) {
    entry.debaterA = { id: debaterId, argument: argument.trim() };
  } else if (!entry.debaterB) {
    entry.debaterB = { id: debaterId, argument: argument.trim() };
  } else {
    return { ok: false, error: "both arguments already submitted" };
  }

  store.set(disputeId, entry);
  return { ok: true };
}

export function isReady(disputeId: string): boolean {
  const entry = store.get(disputeId);
  return !!(entry?.debaterA && entry?.debaterB);
}

export function clearDispute(disputeId: string): void {
  store.delete(disputeId);
}
