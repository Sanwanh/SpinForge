// Submit a battle result — web2-hybrid flow (plan section E, submit-result).
// Both participants are session-authenticated; each posts the result for their
// shared room. We resolve the two players + their Beys from `battle_rooms` /
// `ownership`, compute a canonical result hash, and record one confirmation per
// user. Only when BOTH confirmations agree on the same hash do we relay a single
// `battle_record::create_committed` (already-committed) record into platform
// custody, insert the `battles` row + record-attribution ownership, and update
// the leaderboard. Identity is the session user — never the request body.

import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser, chainSubjectFor } from '@/lib/server-user';
import { reserveOp, markOp } from '@/lib/chain-ops';
import { assertOwns } from '@/lib/ownership';
import { submitRelay, PLATFORM_CUSTODY } from '@/lib/relay';
import { isSameOrigin, safeError, rateLimited, adminBudgetExceeded } from '@/lib/api-guard';
import { PACKAGE_ID, ADMIN_CAP_ID } from '@/lib/constants';

const RESULT_REASON = 'submit_result';
const SUI_CLOCK = '0x6';
const DEFAULT_SEASON = 'S1';

// The fully-resolved, server-trusted result. Everything here is derived from
// the room row, never taken verbatim from the request body.
// 'draw' is a tie: no winner. winnerId is null and the on-chain winner is the
// zero address (no contract change needed — it is just a sentinel value).
type WinnerSide = 'creator' | 'opponent' | 'draw';

interface Result {
  roomId: string;
  winnerId: string | null;
  finishType: number;
  scoreA: number;
  scoreB: number;
  rotorA: string;
  rotorB: string;
  durationSeconds: number;
}

// What the client is allowed to assert: which room, who won (by SIDE, not id),
// and the score line. Identity, Beys and duration are NOT trusted from the body.
interface ResultInput {
  code: string;
  winnerSide: WinnerSide;
  finishType: number;
  scoreA: number;
  scoreB: number;
}

const CODE_RE = /^[A-Z0-9]{4,16}$/;
// On-chain sentinel for a draw (no winner address).
const ZERO_ADDRESS = `0x${'0'.repeat(64)}`;

function boundedInt(v: unknown, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function parseInput(body: unknown): ResultInput | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.code !== 'string' || !CODE_RE.test(b.code)) return null;
  if (b.winnerSide !== 'creator' && b.winnerSide !== 'opponent' && b.winnerSide !== 'draw') return null;
  if (!boundedInt(b.finishType, 0, 3) || !boundedInt(b.scoreA, 0, 15) || !boundedInt(b.scoreB, 0, 15)) {
    return null;
  }
  return {
    code: b.code,
    winnerSide: b.winnerSide,
    finishType: b.finishType as number,
    scoreA: b.scoreA as number,
    scoreB: b.scoreB as number,
  };
}

type RoomState = {
  creatorRotor: string | null;
  opponentRotor: string | null;
  battleStartedAt: number | null;
  battleEndedAt: number | null;
};

type RoomRow = {
  id: string;
  creator_id: string;
  opponent_id: string | null;
  status: string;
  result: RoomState | null;
};

// Server-authoritative duration: derived from the single shared timer, so both
// participants resolve the SAME integer (floored seconds).
function durationFromRoom(state: RoomState | null): number {
  if (!state || state.battleStartedAt == null || state.battleEndedAt == null) return 0;
  // Cap at 24h: bounds the pg `integer` column and a forgotten-timer abuse case.
  return Math.min(86400, Math.max(0, Math.floor((state.battleEndedAt - state.battleStartedAt) / 1000)));
}

// Deterministic hash over the canonical (playerA-ordered) result so both
// participants' submissions must agree byte-for-byte to commit.
function resultHash(playerAId: string, playerBId: string, r: Result): string {
  const canonical = JSON.stringify({
    roomId: r.roomId,
    playerAId,
    playerBId,
    winnerId: r.winnerId,
    finishType: r.finishType,
    scoreA: r.scoreA,
    scoreB: r.scoreB,
    rotorA: r.rotorA,
    rotorB: r.rotorB,
    durationSeconds: r.durationSeconds,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    // A match makes only a few calls per player (propose + confirm + a final
    // fetch); 60/h leaves headroom for retries without enabling abuse.
    const limited = await rateLimited(request, 'submit-result', 60, 3600);
    if (limited) return limited;
    const overBudget = await adminBudgetExceeded('submit-result', 600, 3600);
    if (overBudget) return overBudget;

    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json({ error: 'Invalid result' }, { status: 400 });
    }

    // 1. Resolve the room by its shareable code (server-trusted, not from body).
    const rooms = await db.execute<RoomRow>(sql`
      SELECT id, creator_id, opponent_id, status, result FROM battle_rooms WHERE code = ${input.code} LIMIT 1
    `);
    const room = rooms[0];
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (!room.opponent_id) {
      return NextResponse.json({ error: 'Room has no opponent yet' }, { status: 409 });
    }
    if (room.status === 'cancelled') {
      return NextResponse.json({ error: 'Room is already closed' }, { status: 409 });
    }

    const playerAId = room.creator_id;
    const playerBId = room.opponent_id;

    // 2. The reporter must be one of the two participants.
    if (user.id !== playerAId && user.id !== playerBId) {
      return NextResponse.json({ error: 'You are not a participant in this match' }, { status: 403 });
    }

    // 3. Build the fully server-trusted result: winner from SIDE, Beys + duration
    //    from the room row. The body never carries identities, Beys or duration.
    const rotorA = room.result?.creatorRotor ?? null;
    const rotorB = room.result?.opponentRotor ?? null;
    if (!rotorA || !rotorB) {
      return NextResponse.json({ error: 'Both players must choose a Bey first' }, { status: 409 });
    }
    const result: Result = {
      roomId: room.id,
      winnerId: input.winnerSide === 'draw' ? null : input.winnerSide === 'creator' ? playerAId : playerBId,
      finishType: input.finishType,
      scoreA: input.scoreA,
      scoreB: input.scoreB,
      rotorA,
      rotorB,
      durationSeconds: durationFromRoom(room.result),
    };

    // 4. Verify each Bey is owned by the matching player.
    const ownsA = await assertOwns(playerAId, [result.rotorA]);
    const ownsB = await assertOwns(playerBId, [result.rotorB]);
    if (!ownsA || !ownsB) {
      return NextResponse.json({ error: 'A reported Bey is not owned by its player' }, { status: 400 });
    }

    // 4. Record this user's confirmation of the canonical hash.
    const hash = resultHash(playerAId, playerBId, result);
    await db.execute(sql`
      INSERT INTO battle_confirmations (room_id, user_id, result_hash)
      VALUES (${result.roomId}, ${user.id}, ${hash})
      ON CONFLICT (room_id, user_id)
      DO UPDATE SET result_hash = ${hash}, created_at = now()
    `);

    // 5. Both participants must have confirmed the SAME hash to commit on-chain.
    const confirmations = await db.execute<{ user_id: string; result_hash: string }>(sql`
      SELECT user_id, result_hash FROM battle_confirmations WHERE room_id = ${result.roomId}
    `);
    const byA = confirmations.find((c) => c.user_id === playerAId);
    const byB = confirmations.find((c) => c.user_id === playerBId);
    const bothAgree = !!byA && !!byB && byA.result_hash === hash && byB.result_hash === hash;
    if (!bothAgree) {
      return NextResponse.json({
        success: true,
        committed: false,
        message: 'Result recorded. Waiting for your opponent to confirm.',
      });
    }

    // 6. Both agree — idempotently relay ONE committed record.
    const operationId = await reserveOp({
      idempotencyKey: `submit-result:${result.roomId}:${hash}`,
      userId: user.id,
      action: RESULT_REASON,
      request: { ...result, playerAId, playerBId },
    });

    // If this room already settled (concurrent confirm won the race), short-circuit.
    const settled = await db.execute<{ id: string; chain_record_id: string | null; tx_digest: string | null }>(sql`
      SELECT id, chain_record_id, tx_digest FROM battles WHERE room_id = ${result.roomId} LIMIT 1
    `);
    if (settled[0]) {
      return NextResponse.json({
        success: true,
        committed: true,
        recordId: settled[0].chain_record_id,
        digest: settled[0].tx_digest,
        message: 'Battle already committed on-chain.',
      });
    }

    const subjectA = chainSubjectFor(playerAId);
    const subjectB = chainSubjectFor(playerBId);
    // Draw → zero address sentinel (no winner); otherwise the winner's subject.
    const winnerSubject = result.winnerId ? chainSubjectFor(result.winnerId) : ZERO_ADDRESS;

    let relay;
    try {
      relay = await submitRelay('recorder', (tx) => {
        const [record] = tx.moveCall({
          target: `${PACKAGE_ID}::battle_record::create_committed`,
          arguments: [
            tx.object(ADMIN_CAP_ID),
            tx.pure.address(subjectA),
            tx.pure.address(subjectB),
            tx.pure.id(result.rotorA),
            tx.pure.id(result.rotorB),
            tx.pure.address(winnerSubject),
            tx.pure.u8(result.finishType),
            tx.pure.u8(result.scoreA),
            tx.pure.u8(result.scoreB),
            tx.pure.u64(result.durationSeconds),
            tx.pure.vector('u8', Array.from(Buffer.from(operationId))),
            tx.object(SUI_CLOCK),
          ],
        });
        // create_committed returns the record; transfer it to platform custody.
        tx.transferObjects([record], PLATFORM_CUSTODY);
      });
    } catch (err) {
      await markOp(operationId, {
        state: 'reconcile_needed',
        lastError: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    const created = relay.created.find((c) => c.objectType.includes('battle_record::BattleRecord'));
    const recordId = created?.objectId ?? null;

    // 7. Persist the settled battle, attribution ownership, leaderboard, room state.
    await db.transaction(async (dbtx) => {
      await dbtx.execute(sql`
        INSERT INTO battles (
          room_id, player_a_id, player_b_id, winner_id,
          finish_type, score_a, score_b, duration_seconds, rotor_a, rotor_b, season,
          chain_record_id, tx_digest, chain_status, operation_id
        )
        VALUES (
          ${result.roomId}, ${playerAId}, ${playerBId}, ${result.winnerId},
          ${result.finishType}, ${result.scoreA}, ${result.scoreB}, ${result.durationSeconds}, ${result.rotorA}, ${result.rotorB}, ${DEFAULT_SEASON},
          ${recordId}, ${relay.digest}, 'committed', ${operationId}
        )
        ON CONFLICT (chain_record_id) DO NOTHING
      `);
      await dbtx.execute(sql`
        UPDATE battle_rooms
        SET status = 'settled', version = version + 1, updated_at = now()
        WHERE id = ${result.roomId}
      `);
      // Draw → both players: no win, no loss, no Elo change.
      const outcomeFor = (uid: string): Outcome =>
        result.winnerId == null ? 'draw' : result.winnerId === uid ? 'win' : 'loss';
      await dbtx.execute(leaderboardUpsert(DEFAULT_SEASON, playerAId, outcomeFor(playerAId), result));
      await dbtx.execute(leaderboardUpsert(DEFAULT_SEASON, playerBId, outcomeFor(playerBId), result));
    });

    // 8. Attribution row for the on-chain record (kind=record_attribution).
    //    Draws have no winner to attribute, so skip.
    if (recordId && result.winnerId) {
      await db.execute(sql`
        INSERT INTO ownership (
          user_id, object_id, object_type, kind, status,
          chain_owner_address, acquired_via, tx_digest, operation_id
        )
        VALUES (
          ${result.winnerId}, ${recordId}, 'battle_record', 'record_attribution', 'active',
          ${PLATFORM_CUSTODY}, ${RESULT_REASON}, ${relay.digest}, ${operationId}
        )
        ON CONFLICT (object_id) DO NOTHING
      `);
    }
    await markOp(operationId, { state: 'db_applied', txDigest: relay.digest });

    return NextResponse.json(
      {
        success: true,
        committed: true,
        operationId,
        recordId,
        digest: relay.digest,
        message: 'Battle committed on-chain.',
      },
      { status: 202 },
    );
  } catch (err) {
    return safeError(err, 'Result submission failed');
  }
}

type Outcome = 'win' | 'loss' | 'draw';

// Win: +1 win, +16 Elo (+xtreme tally on a type-3 finish). Loss: +1 loss, -16.
// Draw: no win, no loss, no Elo change — the match is recorded but unrated.
function leaderboardUpsert(season: string, userId: string, outcome: Outcome, result: Result) {
  const winInc = outcome === 'win' ? 1 : 0;
  const lossInc = outcome === 'loss' ? 1 : 0;
  const eloDelta = outcome === 'win' ? 16 : outcome === 'loss' ? -16 : 0;
  const xtremeInc = outcome === 'win' && result.finishType === 3 ? 1 : 0;
  return sql`
    INSERT INTO leaderboard_entries (season, user_id, elo, wins, losses, xtreme_finishes, updated_at)
    VALUES (${season}, ${userId}, ${1000 + eloDelta}, ${winInc}, ${lossInc}, ${xtremeInc}, now())
    ON CONFLICT (season, user_id)
    DO UPDATE SET
      elo = leaderboard_entries.elo + ${eloDelta},
      wins = leaderboard_entries.wins + ${winInc},
      losses = leaderboard_entries.losses + ${lossInc},
      xtreme_finishes = leaderboard_entries.xtreme_finishes + ${xtremeInc},
      updated_at = now()
  `;
}
