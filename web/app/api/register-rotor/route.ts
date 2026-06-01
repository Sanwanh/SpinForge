// Register a physical-rotor passport — web2-hybrid flow.
// Identity comes from the session; the Bey is minted into platform custody via
// `register::register_rotor_for` and attributed to the user in `ownership`. The
// outbox keys the relay on an Idempotency-Key so a retry doesn't double-mint.

import { NextRequest, NextResponse } from 'next/server';
import { requireGameUser } from '@/lib/server-user';
import { reserveOp, markOp } from '@/lib/chain-ops';
import { recordMint } from '@/lib/ownership';
import { submitRelay, PLATFORM_CUSTODY } from '@/lib/relay';
import { isSameOrigin, safeError, rateLimited, adminBudgetExceeded } from '@/lib/api-guard';
import { PACKAGE_ID, ADMIN_CAP_ID, GAME_CONFIG_ID } from '@/lib/constants';

const REGISTER_REASON = 'register_rotor';

interface RotorSpec {
  bladeName: string;
  spiritBeast?: number;
  beyType?: number;
  spinDirection?: number;
  ratchetProng?: number;
  ratchetHeight?: number;
  bitName?: string;
  bitCategory?: number;
}

// Bounded integer in [min,max], or undefined when absent (defaults applied later).
function optInt(v: unknown, min: number, max: number): number | undefined | null {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) return null;
  return v;
}

// Validate the rotor spec at the boundary; identity is NOT taken from the body.
// Returns null on any invalid field.
function parseRotor(body: unknown): RotorSpec | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.bladeName !== 'string' || b.bladeName.length < 1 || b.bladeName.length > 64) return null;
  if (b.bitName !== undefined && (typeof b.bitName !== 'string' || b.bitName.length > 64)) return null;

  const fields = {
    spiritBeast: optInt(b.spiritBeast, 0, 4),
    beyType: optInt(b.beyType, 0, 3),
    spinDirection: optInt(b.spinDirection, 0, 1),
    ratchetProng: optInt(b.ratchetProng, 0, 9),
    ratchetHeight: optInt(b.ratchetHeight, 0, 255),
    bitCategory: optInt(b.bitCategory, 0, 3),
  };
  if (Object.values(fields).some((v) => v === null)) return null;

  return {
    bladeName: b.bladeName,
    bitName: typeof b.bitName === 'string' ? b.bitName : undefined,
    spiritBeast: fields.spiritBeast ?? undefined,
    beyType: fields.beyType ?? undefined,
    spinDirection: fields.spinDirection ?? undefined,
    ratchetProng: fields.ratchetProng ?? undefined,
    ratchetHeight: fields.ratchetHeight ?? undefined,
    bitCategory: fields.bitCategory ?? undefined,
  };
}

function idemKey(request: NextRequest, userId: string): string {
  const header = request.headers.get('idempotency-key');
  return header && header.length > 0
    ? `register-rotor:${userId}:${header}`
    : `register-rotor:${crypto.randomUUID()}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'register-rotor', 30, 3600);
    if (limited) return limited;
    const overBudget = await adminBudgetExceeded('register-rotor', 400, 3600);
    if (overBudget) return overBudget;

    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const spec = parseRotor(await request.json());
    if (!spec) {
      return NextResponse.json({ error: 'Invalid rotor spec' }, { status: 400 });
    }
    const ratchetProng = spec.ratchetProng ?? 3;
    const ratchetHeight = spec.ratchetHeight ?? 60;
    const bitName = spec.bitName ?? 'Flat';
    const rotorName = `${spec.bladeName} ${ratchetProng}-${ratchetHeight} ${bitName}`;

    const operationId = await reserveOp({
      idempotencyKey: idemKey(request, user.id),
      userId: user.id,
      action: REGISTER_REASON,
      request: spec,
    });

    let relay;
    try {
      relay = await submitRelay('recorder', (tx) => {
        tx.moveCall({
          target: `${PACKAGE_ID}::register::register_rotor_for`,
          arguments: [
            tx.object(ADMIN_CAP_ID),
            tx.object(GAME_CONFIG_ID),
            tx.pure.address(user.chainSubject),
            tx.pure.vector('u8', Array.from(Buffer.from(operationId))),
            tx.pure.string(spec.bladeName),
            tx.pure.u8(spec.spiritBeast ?? 0),
            tx.pure.u8(spec.beyType ?? 0),
            tx.pure.u8(spec.spinDirection ?? 0),
            tx.pure.u8(ratchetProng),
            tx.pure.u8(ratchetHeight),
            tx.pure.string(bitName),
            tx.pure.u8(spec.bitCategory ?? 0),
            tx.pure.string(rotorName),
          ],
        });
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
      throw new Error('Rotor mint produced no Bey');
    }
    await recordMint(user.id, bey.objectId, 'bey', {
      txDigest: relay.digest,
      operationId,
      chainOwner: PLATFORM_CUSTODY,
      acquiredVia: REGISTER_REASON,
    });
    await markOp(operationId, { state: 'db_applied', txDigest: relay.digest });

    return NextResponse.json(
      {
        success: true,
        operationId,
        beyId: bey.objectId,
        digest: relay.digest,
        name: rotorName,
        message: `Rotor registered! Your ${spec.bladeName} now has a digital passport.`,
      },
      { status: 202 },
    );
  } catch (err) {
    return safeError(err, 'Rotor registration failed');
  }
}
