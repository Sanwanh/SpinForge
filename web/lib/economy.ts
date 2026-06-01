// Off-chain $SPARK / $FORGE ledger — authoritative (tokens are NOT minted
// on-chain per action; see plan section C/token note). `currency_accounts.balance`
// is the spendable balance; `currency_ledger` is the append-only audit trail.
//
// Invariant: balance == sum(grants) - sum(outstanding reserved) - sum(settled spends)
//   - grantSpark:          balance += amount,  ledger(+amount, settled)
//   - reserveSpark:        balance -= amount,  ledger(-amount, reserved)   [FOR UPDATE]
//   - settleReservation:   ledger reserved -> settled                       (balance unchanged)
//   - releaseReservation:  balance += amount,  ledger reserved -> released
//
// Balance is debited at reserve time so concurrent reservations cannot
// double-spend; the DB CHECK (balance >= 0) is the final guard.

import { sql } from 'drizzle-orm';
import { db } from './db';

const DEFAULT_CURRENCY = 'SPARK';

function assertPositive(amount: number): void {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error('INVALID_AMOUNT');
  }
}

/** Current spendable balance for a user/currency (0 if no account row). */
export async function getBalance(userId: string, currency: string = DEFAULT_CURRENCY): Promise<number> {
  const rows = await db.execute<{ balance: string | number }>(sql`
    SELECT balance FROM currency_accounts
    WHERE user_id = ${userId} AND currency = ${currency}
    LIMIT 1
  `);
  const row = rows[0];
  return row ? Number(row.balance) : 0;
}

/** Credit a user's balance and record a settled ledger entry. */
export async function grantSpark(
  userId: string,
  amount: number,
  reason: string,
  currency: string = DEFAULT_CURRENCY,
): Promise<void> {
  assertPositive(amount);
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO currency_accounts (user_id, currency, balance, updated_at)
      VALUES (${userId}, ${currency}, ${amount}, now())
      ON CONFLICT (user_id, currency)
      DO UPDATE SET balance = currency_accounts.balance + ${amount}, updated_at = now()
    `);
    await tx.execute(sql`
      INSERT INTO currency_ledger (user_id, currency, amount, state, reason)
      VALUES (${userId}, ${currency}, ${amount}, 'settled', ${reason})
    `);
  });
}

/**
 * Reserve `amount` against a user's balance for a pending operation.
 * Throws Error('INSUFFICIENT_FUNDS') if the balance is too low. The row is
 * locked FOR UPDATE so concurrent reservations serialize. Idempotent on
 * operationId (a duplicate reserve for the same op is a no-op).
 */
export async function reserveSpark(
  userId: string,
  amount: number,
  reason: string,
  operationId: string,
  currency: string = DEFAULT_CURRENCY,
): Promise<void> {
  assertPositive(amount);
  await db.transaction(async (tx) => {
    const existing = await tx.execute<{ id: string }>(sql`
      SELECT id FROM currency_ledger
      WHERE operation_id = ${operationId} AND state = 'reserved'
      LIMIT 1
    `);
    if (existing[0]) return; // already reserved for this op

    const locked = await tx.execute<{ balance: string | number }>(sql`
      SELECT balance FROM currency_accounts
      WHERE user_id = ${userId} AND currency = ${currency}
      FOR UPDATE
    `);
    const balance = locked[0] ? Number(locked[0].balance) : 0;
    if (balance < amount) throw new Error('INSUFFICIENT_FUNDS');

    await tx.execute(sql`
      UPDATE currency_accounts
      SET balance = balance - ${amount}, updated_at = now()
      WHERE user_id = ${userId} AND currency = ${currency}
    `);
    await tx.execute(sql`
      INSERT INTO currency_ledger (user_id, currency, amount, state, reason, operation_id)
      VALUES (${userId}, ${currency}, ${-amount}, 'reserved', ${reason}, ${operationId})
    `);
  });
}

/** Finalize a reservation: the debited balance is now permanent. */
export async function settleReservation(operationId: string): Promise<void> {
  await db.execute(sql`
    UPDATE currency_ledger
    SET state = 'settled'
    WHERE operation_id = ${operationId} AND state = 'reserved'
  `);
}

/** Cancel a reservation: credit the held amount back to the user's balance. */
export async function releaseReservation(operationId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const reserved = await tx.execute<{ user_id: string; currency: string; amount: string | number }>(sql`
      SELECT user_id, currency, amount FROM currency_ledger
      WHERE operation_id = ${operationId} AND state = 'reserved'
      FOR UPDATE
    `);
    for (const row of reserved) {
      const refund = Math.abs(Number(row.amount));
      await tx.execute(sql`
        UPDATE currency_accounts
        SET balance = balance + ${refund}, updated_at = now()
        WHERE user_id = ${row.user_id} AND currency = ${row.currency}
      `);
    }
    await tx.execute(sql`
      UPDATE currency_ledger
      SET state = 'released'
      WHERE operation_id = ${operationId} AND state = 'reserved'
    `);
  });
}
