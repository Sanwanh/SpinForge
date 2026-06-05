'use client';

import { create } from 'zustand';
import { useSession, signOut } from '@/lib/auth-client';
import { getStoredSession, clearSession, type ZkLoginSession } from '@/lib/zklogin';

export type AuthMethod = 'session' | null;

/**
 * Legacy zkLogin store — retained so the (still-importable) zkLogin callback
 * page keeps compiling. Session auth is the primary path; this is not consulted
 * by the main `useAuth` hook below.
 */
interface ZkAuthState {
  zkSession: ZkLoginSession | null;
  setZkSession: (session: ZkLoginSession | null) => void;
  logout: () => void;
}

export const useAuthStore = create<ZkAuthState>((set) => ({
  zkSession: typeof window !== 'undefined' ? getStoredSession() : null,
  setZkSession: (session) => set({ zkSession: session }),
  logout: () => {
    clearSession();
    set({ zkSession: null });
  },
}));

interface SessionUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Primary auth hook — bridges the UI to Better Auth's traditional session.
 *
 * The export shape is kept stable so existing importers keep compiling:
 * `address` is now always null (no wallet requirement for auth), and
 * `displayName`/`email` derive from the session user.
 */
export function useAuth() {
  const { data, isPending } = useSession();
  const sessionUser = data?.user as SessionUser | undefined;

  const isAuthenticated = !!sessionUser;
  const displayName: string | null = sessionUser
    ? sessionUser.name || sessionUser.email
    : null;

  return {
    isAuthenticated,
    isPending,
    authMethod: (isAuthenticated ? 'session' : null) as AuthMethod,
    address: null as string | null,
    displayName,
    email: sessionUser?.email ?? null,
    user: sessionUser ?? null,
    logout: () => {
      void signOut();
    },
  };
}
