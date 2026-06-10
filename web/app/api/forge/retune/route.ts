// Forge: retune a blade's attack stat in place. web2-hybrid relay — see
// lib/forge-relay.ts for the shared flow. The Move call mutates the blade and
// returns nothing, so there is no created object: the blade stays in custody and
// nothing is consumed. Ownership of the blade is verified server-side.

import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { runForgeOp } from '@/lib/forge-relay';
import { PACKAGE_ID, SPARK_TREASURY_CAP_ID } from '@/lib/constants';

const MIN_ATTACK = 10;
const MAX_ATTACK = 100;

function isId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function parse(body: unknown): { partId: string; newAttack: number } | null {
  if (!body || typeof body !== 'object') return null;
  const { partId, newAttack } = body as Record<string, unknown>;
  if (!isId(partId)) return null;
  if (typeof newAttack !== 'number' || !Number.isInteger(newAttack)) return null;
  if (newAttack < MIN_ATTACK || newAttack > MAX_ATTACK) return null;
  return { partId, newAttack };
}

export async function POST(request: NextRequest) {
  const parsed = parse(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { partId, newAttack } = parsed;

  return runForgeOp(request, {
    op: 'retune',
    reason: 'forge_retune',
    rateBucket: 'forge-retune',
    partIds: [partId],
    request: parsed,
    // No `output`: retune mutates in place, produces no new object.
    buildCall: (tx: Transaction, payment) => {
      tx.moveCall({
        target: `${PACKAGE_ID}::forge::retune_blade_attack`,
        arguments: [
          tx.object(partId),
          tx.pure.u16(newAttack),
          payment,
          tx.object(SPARK_TREASURY_CAP_ID),
        ],
      });
    },
  });
}
