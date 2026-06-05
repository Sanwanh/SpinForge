'use client';

import { api } from '@/lib/api-fetch';

export interface FaucetResult {
  ok: boolean;
  message?: string;
  balance?: number;
  error?: string;
}

/**
 * Claim the one-time starter $SPARK grant.
 *
 * Identity comes from the Better Auth session cookie (the faucet route uses
 * `requireGameUser`), so this is a plain session-authenticated POST — there is
 * no wallet and no signature. The previous implementation prompted a Sui wallet
 * for a personal-message signature and threw "Connect a wallet first." on every
 * click in the web2 build, which is the bug this replaces.
 */
export async function claimFaucet(): Promise<FaucetResult> {
  const res = await api('/api/faucet', {});
  let data: { message?: string; balance?: number; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON body — fall through to the generic error below */
  }
  if (!res.ok) {
    return { ok: false, error: data.error ?? 'Faucet request failed.' };
  }
  return { ok: true, message: data.message, balance: data.balance };
}
