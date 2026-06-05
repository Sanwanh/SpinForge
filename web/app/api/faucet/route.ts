// Faucet: a limited off-chain $SPARK top-up. Identity comes only from the Better
// Auth session; the one-claim guard is the `entitlements` unique (user_id, kind)
// index — no wallet, no admin signer, no on-chain mint. SPARK is the authoritative
// DB ledger (economy.grantSpark).

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser } from '@/lib/server-user';
import { grantSpark, getBalance } from '@/lib/economy';
import { safeError } from '@/lib/api-guard';

const FAUCET_KIND = 'faucet';
const FAUCET_SPARK = 500;
const FAUCET_REASON = 'faucet_grant';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireGameUser(request.headers);
    if ('error' in auth) return auth.error;
    const { id } = auth.user;

    // One-time gate: only the INSERT that actually creates the row grants SPARK.
    // A concurrent or repeat claim hits ON CONFLICT and returns no row.
    const claimed = await db.execute<{ user_id: string }>(sql`
      INSERT INTO entitlements (user_id, kind)
      VALUES (${id}, ${FAUCET_KIND})
      ON CONFLICT (user_id, kind) DO NOTHING
      RETURNING user_id
    `);

    if (!claimed[0]) {
      return NextResponse.json(
        { error: 'Already claimed. One faucet grant per account.' },
        { status: 400 },
      );
    }

    await grantSpark(id, FAUCET_SPARK, FAUCET_REASON);
    const balance = await getBalance(id);

    return NextResponse.json({
      success: true,
      spark: FAUCET_SPARK,
      balance,
      message: `Claimed ${FAUCET_SPARK} SPARK! You can now open packs.`,
    });
  } catch (err) {
    return safeError(err, 'Faucet request failed');
  }
}
