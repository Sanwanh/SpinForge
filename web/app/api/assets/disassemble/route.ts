// Disassemble a Bey back into its 3 parts — web2-hybrid relay.
// The user must own the Bey (DB ownership). We relay `bey::disassemble`, which
// returns the three child parts (same on-chain object ids) and transfers them to
// platform custody. We then mark the Bey consumed and re-activate its embedded
// parts (clearing their parent) so they reappear in the user's loose inventory.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser } from '@/lib/server-user';
import { reserveOp, markOp } from '@/lib/chain-ops';
import { assertOwns, markConsumed } from '@/lib/ownership';
import { submitRelay, PLATFORM_CUSTODY } from '@/lib/relay';
import { isSameOrigin, safeError, rateLimited } from '@/lib/api-guard';
import { PACKAGE_ID } from '@/lib/constants';

const DISASSEMBLE_REASON = 'disassemble';

function parseBeyId(body: unknown): { beyId: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { beyId } = body as Record<string, unknown>;
  if (typeof beyId !== 'string' || beyId.length === 0) return null;
  return { beyId };
}

function idemKey(request: NextRequest, userId: string): string {
  const header = request.headers.get('idempotency-key');
  return header && header.length > 0
    ? `disassemble:${userId}:${header}`
    : `disassemble:${crypto.randomUUID()}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'disassemble', 60, 3600);
    if (limited) return limited;

    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const parsed = parseBeyId(await request.json());
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid bey id' }, { status: 400 });
    }
    const { beyId } = parsed;

    if (!(await assertOwns(user.id, [beyId]))) {
      return NextResponse.json({ error: 'You do not own this Bey' }, { status: 403 });
    }

    const operationId = await reserveOp({
      idempotencyKey: idemKey(request, user.id),
      userId: user.id,
      action: DISASSEMBLE_REASON,
      request: parsed,
    });

    let relay;
    try {
      relay = await submitRelay('custodian', (tx) => {
        const [blade, ratchet, bit] = tx.moveCall({
          target: `${PACKAGE_ID}::bey::disassemble`,
          arguments: [tx.object(beyId)],
        });
        // disassemble returns the three parts; they must be transferred or the tx fails.
        tx.transferObjects([blade, ratchet, bit], PLATFORM_CUSTODY);
      });
    } catch (err) {
      await markOp(operationId, {
        state: 'reconcile_needed',
        lastError: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // Bey is gone; its embedded parts (same object ids) become loose again.
    await markConsumed([beyId]);
    await db.execute(sql`
      UPDATE ownership
      SET status = 'active', parent_object_id = NULL, tx_digest = ${relay.digest}, updated_at = now()
      WHERE user_id = ${user.id} AND parent_object_id = ${beyId} AND status = 'embedded'
    `);
    await markOp(operationId, { state: 'db_applied', txDigest: relay.digest });

    return NextResponse.json(
      {
        success: true,
        operationId,
        beyId,
        digest: relay.digest,
        message: 'Bey disassembled. Parts returned to your inventory.',
      },
      { status: 202 },
    );
  } catch (err) {
    return safeError(err, 'Disassemble failed');
  }
}
