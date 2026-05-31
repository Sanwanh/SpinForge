import { NextResponse } from 'next/server';

const PKG_ORIG = '0x79e8552bfb9b9cf61b3534a03061b222f022671be4b384efa55d557586ed2110';
const RPC = 'https://fullnode.testnet.sui.io:443';

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return res.json();
}

// H-RT-4: rank by the forgery-resistant `BattleRecordCommitted` event, NOT the
// self-reportable `player_profile::ProfileUpdated.elo`. `record_battle_result`
// is a public, ungated mutator on a player-owned object, so any user can pump
// their own ELO/wins in their own PTB and top a ProfileUpdated-based board.
// `BattleRecordCommitted` only fires when BOTH participants confirm a record
// that was minted by the AdminCap-gated backend (battle_record::create), which
// already verified the submitter is a participant — a single player cannot forge
// it. We aggregate wins per winner address from those committed records.
interface CommittedEvent {
  winner?: string;
  finish_type?: number;
  score_a?: number;
  score_b?: number;
}

interface Standing {
  address: string;
  wins: number;
  xtremeFinishes: number;
}

const FINISH_XTREME = 3;

export async function GET() {
  const result = await rpc('suix_queryEvents', [
    { MoveEventType: `${PKG_ORIG}::battle_record::BattleRecordCommitted` },
    null,
    200,
    true,
  ]);

  const standings = new Map<string, Standing>();

  for (const e of result.result?.data ?? []) {
    const pj = e.parsedJson as CommittedEvent;
    const winner = pj.winner;
    if (!winner) continue;
    const cur = standings.get(winner) ?? { address: winner, wins: 0, xtremeFinishes: 0 };
    cur.wins += 1;
    if (Number(pj.finish_type) === FINISH_XTREME) cur.xtremeFinishes += 1;
    standings.set(winner, cur);
  }

  const leaderboard = Array.from(standings.values())
    .sort((a, b) => b.wins - a.wins || b.xtremeFinishes - a.xtremeFinishes)
    .slice(0, 20);

  return NextResponse.json({ leaderboard });
}
