'use client';

import { useMemo } from 'react';
import { useSession } from '@/lib/auth-client';

export interface GameUserClient {
  id: string;
  email: string;
  handle: string;
}

/**
 * Client-side session hook for game pages. Wraps `useSession` and exposes the
 * minimal user shape pages need. The returned `user` object is memoized by its
 * id/email/name so its reference is STABLE across renders — consumers depend on
 * it in useEffect/useCallback, and a fresh object each render caused an infinite
 * fetch loop (e.g. useInventory). `handle` falls back to name/email.
 */
export function useGameUser(): { user: GameUserClient | null; isPending: boolean } {
  const { data, isPending } = useSession();
  const sessionUser = data?.user;
  const user = useMemo<GameUserClient | null>(() => {
    if (!sessionUser) return null;
    return {
      id: sessionUser.id,
      email: sessionUser.email,
      handle: sessionUser.name || sessionUser.email,
    };
  }, [sessionUser?.id, sessionUser?.email, sessionUser?.name]);
  return { user, isPending };
}
