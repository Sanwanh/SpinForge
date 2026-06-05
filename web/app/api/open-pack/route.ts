// Open a pack — web2-hybrid flow (plan section C/E).
// Identity comes from the Better Auth session only (never request JSON). SPARK is
// an off-chain DB ledger: we reserve 100 SPARK, relay `pack::open_pack_for` to
// mint 5 parts into platform custody, attribute each part to the user in
// `ownership`, then settle the reservation. The transactional outbox
// (chain_operations) keys the whole flow on an Idempotency-Key so a retry never
// double-charges or double-mints.

import { NextRequest, NextResponse } from 'next/server';
import { requireGameUser } from '@/lib/server-user';
import { reserveOp, markOp } from '@/lib/chain-ops';
import { reserveSpark, settleReservation, releaseReservation, getBalance } from '@/lib/economy';
import { recordMint } from '@/lib/ownership';
import { submitRelay, PLATFORM_CUSTODY } from '@/lib/relay';
import { isSameOrigin, safeError, rateLimited, adminBudgetExceeded } from '@/lib/api-guard';
import { PACKAGE_ID, SPARK_TREASURY_CAP_ID, GAME_CONFIG_ID, SUI_RANDOM_ID } from '@/lib/constants';

const PACK_COST_SPARK = 100;
const PACK_REASON = 'open_pack';

// Blade / Ratchet / Bit are the loose parts minted by a pack.
function partType(objectType: string): string | null {
  if (objectType.includes('::blade::')) return 'blade';
  if (objectType.includes('::ratchet::')) return 'ratchet';
  if (objectType.includes('::bit::')) return 'bit';
  return null;
}

// Idempotency-Key header is the outbox dedupe key; fall back to a per-request key
// (still safe — a missing header just means no client-driven retry coalescing).
function idemKey(request: NextRequest, userId: string): string {
  const header = request.headers.get('idempotency-key');
  return header && header.length > 0 ? `open-pack:${userId}:${header}` : `open-pack:${crypto.randomUUID()}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'open-pack', 30, 3600);
    if (limited) return limited;
    const overBudget = await adminBudgetExceeded('open-pack', 600, 3600);
    if (overBudget) return overBudget;

    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    // 1. Reserve the outbox row + debit SPARK BEFORE any chain write.
    const operationId = await reserveOp({
      idempotencyKey: idemKey(request, user.id),
      userId: user.id,
      action: PACK_REASON,
      request: { cost: PACK_COST_SPARK },
    });

    try {
      await reserveSpark(user.id, PACK_COST_SPARK, PACK_REASON, operationId);
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_FUNDS') {
        await markOp(operationId, { state: 'failed', lastError: 'INSUFFICIENT_FUNDS' });
        return NextResponse.json({ error: 'Not enough SPARK to open a pack.' }, { status: 402 });
      }
      throw err;
    }

    // 2. Relay the mint to platform custody. On failure, release the reservation.
    let relay;
    try {
      relay = await submitRelay('minter', (tx) => {
        tx.moveCall({
          target: `${PACKAGE_ID}::pack::open_pack_for`,
          arguments: [
            tx.object(SPARK_TREASURY_CAP_ID),
            tx.object(GAME_CONFIG_ID),
            tx.pure.address(user.chainSubject),
            tx.pure.vector('u8', Array.from(Buffer.from(operationId))),
            tx.object(SUI_RANDOM_ID),
          ],
        });
      });
    } catch (err) {
      await releaseReservation(operationId);
      await markOp(operationId, {
        state: 'reconcile_needed',
        lastError: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // 3. Attribute every minted part to the user, then settle the reservation.
    const parts = relay.created.filter((c) => partType(c.objectType) !== null);
    for (const part of parts) {
      await recordMint(user.id, part.objectId, partType(part.objectType)!, {
        txDigest: relay.digest,
        operationId,
        chainOwner: PLATFORM_CUSTODY,
        acquiredVia: PACK_REASON,
      });
    }
    await settleReservation(operationId);
    await markOp(operationId, { state: 'db_applied', txDigest: relay.digest });

    const balance = await getBalance(user.id);
    return NextResponse.json(
      {
        success: true,
        operationId,
        digest: relay.digest,
        parts: parts.length,
        partIds: parts.map((p) => p.objectId),
        balance,
        message: `Pack opened! ${parts.length} parts added to your collection.`,
      },
      { status: 202 },
    );
  } catch (err) {
    return safeError(err, 'Pack open failed');
  }
}
