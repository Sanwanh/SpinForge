// @vitest-environment jsdom
//
// Regression — BUG #3: useInventory span an infinite fetch loop because
// useGameUser returned a FRESH user object every render, so effects depending on
// `user` re-ran forever. The fix memoizes on id/email/name. This locks the
// invariant: a stable session yields a referentially stable user object, and the
// reference only changes when the underlying identity changes.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';

// vi.hoisted lets the (hoisted) vi.mock factory read a mutable holder we set per test.
const h = vi.hoisted(() => ({ data: null as { user: { id: string; email: string; name: string } } | null, isPending: false }));

vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: h.data, isPending: h.isPending, refetch: async () => {} }),
}));

import { useGameUser } from '@/hooks/useGameUser';

beforeEach(() => {
  cleanup();
  h.data = null;
  h.isPending = false;
});

describe('useGameUser', () => {
  it('returns null user when there is no session', () => {
    const { result } = renderHook(() => useGameUser());
    expect(result.current.user).toBeNull();
  });

  it('exposes the session user with handle falling back to name', () => {
    h.data = { user: { id: 'u1', email: 'a@b.co', name: 'Alice' } };
    const { result } = renderHook(() => useGameUser());
    expect(result.current.user).toEqual({ id: 'u1', email: 'a@b.co', handle: 'Alice' });
  });

  it('falls back to email when name is empty', () => {
    h.data = { user: { id: 'u1', email: 'a@b.co', name: '' } };
    const { result } = renderHook(() => useGameUser());
    expect(result.current.user?.handle).toBe('a@b.co');
  });

  it('keeps a STABLE reference across re-renders for the same identity (the fix)', () => {
    h.data = { user: { id: 'u1', email: 'a@b.co', name: 'Alice' } };
    const { result, rerender } = renderHook(() => useGameUser());
    const first = result.current.user;
    rerender();
    rerender();
    expect(result.current.user).toBe(first); // same object reference — no loop
  });

  it('produces a NEW reference when the identity changes', () => {
    h.data = { user: { id: 'u1', email: 'a@b.co', name: 'Alice' } };
    const { result, rerender } = renderHook(() => useGameUser());
    const first = result.current.user;
    h.data = { user: { id: 'u2', email: 'c@d.co', name: 'Bob' } };
    rerender();
    expect(result.current.user).not.toBe(first);
    expect(result.current.user?.id).toBe('u2');
  });
});
