// Regression — wallet-era leftover: the starter-pack / faucet claim used to call
// useAuthSig() (a Sui wallet personal-message signature). After the web2-hybrid
// migration the faucet authenticates by Better Auth session cookie only
// (requireGameUser), so the claim must POST to /api/faucet via the session-aware
// `api()` wrapper with NO wallet signature. Calling a wallet here threw
// "Connect a wallet first." on every click — the reported bug.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock('@/lib/api-fetch', () => ({ api: (...args: unknown[]) => h.api(...args) }));

import { claimFaucet } from '@/lib/faucet';

beforeEach(() => {
  h.api.mockReset();
});

describe('claimFaucet', () => {
  it('claims via the session cookie endpoint with no wallet signature', async () => {
    h.api.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, spark: 500, balance: 500, message: 'Claimed 500 SPARK!' }),
    });

    const res = await claimFaucet();

    // Session-cookie POST to /api/faucet; body (if any) carries NO wallet fields.
    expect(h.api).toHaveBeenCalledTimes(1);
    const [path, body] = h.api.mock.calls[0];
    expect(path).toBe('/api/faucet');
    if (body !== undefined) {
      expect(body).not.toHaveProperty('address');
      expect(body).not.toHaveProperty('authSignature');
      expect(body).not.toHaveProperty('authMessage');
    }
    expect(res.ok).toBe(true);
    expect(res.message).toBe('Claimed 500 SPARK!');
    expect(res.balance).toBe(500);
  });

  it('surfaces the server error message on a non-ok response', async () => {
    h.api.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Already claimed. One faucet grant per account.' }),
    });

    const res = await claimFaucet();

    expect(res.ok).toBe(false);
    expect(res.error).toBe('Already claimed. One faucet grant per account.');
  });

  it('returns a generic error when the response body is not JSON', async () => {
    h.api.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('not json');
      },
    });

    const res = await claimFaucet();

    expect(res.ok).toBe(false);
    expect(typeof res.error).toBe('string');
  });
});
