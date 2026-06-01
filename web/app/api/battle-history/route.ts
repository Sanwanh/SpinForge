// Battle history: reads the authoritative Postgres `battles` table. Two modes:
//   - ?handle=<h>  public read of that player's matches (resolved via profiles)
//   - (no param)   the signed-in user's own matches (session required)
// No chain query, no wallet — identity for the private mode is the session only.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { getGameUser } from '@/lib/server-user';
import { safeError } from '@/lib/api-guard';

const LIMIT = 20;

type Row = {
  id: string;
  player_a_id: string;
  player_b_id: string;
  winner_id: string | null;
  finish_type: number;
  score_a: number;
  score_b: number;
  season: string | null;
  chain_status: string;
  created_at: string;
  a_handle: string | null;
  a_name: string | null;
  b_handle: string | null;
  b_name: string | null;
};

async function userIdForHandle(handle: string): Promise<string | null> {
  const rows = await db.execute<{ user_id: string }>(sql`
    SELECT user_id FROM profiles WHERE handle = ${handle} LIMIT 1
  `);
  return rows[0]?.user_id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle');

    // Resolve the target user: explicit public handle, else the session user.
    let targetId: string | null;
    if (handle) {
      targetId = await userIdForHandle(handle);
      if (!targetId) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }
    } else {
      const me = await getGameUser(request.headers);
      if (!me) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      targetId = me.id;
    }

    const rows = await db.execute<Row>(sql`
      SELECT b.id, b.player_a_id, b.player_b_id, b.winner_id,
             b.finish_type, b.score_a, b.score_b, b.season,
             b.chain_status, b.created_at,
             pa.handle AS a_handle, pa.display_name AS a_name,
             pb.handle AS b_handle, pb.display_name AS b_name
      FROM battles b
      LEFT JOIN profiles pa ON pa.user_id = b.player_a_id
      LEFT JOIN profiles pb ON pb.user_id = b.player_b_id
      WHERE b.player_a_id = ${targetId} OR b.player_b_id = ${targetId}
      ORDER BY b.created_at DESC
      LIMIT ${LIMIT}
    `);

    const battles = rows.map((r) => ({
      id: r.id,
      finishType: Number(r.finish_type),
      scoreA: Number(r.score_a),
      scoreB: Number(r.score_b),
      season: r.season,
      chainStatus: r.chain_status,
      createdAt: r.created_at,
      playerA: { userId: r.player_a_id, handle: r.a_handle, displayName: r.a_name },
      playerB: { userId: r.player_b_id, handle: r.b_handle, displayName: r.b_name },
      winnerId: r.winner_id,
      // Outcome relative to the queried player (null = draw/unsettled).
      outcome: r.winner_id == null ? 'draw' : r.winner_id === targetId ? 'win' : 'loss',
    }));

    return NextResponse.json({ targetId, battles });
  } catch (err) {
    return safeError(err, 'Battle history unavailable');
  }
}
