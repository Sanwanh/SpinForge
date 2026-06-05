// SPARK balance — session read of the authoritative off-chain economy ledger.
// Identity = Better Auth session (never request body). Pure read; no mutation.

import { NextRequest, NextResponse } from 'next/server';
import { requireGameUser } from '@/lib/server-user';
import { getBalance } from '@/lib/economy';
import { isSameOrigin, safeError } from '@/lib/api-guard';

export async function GET(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const balance = await getBalance(user.id);
    return NextResponse.json({ success: true, balance, currency: 'SPARK' });
  } catch (err) {
    return safeError(err, 'Balance load failed');
  }
}
