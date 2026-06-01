// Public rotor (Bey/part) detail by on-chain object id — powers the shareable
// /passport/[id] page. No auth: it's a read of a public on-chain object.

import { NextRequest, NextResponse } from 'next/server';
import { getSuiClient } from '@/lib/relay';
import { safeError } from '@/lib/api-guard';

const ID_RE = /^0x[0-9a-fA-F]{2,64}$/;

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid object id' }, { status: 400 });
    }
    const client = getSuiClient();
    const obj = await client.getObject({ id, options: { showContent: true, showType: true } });
    const content = obj.data?.content as
      | { dataType?: string; type?: string; fields?: Record<string, unknown> }
      | undefined;
    if (!content || content.dataType !== 'moveObject') {
      return NextResponse.json({ error: 'Rotor not found' }, { status: 404 });
    }
    return NextResponse.json({
      objectId: id,
      objectType: content.type ?? '',
      fields: content.fields ?? null,
    });
  } catch (err) {
    return safeError(err, 'Rotor fetch failed');
  }
}
