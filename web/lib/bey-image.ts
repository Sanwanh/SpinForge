// DB access for Bey photos (NFT-style). The image bytes live in blob storage
// (lib/blob.ts); this table maps a Bey's on-chain object_id -> public URL. The
// row is the source of truth for "this Bey's photo".

import { sql, type SQL } from 'drizzle-orm';
import { db } from './db';

// Parameterized `(v1, v2, ...)` list — each value is bound, never interpolated.
function inList(values: string[]): SQL {
  return sql`(${sql.join(values.map((v) => sql`${v}`), sql`, `)})`;
}

/** Public photo URL for one Bey, or null when none has been set. */
export async function getBeyImage(objectId: string): Promise<string | null> {
  const rows = await db.execute<{ url: string }>(sql`
    SELECT url FROM bey_images WHERE object_id = ${objectId} LIMIT 1
  `);
  return rows[0]?.url ?? null;
}

/** Map of objectId -> photo URL for the given Beys (only those with a photo). */
export async function getBeyImages(objectIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(objectIds)].filter(Boolean);
  if (unique.length === 0) return out;
  const rows = await db.execute<{ object_id: string; url: string }>(sql`
    SELECT object_id, url FROM bey_images WHERE object_id IN ${inList(unique)}
  `);
  for (const r of rows) out.set(r.object_id, r.url);
  return out;
}

/** The blob path currently stored for a Bey (for cleanup on replace). */
export async function getBeyImagePath(objectId: string): Promise<string | null> {
  const rows = await db.execute<{ blob_path: string | null }>(sql`
    SELECT blob_path FROM bey_images WHERE object_id = ${objectId} LIMIT 1
  `);
  return rows[0]?.blob_path ?? null;
}

/** Insert or replace a Bey's photo. Owner check is the caller's responsibility. */
export async function setBeyImage(
  objectId: string,
  userId: string,
  url: string,
  blobPath: string,
): Promise<void> {
  await db.execute(sql`
    INSERT INTO bey_images (object_id, user_id, url, blob_path)
    VALUES (${objectId}, ${userId}, ${url}, ${blobPath})
    ON CONFLICT (object_id) DO UPDATE
      SET url = EXCLUDED.url, blob_path = EXCLUDED.blob_path, updated_at = now()
  `);
}
