// @vitest-environment jsdom
//
// Regression — BUG #2: useSparkBalance fetched the off-chain ledger from the wrong
// path (`/api/economy`, which 404s); it must hit `/api/balance` and read
// `data.balance`. These tests pin the endpoint and the logged-out short-circuit.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
  api: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({ useSession: () => ({ data: h.session }) }));
vi.mock('@/lib/api-fetch', () => ({ api: (...args: unknown[]) => h.api(...args) }));
// useSparkCoins (same module) imports dapp-kit at top-level; stub it so we don't
// need a Sui provider context just to test the balance hook.
vi.mock('@mysten/dapp-kit', () => ({
  useCurrentAccount: () => null,
  useSuiClientQuery: () => ({ data: undefined, isLoading: false, refetch: vi.fn() }),
}));

import { useSparkBalance } from '@/hooks/useSparkBalance';

beforeEach(() => {
  cleanup();
  h.session = null;
  h.api.mockReset();
});

describe('useSparkBalance', () => {
  it('reads the ledger from /api/balance when logged in (regression)', async () => {
    h.session = { user: { id: 'u1' } };
    h.api.mockResolvedValue({ ok: true, json: async () => ({ balance: 42 }) });

    const { result } = renderHook(() => useSparkBalance());

    await waitFor(() => expect(result.current.balance).toBe(42));
    expect(h.api).toHaveBeenCalledWith('/api/balance');
    expect(h.api).not.toHaveBeenCalledWith('/api/economy');
    expect(result.current.formatted).toBe('42');
  });

  it('does not call the API and shows 0 when logged out', async () => {
    h.session = null;
    const { result } = renderHook(() => useSparkBalance());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.balance).toBe(0);
    expect(h.api).not.toHaveBeenCalled();
  });

  it('defaults balance to 0 when the response omits it', async () => {
    h.session = { user: { id: 'u1' } };
    h.api.mockResolvedValue({ ok: true, json: async () => ({}) });
    const { result } = renderHook(() => useSparkBalance());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.balance).toBe(0);
  });
});
