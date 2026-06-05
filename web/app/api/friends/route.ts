import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser } from '@/lib/server-user';
import { isSameOrigin, rateLimited, safeError } from '@/lib/api-guard';

// Friends + battle invites, session-authenticated over Postgres.
// Identity ALWAYS comes from the session (requireGameUser) — never from the
// request body. Other users are referenced by their public `handle`, resolved
// here to an internal user id. Friendship is stored once per pair under a
// canonical (low, high) ordering so a single row covers both directions.

const HANDLE_RE = /^[A-Za-z0-9_-]{2,40}$/;
const CODE_RE = /^[A-Z0-9]{4,16}$/;

interface ProfileRow { user_id: string; handle: string; [k: string]: unknown }

function isHandle(v: unknown): v is string {
  return typeof v === 'string' && HANDLE_RE.test(v);
}

// Canonical pair ordering used by the friendships / direct_chat_threads indexes.
function pair(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

async function findUserByHandle(handle: string): Promise<ProfileRow | null> {
  const rows = await db.execute<ProfileRow>(sql`
    SELECT user_id, handle FROM profiles WHERE handle = ${handle} LIMIT 1
  `);
  return rows[0] ?? null;
}

// GET /api/friends -> { friends, requests, invite } for the session user.
//   friends  : handles of accepted friends
//   requests : handles who requested ME and await my accept/decline
//   invite   : most recent open battle room where I am the invited opponent
export async function GET(request: NextRequest) {
  try {
    const guard = await requireGameUser(request.headers);
    if ('error' in guard) return guard.error;
    const me = guard.user.id;

    const friendRows = await db.execute<{ handle: string }>(sql`
      SELECT p.handle AS handle
      FROM friendships f
      JOIN profiles p ON p.user_id = CASE WHEN f.user_low_id = ${me} THEN f.user_high_id ELSE f.user_low_id END
      WHERE (f.user_low_id = ${me} OR f.user_high_id = ${me})
        AND f.status = 'accepted'
      ORDER BY f.updated_at DESC
    `);

    const requestRows = await db.execute<{ handle: string }>(sql`
      SELECT p.handle AS handle
      FROM friendships f
      JOIN profiles p ON p.user_id = f.requested_by
      WHERE (f.user_low_id = ${me} OR f.user_high_id = ${me})
        AND f.status = 'pending'
        AND f.requested_by <> ${me}
      ORDER BY f.created_at DESC
    `);

    const inviteRows = await db.execute<{ code: string; handle: string; created_at: string }>(sql`
      SELECT r.code AS code, p.handle AS handle, r.created_at AS created_at
      FROM battle_rooms r
      JOIN profiles p ON p.user_id = r.creator_id
      WHERE r.opponent_id = ${me} AND r.status = 'open'
      ORDER BY r.created_at DESC
      LIMIT 1
    `);
    const inv = inviteRows[0];
    const invite = inv
      ? { from: inv.handle, roomId: inv.code, at: new Date(inv.created_at).getTime() }
      : null;

    return NextResponse.json({
      friends: friendRows.map((r) => r.handle),
      requests: requestRows.map((r) => r.handle),
      invite,
    });
  } catch (err) {
    return safeError(err, 'Failed to load friends');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'friends', 60, 3600);
    if (limited) return limited;

    const guard = await requireGameUser(request.headers);
    if ('error' in guard) return guard.error;
    const me = guard.user.id;

    const body = await request.json();
    const action = body?.action;

    switch (action) {
      case 'request': {
        if (!isHandle(body.to)) {
          return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
        }
        const target = await findUserByHandle(body.to);
        if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (target.user_id === me) {
          return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 });
        }
        const { low, high } = pair(me, target.user_id);
        // Insert a pending request; if any row (pending/accepted) already exists
        // the pair index makes this a no-op. Already-accepted -> alreadyFriends.
        await db.execute(sql`
          INSERT INTO friendships (user_low_id, user_high_id, requested_by, status)
          VALUES (${low}, ${high}, ${me}, 'pending')
          ON CONFLICT (user_low_id, user_high_id) DO NOTHING
        `);
        const existing = await db.execute<{ status: string }>(sql`
          SELECT status FROM friendships WHERE user_low_id = ${low} AND user_high_id = ${high} LIMIT 1
        `);
        const alreadyFriends = existing[0]?.status === 'accepted';
        return NextResponse.json({ success: true, alreadyFriends });
      }

      case 'accept': {
        if (!isHandle(body.from)) {
          return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
        }
        const other = await findUserByHandle(body.from);
        if (!other) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        const { low, high } = pair(me, other.user_id);
        // Only accept a request that the OTHER user initiated to me.
        const updated = await db.execute<{ user_low_id: string }>(sql`
          UPDATE friendships
          SET status = 'accepted', updated_at = now()
          WHERE user_low_id = ${low} AND user_high_id = ${high}
            AND status = 'pending' AND requested_by = ${other.user_id}
          RETURNING user_low_id
        `);
        if (!updated[0]) return NextResponse.json({ error: 'No such request' }, { status: 404 });
        return NextResponse.json({ success: true });
      }

      case 'decline': {
        if (!isHandle(body.from)) {
          return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
        }
        const other = await findUserByHandle(body.from);
        if (!other) return NextResponse.json({ success: true });
        const { low, high } = pair(me, other.user_id);
        await db.execute(sql`
          DELETE FROM friendships
          WHERE user_low_id = ${low} AND user_high_id = ${high}
            AND status = 'pending' AND requested_by = ${other.user_id}
        `);
        return NextResponse.json({ success: true });
      }

      case 'remove': {
        if (!isHandle(body.friend)) {
          return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
        }
        const other = await findUserByHandle(body.friend);
        if (!other) return NextResponse.json({ success: true });
        const { low, high } = pair(me, other.user_id);
        await db.execute(sql`
          DELETE FROM friendships WHERE user_low_id = ${low} AND user_high_id = ${high}
        `);
        return NextResponse.json({ success: true });
      }

      case 'invite-battle': {
        if (!isHandle(body.to) || typeof body.roomId !== 'string' || !CODE_RE.test(body.roomId)) {
          return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
        }
        const target = await findUserByHandle(body.to);
        if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (target.user_id === me) {
          return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
        }
        // Mark MY open room as inviting this friend. Only the room creator may
        // invite, and only while the room is still open and unclaimed.
        const updated = await db.execute<{ id: string }>(sql`
          UPDATE battle_rooms
          SET opponent_id = ${target.user_id}, updated_at = now()
          WHERE code = ${body.roomId} AND creator_id = ${me} AND status = 'open'
          RETURNING id
        `);
        if (!updated[0]) return NextResponse.json({ error: 'Room not available' }, { status: 404 });
        return NextResponse.json({ success: true });
      }

      case 'clear-invite': {
        // Decline any open invites addressed to me by detaching me as opponent.
        await db.execute(sql`
          UPDATE battle_rooms
          SET opponent_id = NULL, updated_at = now()
          WHERE opponent_id = ${me} AND status = 'open'
        `);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    return safeError(err, 'Friends action failed');
  }
}
