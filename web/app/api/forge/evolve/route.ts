// Forge: evolve 3 Common parts -> 1 Rare part (blade/ratchet/bit). web2-hybrid
// relay — see lib/forge-relay.ts for the shared flow. The body picks the part
// kind, which selects the matching Move entry point; ownership of all three
// inputs is verified server-side, never trusted from the body.

import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { runForgeOp } from '@/lib/forge-relay';
import { PLATFORM_CUSTODY } from '@/lib/relay';
import { PACKAGE_ID, SPARK_TREASURY_CAP_ID } from '@/lib/constants';

const EVOLVE_TARGET: Record<string, string> = {
  blade: 'evolve_blades',
  ratchet: 'evolve_ratchets',
  bit: 'evolve_bits',
};

function isId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function parse(body: unknown): { partIds: [string, string, string]; partType: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { partIds, partType } = body as Record<string, unknown>;
  if (typeof partType !== 'string' || !(partType in EVOLVE_TARGET)) return null;
  if (!Array.isArray(partIds) || partIds.length !== 3 || !partIds.every(isId)) return null;
  if (new Set(partIds).size !== 3) return null; // de-dupe
  return { partIds: partIds as [string, string, string], partType };
}

export async function POST(request: NextRequest) {
  const parsed = parse(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { partIds, partType } = parsed;
  const fn = EVOLVE_TARGET[partType];

  return runForgeOp(request, {
    op: 'evolve',
    reason: 'forge_evolve',
    rateBucket: 'forge-evolve',
    partIds,
    request: parsed,
    output: { partType },
    buildCall: (tx: Transaction, payment) => {
      const [made] = tx.moveCall({
        target: `${PACKAGE_ID}::forge::${fn}`,
        arguments: [
          tx.object(partIds[0]),
          tx.object(partIds[1]),
          tx.object(partIds[2]),
          payment,
          tx.object(SPARK_TREASURY_CAP_ID),
        ],
      });
      tx.transferObjects([made], PLATFORM_CUSTODY);
    },
  });
}
