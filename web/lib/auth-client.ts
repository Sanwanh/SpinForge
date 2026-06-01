'use client';

// SSR-safe auth client. Deliberately does NOT import `better-auth/react`:
// better-auth (server) is externalized for webpack (its kysely adapter can't be
// bundled), and an externalized ESM resolves to `undefined` during SSR — which
// made every client component that imported it an invalid element (layout-wide
// 500). Instead this is a thin fetch wrapper over Better Auth's /api/auth/* REST
// endpoints (the same routes the server handler exposes), so nothing externalized
// is evaluated while rendering.

import { useState, useEffect, useCallback } from 'react';

const BASE = '/api/auth';

export interface AuthResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

async function post<T = unknown>(path: string, body?: unknown): Promise<AuthResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { data: null, error: { message: data?.message || data?.error || `HTTP ${res.status}` } };
    }
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : 'Network error' } };
  }
}

export interface SessionData {
  user: { id: string; email: string; name: string; image?: string | null };
  session: { id: string; expiresAt: string };
}

export const authClient = {
  signIn: {
    email: (b: { email: string; password: string; callbackURL?: string }) =>
      post<SessionData>('/sign-in/email', b),
    // OAuth: the server returns a { url } to redirect to (or an error when the
    // provider isn't configured). Auto-redirect on success.
    social: async (b: { provider: string; callbackURL?: string }) => {
      const r = await post<{ url?: string; redirect?: boolean }>('/sign-in/social', b);
      if (r.data?.url && typeof window !== 'undefined') window.location.href = r.data.url;
      return r;
    },
    magicLink: (b: { email: string; callbackURL?: string }) =>
      post('/sign-in/magic-link', b),
  },
  signUp: {
    email: (b: { email: string; password: string; name?: string; callbackURL?: string }) =>
      post<SessionData>('/sign-up/email', b),
  },
  signOut: () => post('/sign-out', {}),
};

export const { signIn, signUp, signOut } = authClient;

/**
 * SSR-safe session hook. Returns `isPending: true` with no data during SSR and
 * the first client paint, then fetches `/api/auth/get-session` on mount.
 */
export function useSession(): {
  data: SessionData | null;
  isPending: boolean;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<SessionData | null>(null);
  const [isPending, setIsPending] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/get-session`, { credentials: 'include' });
      const json = await res.json().catch(() => null);
      setData(json && json.user ? (json as SessionData) : null);
    } catch {
      setData(null);
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  return { data, isPending, refetch };
}
