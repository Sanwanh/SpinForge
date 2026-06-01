// Starter grant: a one-time off-chain $SPARK bonus for a new account, gated by the
// `entitlements` unique (user_id, kind) index. Identity is the Better Auth session
// only. Per the web2-hybrid design this does NOT mint anything on-chain — starter
// inventory (if any) is provisioned elsewhere; here we only credit the DB ledger.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser } from '@/lib/server-user';
import { grantSpark, getBalance } from '@/lib/economy';
import { safeError } from '@/lib/api-guard';

const STARTER_KIND = 'starter';
const STARTER_SPARK = 500;
const STARTER_REASON = 'starter_claim';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { id } = auth.user;

    // Entitlement is the authoritative one-time gate; only the winning INSERT grants.
    const claimed = await db.execute<{ user_id: string }>(sql`
      INSERT INTO entitlements (user_id, kind)
      VALUES (${id}, ${STARTER_KIND})
      ON CONFLICT (user_id, kind) DO NOTHING
      RETURNING user_id
    `);

    if (!claimed[0]) {
      return NextResponse.json(
        { error: 'Already claimed starter pack.' },
        { status: 400 },
      );
    }

    await grantSpark(id, STARTER_SPARK, STARTER_REASON);
    const balance = await getBalance(id);

    return NextResponse.json({
      success: true,
      spark: STARTER_SPARK,
      balance,
      message: `Starter pack claimed! ${STARTER_SPARK} SPARK added.`,
    });
  } catch (err) {
    return safeError(err, 'Starter claim failed');
  }
}
