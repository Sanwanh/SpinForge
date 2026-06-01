// Discard (permanently burn) a loose part the user owns — web2-hybrid relay.
// The user must own the active part (DB ownership). We resolve its type from the
// ownership row (never trusted from the body), relay `<type>::destroy` to burn it
// in platform custody, then mark it consumed. Identity = session user.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser } from '@/lib/server-user';
import { reserveOp, markOp } from '@/lib/chain-ops';
import { assertOwns, markConsumed } from '@/lib/ownership';
import { submitRelay } from '@/lib/relay';
import { isSameOrigin, safeError, rateLimited } from '@/lib/api-guard';
import { PACKAGE_ID } from '@/lib/constants';

const DISCARD_REASON = 'discard';
const BURNABLE = new Set(['blade', 'ratchet', 'bit']);

function parseObjectId(body: unknown): { objectId: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { objectId } = body as Record<string, unknown>;
  if (typeof objectId !== 'string' || objectId.length === 0) return null;
  return { objectId };
}

function idemKey(request: NextRequest, userId: string): string {
  const header = request.headers.get('idempotency-key');
  return header && header.length > 0
    ? `discard:${userId}:${header}`
    : `discard:${crypto.randomUUID()}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'discard', 60, 3600);
    if (limited) return limited;

    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const parsed = parseObjectId(await request.json());
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid object id' }, { status: 400 });
    }
    const { objectId } = parsed;

    if (!(await assertOwns(user.id, [objectId]))) {
      return NextResponse.json({ error: 'You do not own this part' }, { status: 403 });
    }

    // Resolve the part type server-side; only loose parts can be burned this way.
    const rows = await db.execute<{ object_type: string }>(sql`
      SELECT object_type FROM ownership
      WHERE user_id = ${user.id} AND object_id = ${objectId} AND status = 'active'
      LIMIT 1
    `);
    const objectType = rows[0]?.object_type;
    if (!objectType || !BURNABLE.has(objectType)) {
      return NextResponse.json({ error: 'Only loose parts can be discarded' }, { status: 400 });
    }

    const operationId = await reserveOp({
      idempotencyKey: idemKey(request, user.id),
      userId: user.id,
      action: DISCARD_REASON,
      request: { objectId, objectType },
    });

    let relay;
    try {
      relay = await submitRelay('custodian', (tx) => {
        tx.moveCall({
          target: `${PACKAGE_ID}::${objectType}::destroy`,
          arguments: [tx.object(objectId)],
        });
      });
    } catch (err) {
      await markOp(operationId, {
        state: 'reconcile_needed',
        lastError: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    await markConsumed([objectId]);
    await markOp(operationId, { state: 'db_applied', txDigest: relay.digest });

    return NextResponse.json(
      {
        success: true,
        operationId,
        objectId,
        digest: relay.digest,
        message: 'Part discarded.',
      },
      { status: 202 },
    );
  } catch (err) {
    return safeError(err, 'Discard failed');
  }
}
