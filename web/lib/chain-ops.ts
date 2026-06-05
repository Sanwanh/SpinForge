// Transactional outbox over `chain_operations` (plan section E). Each on-chain
// mutation reserves an operation row keyed by an idempotency key BEFORE the Sui
// RPC, then advances its state as the write progresses. Reusing the same
// idempotency key returns the existing operationId instead of double-submitting.

import { sql } from 'drizzle-orm';
import { db } from './db';

/**
 * Reserve (or look up) the outbox row for a mutation. Idempotent on
 * idempotencyKey — a retry with the same key returns the original operationId
 * without inserting a duplicate. Returns the operationId (uuid).
 */
export async function reserveOp(args: {
  idempotencyKey: string;
  userId?: string;
  action: string;
  request: unknown;
}): Promise<string> {
  const requestJson = JSON.stringify(args.request ?? null);
  const inserted = await db.execute<{ id: string }>(sql`
    INSERT INTO chain_operations (idempotency_key, user_id, action, state, request)
    VALUES (${args.idempotencyKey}, ${args.userId ?? null}, ${args.action}, 'reserved', ${requestJson}::jsonb)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  `);
  if (inserted[0]) return inserted[0].id;

  const existing = await db.execute<{ id: string }>(sql`
    SELECT id FROM chain_operations WHERE idempotency_key = ${args.idempotencyKey} LIMIT 1
  `);
  if (!existing[0]) throw new Error('OUTBOX_RESERVE_FAILED');
  return existing[0].id;
}

/**
 * Advance an outbox row. Persist the tx digest BEFORE RPC submission and the
 * terminal state after; increments `attempts` on every call so stuck rows are
 * visible to the reconciler.
 */
export async function markOp(
  operationId: string,
  patch: { state: string; txDigest?: string; lastError?: string },
): Promise<void> {
  await db.execute(sql`
    UPDATE chain_operations
    SET state = ${patch.state},
        tx_digest = COALESCE(${patch.txDigest ?? null}, tx_digest),
        last_error = ${patch.lastError ?? null},
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = ${operationId}
  `);
}
