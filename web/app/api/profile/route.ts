// Session player profile (DB analogue of the on-chain PlayerProfile): handle,
// display name, and aggregate battle stats. Identity comes from the session.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser } from '@/lib/server-user';
import { safeError } from '@/lib/api-guard';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { id } = auth.user;

    const rows = await db.execute<{
      handle: string;
      display_name: string;
      chain_subject: string;
      wins: number;
      losses: number;
      elo: number;
      xtreme_finishes: number;
    }>(sql`
      SELECT p.handle, p.display_name, p.chain_subject,
             COALESCE(SUM(l.wins), 0)            AS wins,
             COALESCE(SUM(l.losses), 0)          AS losses,
             COALESCE(MAX(l.elo), 1000)          AS elo,
             COALESCE(SUM(l.xtreme_finishes), 0) AS xtreme_finishes
      FROM profiles p
      LEFT JOIN leaderboard_entries l ON l.user_id = p.user_id
      WHERE p.user_id = ${id}
      GROUP BY p.handle, p.display_name, p.chain_subject
      LIMIT 1
    `);

    const row = rows[0];
    if (!row) return NextResponse.json({ fields: null, profileId: '' });

    return NextResponse.json({
      fields: {
        handle: row.handle,
        display_name: row.display_name,
        wins: Number(row.wins),
        losses: Number(row.losses),
        elo: Number(row.elo),
        xtreme_finishes: Number(row.xtreme_finishes),
      },
      profileId: row.chain_subject,
    });
  } catch (err) {
    return safeError(err, 'Profile fetch failed');
  }
}
