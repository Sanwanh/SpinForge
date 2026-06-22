// Per-Bey battle stats, derived from the `battles` table. The on-chain Bey
// object's wins/losses fields are never mutated by the web2-hybrid settlement
// (record_win/loss are public(package) and the relay does not own the Beys), so
// the DB is the source of truth for "this Bey's record". A Bey appears as
// rotor_a (player A) or rotor_b (player B); it won when the winner is its side.

import { sql, type SQL } from 'drizzle-orm';
import { db } from './db';

export interface BeyStats {
  wins: number;
  losses: number;
  battles: number;
  burstFinishes: number;
  xtremeFinishes: number;
}

// Parameterized `(v1, v2, ...)` list — each value is bound, never interpolated.
function inList(values: string[]): SQL {
  return sql`(${sql.join(values.map((v) => sql`${v}`), sql`, `)})`;
}

/** Map of Bey objectId -> aggregated battle stats (only Beys with battles). */
export async function getBeyBattleStats(objectIds: string[]): Promise<Map<string, BeyStats>> {
  const out = new Map<string, BeyStats>();
  const unique = [...new Set(objectIds)].filter(Boolean);
  if (unique.length === 0) return out;
  const list = inList(unique);
  const rows = await db.execute<{
    bey: string; wins: string; losses: string; battles: string; burst: string; xtreme: string;
  }>(sql`
    SELECT bey,
      COUNT(*) FILTER (WHERE won) AS wins,
      COUNT(*) FILTER (WHERE NOT won AND has_winner) AS losses,
      COUNT(*) AS battles,
      COUNT(*) FILTER (WHERE won AND ft = 2) AS burst,
      COUNT(*) FILTER (WHERE won AND ft = 3) AS xtreme
    FROM (
      SELECT rotor_a AS bey, (winner_id = player_a_id) AS won,
             (winner_id IS NOT NULL) AS has_winner, finish_type AS ft
        FROM battles WHERE rotor_a IN ${list}
      UNION ALL
      SELECT rotor_b AS bey, (winner_id = player_b_id) AS won,
             (winner_id IS NOT NULL) AS has_winner, finish_type AS ft
        FROM battles WHERE rotor_b IN ${list}
    ) t
    GROUP BY bey
  `);
  for (const r of rows) {
    out.set(r.bey, {
      wins: Number(r.wins),
      losses: Number(r.losses),
      battles: Number(r.battles),
      burstFinishes: Number(r.burst),
      xtremeFinishes: Number(r.xtreme),
    });
  }
  return out;
}
