'use client';

import { useSession } from '@/lib/auth-client';

export interface GameUserClient {
  id: string;
  email: string;
  handle: string;
}

/**
 * Client-side session hook for game pages. Wraps Better Auth's `useSession` and
 * exposes the minimal user shape pages need. `handle` falls back to name/email
 * until the server profile (the canonical handle) is fetched by a route.
 */
export function useGameUser(): { user: GameUserClient | null; isPending: boolean } {
  const { data, isPending } = useSession();
  const sessionUser = data?.user;
  if (!sessionUser) return { user: null, isPending };
  return {
    user: {
      id: sessionUser.id,
      email: sessionUser.email,
      handle: sessionUser.name || sessionUser.email,
    },
    isPending,
  };
}
