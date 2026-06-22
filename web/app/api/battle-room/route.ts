import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser, type GameUser } from '@/lib/server-user';
import { isSameOrigin, rateLimited, safeError } from '@/lib/api-guard';

// Negotiated battle lobby, session-authenticated over Postgres. The actor is
// ALWAYS the session user; their role (creator vs opponent) is derived from the
// room row, never from a body 'player'/'submitter' field. Rotor selections and
// the agreed outcome live in the room's `result` jsonb (the schema gives one
// flexible column for room state); the persisted `status` uses the schema enum
// (open|active|reporting|settled|cancelled) while the API reports the legacy
// vocabulary (waiting|ready|in_progress|submitted|confirmed) the UI expects.

const CODE_RE = /^[A-Z0-9]{4,16}$/;

// Mutable room state we keep inside battle_rooms.result.
interface RoomState {
  creatorRotor: string | null;
  creatorRotorName: string | null;
  opponentRotor: string | null;
  opponentRotorName: string | null;
  // Shared, server-authoritative match timer (epoch ms). A single start/end
  // pair drives BOTH players' clocks, so the derived duration is identical for
  // both — there is no "two stopwatches disagree" problem.
  battleStartedAt: number | null;
  battleEndedAt: number | null;
  outcome: { winnerId: string; finishType: number; scoreA: number; scoreB: number } | null;
}

interface RoomRow {
  id: string;
  code: string;
  creator_id: string;
  opponent_id: string | null;
  status: string;
  result: RoomState | null;
  created_at: string;
  [k: string]: unknown;
}

interface ResolvedRoom {
  row: RoomRow;
  creatorHandle: string;
  opponentHandle: string | null;
}

function emptyState(): RoomState {
  return {
    creatorRotor: null,
    creatorRotorName: null,
    opponentRotor: null,
    opponentRotorName: null,
    battleStartedAt: null,
    battleEndedAt: null,
    outcome: null,
  };
}

function generateCode(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

// Map the persisted schema status + state into the legacy status the UI reads.
function legacyStatus(row: RoomRow, state: RoomState): string {
  switch (row.status) {
    case 'open':
      return 'waiting';
    case 'active':
      return state.creatorRotor && state.opponentRotor ? 'in_progress' : 'ready';
    case 'reporting':
      return 'submitted';
    case 'settled':
      return 'confirmed';
    case 'cancelled':
      return 'cancelled';
    default:
      return row.status;
  }
}

// Derive the agreed match duration (seconds) from the shared timer. Floored to
// whole seconds so both players see exactly the same integer. Null until ended.
function durationSecondsOf(state: RoomState): number | null {
  if (state.battleStartedAt == null || state.battleEndedAt == null) return null;
  // Cap at 24h: a longer value means a forgotten timer, and an uncapped value
  // would overflow the pg `integer` column. 0 ≤ duration ≤ 86400.
  return Math.min(86400, Math.max(0, Math.floor((state.battleEndedAt - state.battleStartedAt) / 1000)));
}

// Shape a resolved room into the object the existing UI consumes. Identities are
// handles; result.winner is the winner's handle.
function shapeRoom(resolved: ResolvedRoom, viewerId?: string) {
  const { row, creatorHandle, opponentHandle } = resolved;
  const state = row.result ?? emptyState();
  // Which side the requesting session is — the ONLY reliable self/opponent
  // signal (creator/opponent are handles, not user ids, so the client cannot
  // derive its own side by comparing handles to its user id).
  const youAre: 'creator' | 'opponent' | null =
    viewerId === row.creator_id ? 'creator' : viewerId === row.opponent_id ? 'opponent' : null;
  const winnerHandle = state.outcome
    ? state.outcome.winnerId === row.creator_id
      ? creatorHandle
      : opponentHandle
    : null;
  return {
    id: row.code,
    creator: creatorHandle,
    creatorRotor: state.creatorRotor,
    creatorRotorName: state.creatorRotorName,
    opponent: opponentHandle,
    opponentRotor: state.opponentRotor,
    opponentRotorName: state.opponentRotorName,
    battleStartedAt: state.battleStartedAt,
    battleEndedAt: state.battleEndedAt,
    durationSeconds: durationSecondsOf(state),
    youAre,
    status: legacyStatus(row, state),
    result: state.outcome
      ? {
          winner: winnerHandle ?? '',
          finishType: state.outcome.finishType,
          scoreA: state.outcome.scoreA,
          scoreB: state.outcome.scoreB,
        }
      : null,
    createdAt: new Date(row.created_at).getTime(),
  };
}

async function handleFor(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const rows = await db.execute<{ handle: string }>(sql`
    SELECT handle FROM profiles WHERE user_id = ${userId} LIMIT 1
  `);
  return rows[0]?.handle ?? null;
}

async function resolveRoom(code: string): Promise<ResolvedRoom | null> {
  if (!CODE_RE.test(code)) return null;
  const rows = await db.execute<RoomRow>(sql`
    SELECT id, code, creator_id, opponent_id, status, result, created_at
    FROM battle_rooms WHERE code = ${code} LIMIT 1
  `);
  const row = rows[0];
  if (!row) return null;
  const [creatorHandle, opponentHandle] = await Promise.all([
    handleFor(row.creator_id),
    handleFor(row.opponent_id),
  ]);
  return { row, creatorHandle: creatorHandle ?? '', opponentHandle };
}

async function persistState(roomId: string, status: string, state: RoomState): Promise<void> {
  await db.execute(sql`
    UPDATE battle_rooms
    SET status = ${status}, result = ${JSON.stringify(state)}::jsonb,
        version = version + 1, updated_at = now()
    WHERE id = ${roomId}
  `);
}

// Lobby browse is not supported (rooms are joined by code), so this is empty.
export async function GET() {
  return NextResponse.json({ rooms: [] });
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    // Realtime lobby: clients poll `get` every ~3s, so the cap must accommodate
    // sustained polling (1800/h ≈ one call every 2s for a full hour).
    const limited = await rateLimited(request, 'battle-room', 1800, 3600);
    if (limited) return limited;

    const guard = await requireGameUser(request.headers);
    if ('error' in guard) return guard.error;
    const me: GameUser = guard.user;

    const body = await request.json();
    const action = body?.action;

    switch (action) {
      case 'create': {
        const code = generateCode();
        const rows = await db.execute<{ id: string; created_at: string }>(sql`
          INSERT INTO battle_rooms (code, creator_id, status, result)
          VALUES (${code}, ${me.id}, 'open', ${JSON.stringify(emptyState())}::jsonb)
          RETURNING id, created_at
        `);
        const resolved: ResolvedRoom = {
          row: {
            id: rows[0].id,
            code,
            creator_id: me.id,
            opponent_id: null,
            status: 'open',
            result: emptyState(),
            created_at: rows[0].created_at,
          },
          creatorHandle: me.handle,
          opponentHandle: null,
        };
        const room = shapeRoom(resolved, me.id);
        return NextResponse.json({ success: true, roomId: code, room });
      }

      case 'join': {
        const resolved = await resolveRoom(body.roomId);
        if (!resolved) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        const { row } = resolved;
        if (row.creator_id === me.id) {
          return NextResponse.json({ error: 'Cannot join your own room' }, { status: 400 });
        }
        // Open and unclaimed -> claim it. Allow re-join by the invited opponent.
        if (row.status !== 'open' || (row.opponent_id && row.opponent_id !== me.id)) {
          return NextResponse.json({ error: 'Room not available' }, { status: 400 });
        }
        await db.execute(sql`
          UPDATE battle_rooms
          SET opponent_id = ${me.id}, status = 'active', version = version + 1, updated_at = now()
          WHERE id = ${row.id} AND status = 'open'
        `);
        const fresh = await resolveRoom(body.roomId);
        return NextResponse.json({ success: true, room: shapeRoom(fresh!, me.id) });
      }

      case 'select-rotor': {
        const resolved = await resolveRoom(body.roomId);
        if (!resolved) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        const { row } = resolved;
        const isCreator = row.creator_id === me.id;
        const isOpponent = row.opponent_id === me.id;
        if (!isCreator && !isOpponent) {
          return NextResponse.json({ error: 'Not a participant' }, { status: 400 });
        }
        const rotorId = typeof body.rotorId === 'string' ? body.rotorId : null;
        const rotorName = typeof body.rotorName === 'string' ? body.rotorName : null;
        const state = { ...(row.result ?? emptyState()) };
        if (isCreator) {
          state.creatorRotor = rotorId;
          state.creatorRotorName = rotorName;
        } else {
          state.opponentRotor = rotorId;
          state.opponentRotorName = rotorName;
        }
        // Both sides chosen -> stays 'active' but legacyStatus reports in_progress.
        await persistState(row.id, 'active', state);
        const fresh = await resolveRoom(body.roomId);
        return NextResponse.json({ success: true, room: shapeRoom(fresh!, me.id) });
      }

      // Synchronized match timer: either participant starts it once both Beys
      // are chosen; the single server timestamp drives BOTH clients' clocks.
      case 'start-battle': {
        const resolved = await resolveRoom(body.roomId);
        if (!resolved) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        const { row } = resolved;
        if (row.creator_id !== me.id && row.opponent_id !== me.id) {
          return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
        }
        const state = { ...(row.result ?? emptyState()) };
        if (!state.creatorRotor || !state.opponentRotor) {
          return NextResponse.json({ error: 'Both players must choose a Bey first' }, { status: 409 });
        }
        // Idempotent: first starter wins; later calls keep the original timestamp.
        if (state.battleStartedAt == null) {
          state.battleStartedAt = Date.now();
          state.battleEndedAt = null;
          await persistState(row.id, 'active', state);
        }
        const fresh = await resolveRoom(body.roomId);
        return NextResponse.json({ success: true, room: shapeRoom(fresh!, me.id) });
      }

      // Either participant stops the shared timer; the single end timestamp
      // fixes one duration both players will confirm.
      case 'end-battle': {
        const resolved = await resolveRoom(body.roomId);
        if (!resolved) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        const { row } = resolved;
        if (row.creator_id !== me.id && row.opponent_id !== me.id) {
          return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
        }
        const state = { ...(row.result ?? emptyState()) };
        if (state.battleStartedAt == null) {
          return NextResponse.json({ error: 'Battle has not started' }, { status: 409 });
        }
        // Idempotent: first stopper fixes the duration; later calls keep it.
        if (state.battleEndedAt == null) {
          state.battleEndedAt = Date.now();
          await persistState(row.id, 'active', state);
        }
        const fresh = await resolveRoom(body.roomId);
        return NextResponse.json({ success: true, room: shapeRoom(fresh!, me.id) });
      }

      case 'submit-result': {
        const resolved = await resolveRoom(body.roomId);
        if (!resolved) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        const { row, creatorHandle, opponentHandle } = resolved;
        if (row.creator_id !== me.id && row.opponent_id !== me.id) {
          return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
        }
        // winner is a participant handle; resolve it back to a user id.
        const winnerHandle = typeof body.winner === 'string' ? body.winner : '';
        let winnerId: string | null = null;
        if (winnerHandle === creatorHandle) winnerId = row.creator_id;
        else if (opponentHandle && winnerHandle === opponentHandle) winnerId = row.opponent_id;
        if (!winnerId) {
          return NextResponse.json({ error: 'Winner must be a participant' }, { status: 400 });
        }
        // Bound the proposed values here (the single write into the room): the
        // confirmer echoes them to /api/submit-result, so out-of-range values
        // would otherwise deadlock the match at the strict server validator.
        const ft = Number(body.finishType);
        const sa = Number(body.scoreA);
        const sb = Number(body.scoreB);
        const inRange = (v: number, max: number) => Number.isInteger(v) && v >= 0 && v <= max;
        if (!inRange(ft, 3) || !inRange(sa, 15) || !inRange(sb, 15)) {
          return NextResponse.json({ error: 'Invalid result values' }, { status: 400 });
        }
        const state = { ...(row.result ?? emptyState()) };
        state.outcome = { winnerId, finishType: ft, scoreA: sa, scoreB: sb };
        await persistState(row.id, 'reporting', state);
        const fresh = await resolveRoom(body.roomId);
        return NextResponse.json({ success: true, room: shapeRoom(fresh!, me.id) });
      }

      case 'confirm-result': {
        const resolved = await resolveRoom(body.roomId);
        if (!resolved) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        const { row } = resolved;
        if (row.creator_id !== me.id && row.opponent_id !== me.id) {
          return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
        }
        const state = row.result ?? emptyState();
        if (!state.outcome) {
          return NextResponse.json({ error: 'No result to confirm' }, { status: 400 });
        }
        await persistState(row.id, 'settled', state);
        const fresh = await resolveRoom(body.roomId);
        return NextResponse.json({ success: true, room: shapeRoom(fresh!, me.id) });
      }

      case 'get': {
        const resolved = await resolveRoom(body.roomId);
        if (!resolved) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        return NextResponse.json({ room: shapeRoom(resolved, me.id) });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return safeError(err, 'Battle room action failed');
  }
}
