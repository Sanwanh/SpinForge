// Server-only resolver for the in-game user: bridges a Better Auth session to a
// `profiles` row (handle + deterministic chainSubject) and seeds the off-chain
// SPARK ledger once. Never trusts client-supplied identity — the user id always
// comes from the validated session.

import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { auth } from './auth';
import { grantSpark } from './economy';
import { funName } from './fun-name';

const STARTER_SPARK = 500; // matches the on-chain starter mint (claim-starter)
const STARTER_REASON = 'starter_grant';

export interface GameUser {
  id: string;
  email: string;
  name: string;
  handle: string;
  chainSubject: string;
}

/**
 * Deterministic pseudonymous Sui-formatted address for on-chain event
 * attribution. Derived from server secret + user id so the same user always
 * maps to the same subject; it never signs and is not a wallet.
 */
export function chainSubjectFor(userId: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? '';
  const hex = createHash('sha256').update(secret + userId).digest('hex'); // 64 hex chars
  return `0x${hex}`;
}

// Best-effort unique handle: deterministic funName, suffixed on collision.
async function ensureUniqueHandle(seed: string): Promise<string> {
  const base = funName(seed);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}_${attempt}`;
    const hit = await db.execute<{ handle: string }>(sql`
      SELECT handle FROM profiles WHERE handle = ${candidate} LIMIT 1
    `);
    if (!hit[0]) return candidate;
  }
  return `${base}_${seed.slice(0, 6)}`;
}

/**
 * Resolve the session user and guarantee a `profiles` row exists, auto-creating
 * the handle + chainSubject and granting one-time starter SPARK on first call.
 * Returns null when there is no session.
 */
export async function getGameUser(headers: Headers): Promise<GameUser | null> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  const { id, email, name } = session.user;

  const existing = await db.execute<{ handle: string; chain_subject: string }>(sql`
    SELECT handle, chain_subject FROM profiles WHERE user_id = ${id} LIMIT 1
  `);
  if (existing[0]) {
    return { id, email, name, handle: existing[0].handle, chainSubject: existing[0].chain_subject };
  }

  const chainSubject = chainSubjectFor(id);
  const handle = await ensureUniqueHandle(id);

  // Insert the profile; ON CONFLICT no-ops if a concurrent first-call won the race.
  const inserted = await db.execute<{ user_id: string }>(sql`
    INSERT INTO profiles (user_id, handle, display_name, chain_subject)
    VALUES (${id}, ${handle}, ${name || handle}, ${chainSubject})
    ON CONFLICT (user_id) DO NOTHING
    RETURNING user_id
  `);

  // Only the call that actually created the row grants starter SPARK (once).
  if (inserted[0]) {
    await grantSpark(id, STARTER_SPARK, STARTER_REASON);
  }

  const final = await db.execute<{ handle: string; chain_subject: string }>(sql`
    SELECT handle, chain_subject FROM profiles WHERE user_id = ${id} LIMIT 1
  `);
  const row = final[0] ?? { handle, chain_subject: chainSubject };
  return { id, email, name, handle: row.handle, chainSubject: row.chain_subject };
}

/** Throwable guard: returns the game user or a 401 NextResponse. */
export async function requireGameUser(
  headers: Headers,
): Promise<{ user: GameUser } | { error: Response }> {
  const user = await getGameUser(headers);
  if (!user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  return { user };
}
