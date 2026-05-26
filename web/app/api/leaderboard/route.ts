import { NextResponse } from 'next/server';

const PKG_ORIG = '0xcb4ae0641d8cdf704bf42e3254a3d8463256dd6e77fb005250af16702466ce48';
const RPC = 'https://fullnode.testnet.sui.io:443';

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return res.json();
}

export async function GET() {
  const result = await rpc('suix_queryEvents', [
    { MoveEventType: `${PKG_ORIG}::player_profile::ProfileUpdated` },
    null,
    50,
    true,
  ]);

  const profileMap = new Map<string, { wins: number; losses: number; elo: number }>();

  for (const e of result.result?.data ?? []) {
    const pj = e.parsedJson as { profile_id?: string; wins?: number; losses?: number; elo?: number };
    const id = pj.profile_id as string;
    if (id) {
      profileMap.set(id, {
        wins: pj.wins ?? 0,
        losses: pj.losses ?? 0,
        elo: pj.elo ?? 1000,
      });
    }
  }

  const leaderboard = Array.from(profileMap.entries())
    .map(([id, stats]) => ({ profileId: id, ...stats }))
    .sort((a, b) => b.elo - a.elo)
    .slice(0, 20);

  return NextResponse.json({ leaderboard });
}
