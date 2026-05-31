import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address param' }, { status: 400 });
  }

  const result = await rpc('suix_queryEvents', [
    { MoveEventType: `${PKG_ORIG}::battle_record::BattleRecordCommitted` },
    null,
    20,
    true,
  ]);

  const events = (result.result?.data ?? [])
    .map((e: { parsedJson: Record<string, unknown>; timestampMs: string }) => ({
      recordId: e.parsedJson?.record_id,
      winner: e.parsedJson?.winner,
      finishType: e.parsedJson?.finish_type,
      scoreA: e.parsedJson?.score_a,
      scoreB: e.parsedJson?.score_b,
      timestamp: e.timestampMs,
    }))
    .filter((e: { winner: unknown }) => e.winner);

  return NextResponse.json({ battles: events });
}
