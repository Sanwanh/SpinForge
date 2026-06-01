// DB attribution of platform-custodied on-chain objects: which user owns which
// object_id, and the asset lifecycle (active -> embedded -> consumed). The chain
// owner is always the platform custody address; this table is the source of
// truth for "who owns it".

import { sql, type SQL } from 'drizzle-orm';
import { db } from './db';

// Parameterized `(v1, v2, ...)` list — each value is bound, never interpolated.
function inList(values: string[]): SQL {
  return sql`(${sql.join(values.map((v) => sql`${v}`), sql`, `)})`;
}

export interface OwnedObject {
  objectId: string;
  objectType: string;
  status: string;
  parentObjectId: string | null;
}

/** Assets a user holds — active (loose) or embedded (assembled into a Bey). */
export async function listInventory(userId: string): Promise<OwnedObject[]> {
  const rows = await db.execute<{
    object_id: string;
    object_type: string;
    status: string;
    parent_object_id: string | null;
  }>(sql`
    SELECT object_id, object_type, status, parent_object_id
    FROM ownership
    WHERE user_id = ${userId} AND status IN ('active', 'embedded')
    ORDER BY created_at DESC
  `);
  return rows.map((r) => ({
    objectId: r.object_id,
    objectType: r.object_type,
    status: r.status,
    parentObjectId: r.parent_object_id,
  }));
}

/**
 * Record a freshly minted on-chain object as owned by `userId`. Idempotent on
 * object_id (the active-asset unique index dedupes a retried finalize).
 */
export async function recordMint(
  userId: string,
  objectId: string,
  objectType: string,
  opts: { txDigest?: string; operationId?: string; chainOwner: string; acquiredVia: string },
): Promise<void> {
  await db.execute(sql`
    INSERT INTO ownership (
      user_id, object_id, object_type, kind, status,
      chain_owner_address, acquired_via, tx_digest, operation_id
    )
    VALUES (
      ${userId}, ${objectId}, ${objectType}, 'asset', 'active',
      ${opts.chainOwner}, ${opts.acquiredVia},
      ${opts.txDigest ?? null}, ${opts.operationId ?? null}
    )
    ON CONFLICT (object_id) DO NOTHING
  `);
}

/**
 * True only if EVERY objectId is currently an active asset owned by `userId`.
 * Used to gate assemble/forge/discard before relaying the on-chain mutation.
 */
export async function assertOwns(userId: string, objectIds: string[]): Promise<boolean> {
  if (objectIds.length === 0) return false;
  const unique = [...new Set(objectIds)];
  const rows = await db.execute<{ count: string | number }>(sql`
    SELECT count(*) AS count FROM ownership
    WHERE user_id = ${userId}
      AND status = 'active'
      AND object_id IN ${inList(unique)}
  `);
  return Number(rows[0]?.count ?? 0) === unique.length;
}

/** Mark loose assets as embedded into a parent Bey (assemble). */
export async function markEmbedded(objectIds: string[], parentBeyId: string): Promise<void> {
  if (objectIds.length === 0) return;
  await db.execute(sql`
    UPDATE ownership
    SET status = 'embedded', parent_object_id = ${parentBeyId}, updated_at = now()
    WHERE object_id IN ${inList(objectIds)}
  `);
}

/** Mark assets as consumed (forge / burn) — they leave the inventory. */
export async function markConsumed(objectIds: string[]): Promise<void> {
  if (objectIds.length === 0) return;
  await db.execute(sql`
    UPDATE ownership
    SET status = 'consumed', updated_at = now()
    WHERE object_id IN ${inList(objectIds)}
  `);
}
