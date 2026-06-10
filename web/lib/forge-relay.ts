// Shared web2-hybrid relay flow for the three Forge operations (evolve / fuse /
// retune). Mirrors assets/assemble + open-pack: same-origin + rate-limit guards,
// session identity, DB ownership gate, transactional outbox, off-chain SPARK
// reserve/settle/release, and an admin-signed PTB.
//
// SPARK is an OFF-CHAIN ledger but the on-chain `forge` functions still require a
// Coin<SPARK_TOKEN> payment + the TreasuryCap (the function burns the coin). The
// relay signer (minter) owns the TreasuryCap, so the PTB MINTS a throwaway
// payment coin and passes it in — net on-chain SPARK supply is unchanged. The
// real cost is debited off-chain via reserveSpark/settleReservation.

import { NextRequest, NextResponse } from 'next/server';
import { Transaction, type TransactionObjectArgument } from '@mysten/sui/transactions';
import { requireGameUser } from '@/lib/server-user';
import { reserveOp, markOp } from '@/lib/chain-ops';
import { assertOwns, markConsumed, recordMint } from '@/lib/ownership';
import { reserveSpark, settleReservation, releaseReservation } from '@/lib/economy';
import { submitRelay, PLATFORM_CUSTODY } from '@/lib/relay';
import { isSameOrigin, safeError, rateLimited } from '@/lib/api-guard';
import { PACKAGE_ID, SPARK_TREASURY_CAP_ID, SPARK_TYPE } from '@/lib/constants';

// On-chain costs (MIST, 9 decimals) and off-chain ledger costs (whole SPARK).
export const FORGE_COSTS = {
  evolve: { spark: 50, mist: 50_000_000_000n },
  fuse: { spark: 200, mist: 200_000_000_000n },
  retune: { spark: 75, mist: 75_000_000_000n },
} as const;

export type ForgeOpName = 'evolve' | 'fuse' | 'retune';

// Output object-type fragment per part kind, used to find the created object.
const OUTPUT_TYPE_FRAGMENT: Record<string, string> = {
  blade: '::blade::Blade',
  ratchet: '::ratchet::Ratchet',
  bit: '::bit::Bit',
};

/**
 * Descriptor a route hands to {@link runForgeOp}. `buildCall` issues the forge
 * moveCall against an already-minted payment coin; `output` (when set) names the
 * part kind of the object the call returns, so the helper can find it in
 * `relay.created`, mark inputs consumed, and attribute the new part. A retune
 * descriptor omits `output` (the blade is mutated in place, nothing created).
 */
export interface ForgeOpDescriptor {
  op: ForgeOpName;
  reason: string; // chain_operations.action + acquired_via
  rateBucket: string; // rate-limit bucket name
  partIds: string[]; // inputs to verify ownership of (gate before relay)
  request: unknown; // persisted in the outbox row
  buildCall: (tx: Transaction, payment: TransactionObjectArgument) => void;
  output?: { partType: string }; // omit for retune (no created object)
}

function idemKey(request: NextRequest, userId: string, op: ForgeOpName): string {
  const header = request.headers.get('idempotency-key');
  return header && header.length > 0
    ? `forge-${op}:${userId}:${header}`
    : `forge-${op}:${crypto.randomUUID()}`;
}

/**
 * Run the full forge relay flow for one operation. Returns a 202 with
 * `{ success, operationId, digest, partId }` on success, or the matching guard
 * response (403 / 401 / 402) / 500 (safeError) on failure. The on-chain PTB and
 * the SPARK/ownership semantics are identical across the three callers.
 */
export async function runForgeOp(
  request: NextRequest,
  desc: ForgeOpDescriptor,
): Promise<Response> {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, desc.rateBucket, 30, 3600);
    if (limited) return limited;

    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const cost = FORGE_COSTS[desc.op];

    if (!(await assertOwns(user.id, desc.partIds))) {
      return NextResponse.json({ error: 'You do not own these parts' }, { status: 403 });
    }

    const operationId = await reserveOp({
      idempotencyKey: idemKey(request, user.id, desc.op),
      userId: user.id,
      action: desc.reason,
      request: desc.request,
    });

    // Reserve SPARK off-chain BEFORE any chain write.
    try {
      await reserveSpark(user.id, cost.spark, desc.reason, operationId);
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_FUNDS') {
        await markOp(operationId, { state: 'failed', lastError: 'INSUFFICIENT_FUNDS' });
        return NextResponse.json({ error: 'Not enough SPARK.' }, { status: 402 });
      }
      throw err;
    }

    // Relay: mint a throwaway payment coin, run the forge call. On failure,
    // release the reservation and flag for reconciliation.
    let relay;
    try {
      relay = await submitRelay('minter', (tx) => {
        const [coin] = tx.moveCall({
          target: '0x2::coin::mint',
          typeArguments: [SPARK_TYPE],
          arguments: [tx.object(SPARK_TREASURY_CAP_ID), tx.pure.u64(cost.mist)],
        });
        desc.buildCall(tx, coin);
      });
    } catch (err) {
      await releaseReservation(operationId);
      await markOp(operationId, {
        state: 'reconcile_needed',
        lastError: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // Post-success DB state. evolve/fuse create a new part; retune does not.
    let newId: string | undefined;
    if (desc.output) {
      const fragment = OUTPUT_TYPE_FRAGMENT[desc.output.partType];
      const made = relay.created.find((c) => c.objectType.includes(fragment));
      if (!made) {
        await releaseReservation(operationId);
        await markOp(operationId, {
          state: 'reconcile_needed',
          txDigest: relay.digest,
          lastError: 'NO_OUTPUT',
        });
        throw new Error('Forge produced no output');
      }
      newId = made.objectId;
      await markConsumed(desc.partIds);
      await recordMint(user.id, newId, desc.output.partType, {
        txDigest: relay.digest,
        operationId,
        chainOwner: PLATFORM_CUSTODY,
        acquiredVia: desc.reason,
      });
    }

    await settleReservation(operationId);
    await markOp(operationId, { state: 'db_applied', txDigest: relay.digest });

    return NextResponse.json(
      {
        success: true,
        operationId,
        digest: relay.digest,
        partId: newId ?? desc.partIds[0],
      },
      { status: 202 },
    );
  } catch (err) {
    return safeError(err, 'Forge failed');
  }
}
