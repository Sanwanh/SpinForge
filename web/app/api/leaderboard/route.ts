// Leaderboard: ranks players from the authoritative Postgres `leaderboard_entries`
// table (populated by the battle-settlement path), joined to `profiles` for handle
// / display name. Public read — no session required. Season-scoped: an explicit
// ?season= wins, otherwise the most recently updated season is used so the board
// never goes empty on a season-string mismatch.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { safeError } from '@/lib/api-guard';

const TOP_N = 20;

type Row = {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  elo: number;
  wins: number;
  losses: number;
  xtreme_finishes: number;
};

async function resolveSeason(requested: string | null): Promise<string | null> {
  if (requested) return requested;
  const latest = await db.execute<{ season: string }>(sql`
    SELECT season FROM leaderboard_entries
    ORDER BY updated_at DESC
    LIMIT 1
  `);
  return latest[0]?.season ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = await resolveSeason(searchParams.get('season'));

    if (!season) {
      return NextResponse.json({ season: null, leaderboard: [] });
    }

    const rows = await db.execute<Row>(sql`
      SELECT le.user_id, p.handle, p.display_name,
             le.elo, le.wins, le.losses, le.xtreme_finishes
      FROM leaderboard_entries le
      LEFT JOIN profiles p ON p.user_id = le.user_id
      WHERE le.season = ${season}
      ORDER BY le.elo DESC, le.wins DESC, le.xtreme_finishes DESC
      LIMIT ${TOP_N}
    `);

    const leaderboard = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      handle: r.handle,
      displayName: r.display_name,
      elo: Number(r.elo),
      wins: Number(r.wins),
      losses: Number(r.losses),
      xtremeFinishes: Number(r.xtreme_finishes),
    }));

    return NextResponse.json({ season, leaderboard });
  } catch (err) {
    return safeError(err, 'Leaderboard unavailable');
  }
}
