// Forge: fuse 2 Rare blades -> 1 Epic blade. web2-hybrid relay — see
// lib/forge-relay.ts for the shared flow. Only blades fuse, so a non-blade
// partType is rejected. Ownership of both inputs is verified server-side.

import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { runForgeOp } from '@/lib/forge-relay';
import { PLATFORM_CUSTODY } from '@/lib/relay';
import { PACKAGE_ID, SPARK_TREASURY_CAP_ID } from '@/lib/constants';

function isId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function parse(body: unknown): { partIds: [string, string]; partType: 'blade' } | null {
  if (!body || typeof body !== 'object') return null;
  const { partIds, partType } = body as Record<string, unknown>;
  if (partType !== 'blade') return null; // only blades fuse
  if (!Array.isArray(partIds) || partIds.length !== 2 || !partIds.every(isId)) return null;
  if (new Set(partIds).size !== 2) return null; // de-dupe
  return { partIds: partIds as [string, string], partType: 'blade' };
}

export async function POST(request: NextRequest) {
  const parsed = parse(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { partIds } = parsed;

  return runForgeOp(request, {
    op: 'fuse',
    reason: 'forge_fuse',
    rateBucket: 'forge-fuse',
    partIds,
    request: parsed,
    output: { partType: 'blade' },
    buildCall: (tx: Transaction, payment) => {
      const [made] = tx.moveCall({
        target: `${PACKAGE_ID}::forge::fuse_blades`,
        arguments: [
          tx.object(partIds[0]),
          tx.object(partIds[1]),
          payment,
          tx.object(SPARK_TREASURY_CAP_ID),
        ],
      });
      tx.transferObjects([made], PLATFORM_CUSTODY);
    },
  });
}
