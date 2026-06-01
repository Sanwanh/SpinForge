// Assemble a Bey from 3 owned parts — web2-hybrid relay (plan: assets/assemble).
// The user must own all three loose parts (DB ownership). We relay
// `bey::assemble`, which mints the Bey into platform custody (ctx.sender()), then
// mark the parts embedded and attribute the new Bey to the user. Identity =
// session user; part ownership is verified server-side, never trusted from body.

import { NextRequest, NextResponse } from 'next/server';
import { requireGameUser } from '@/lib/server-user';
import { reserveOp, markOp } from '@/lib/chain-ops';
import { assertOwns, markEmbedded, recordMint } from '@/lib/ownership';
import { submitRelay, PLATFORM_CUSTODY } from '@/lib/relay';
import { isSameOrigin, safeError, rateLimited } from '@/lib/api-guard';
import { PACKAGE_ID } from '@/lib/constants';

const ASSEMBLE_REASON = 'assemble';

function isId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function parseAssemble(
  body: unknown,
): { bladeId: string; ratchetId: string; bitId: string; name: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { bladeId, ratchetId, bitId, name } = body as Record<string, unknown>;
  if (!isId(bladeId) || !isId(ratchetId) || !isId(bitId)) return null;
  if (typeof name !== 'string' || name.length < 1 || name.length > 64) return null;
  return { bladeId, ratchetId, bitId, name };
}

function idemKey(request: NextRequest, userId: string): string {
  const header = request.headers.get('idempotency-key');
  return header && header.length > 0
    ? `assemble:${userId}:${header}`
    : `assemble:${crypto.randomUUID()}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'assemble', 60, 3600);
    if (limited) return limited;

    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const parsed = parseAssemble(await request.json());
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid parts' }, { status: 400 });
    }
    const { bladeId, ratchetId, bitId, name } = parsed;
    const partIds = [bladeId, ratchetId, bitId];

    if (!(await assertOwns(user.id, partIds))) {
      return NextResponse.json({ error: 'You do not own all three parts' }, { status: 403 });
    }

    const operationId = await reserveOp({
      idempotencyKey: idemKey(request, user.id),
      userId: user.id,
      action: ASSEMBLE_REASON,
      request: parsed,
    });

    let relay;
    try {
      relay = await submitRelay('custodian', (tx) => {
        const [bey] = tx.moveCall({
          target: `${PACKAGE_ID}::bey::assemble`,
          arguments: [
            tx.object(bladeId),
            tx.object(ratchetId),
            tx.object(bitId),
            tx.pure.string(name),
          ],
        });
        tx.transferObjects([bey], PLATFORM_CUSTODY);
      });
    } catch (err) {
      await markOp(operationId, {
        state: 'reconcile_needed',
        lastError: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    const bey = relay.created.find((c) => c.objectType.includes('::bey::Bey'));
    if (!bey) {
      await markOp(operationId, { state: 'reconcile_needed', txDigest: relay.digest, lastError: 'NO_BEY_CREATED' });
      throw new Error('Assemble produced no Bey');
    }

    // Parts are now children of the Bey; attribute the Bey to the user.
    await markEmbedded(partIds, bey.objectId);
    await recordMint(user.id, bey.objectId, 'bey', {
      txDigest: relay.digest,
      operationId,
      chainOwner: PLATFORM_CUSTODY,
      acquiredVia: ASSEMBLE_REASON,
    });
    await markOp(operationId, { state: 'db_applied', txDigest: relay.digest });

    return NextResponse.json(
      {
        success: true,
        operationId,
        beyId: bey.objectId,
        digest: relay.digest,
        name,
        message: `Assembled "${name}".`,
      },
      { status: 202 },
    );
  } catch (err) {
    return safeError(err, 'Assemble failed');
  }
}
