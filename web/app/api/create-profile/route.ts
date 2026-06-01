// Profile upsert: the `profiles` row (handle + chainSubject) is auto-created by
// requireGameUser on first session call. This route only lets the signed-in user
// set their display name. Identity is the session — never a client-supplied
// address — and nothing is minted on-chain.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser } from '@/lib/server-user';
import { safeError } from '@/lib/api-guard';

const MAX_NAME_LEN = 32;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { id, handle, chainSubject } = auth.user;

    const body = await request.json().catch(() => ({}));
    const displayName = body?.displayName;

    // Validate at the boundary: a non-empty, length-bounded string.
    if (typeof displayName !== 'string') {
      return NextResponse.json({ error: 'Missing display name' }, { status: 400 });
    }
    const trimmed = displayName.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_NAME_LEN) {
      return NextResponse.json({ error: 'Invalid display name' }, { status: 400 });
    }

    // The profile row is guaranteed to exist (requireGameUser created it).
    const updated = await db.execute<{ display_name: string }>(sql`
      UPDATE profiles
      SET display_name = ${trimmed}, updated_at = now()
      WHERE user_id = ${id}
      RETURNING display_name
    `);

    return NextResponse.json({
      success: true,
      handle,
      chainSubject,
      displayName: updated[0]?.display_name ?? trimmed,
    });
  } catch (err) {
    return safeError(err, 'Profile update failed');
  }
}
