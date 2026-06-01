// Regression — BUG #1 (part b): the SSR-safe auth client must load and expose the
// exact surface pages consume, WITHOUT pulling in `better-auth/react` (which,
// being externalized, resolved to `undefined` during SSR and 500'd every page).
// If someone reintroduces a `better-auth` import here this module would fail to
// evaluate or change shape — these assertions catch that.

import { describe, it, expect } from 'vitest';
import { authClient, useSession, signIn, signUp, signOut } from '@/lib/auth-client';

describe('auth-client public surface', () => {
  it('exposes the sign-in methods pages depend on', () => {
    expect(typeof authClient.signIn.email).toBe('function');
    expect(typeof authClient.signIn.social).toBe('function');
    expect(typeof authClient.signIn.magicLink).toBe('function');
  });

  it('exposes sign-up and sign-out', () => {
    expect(typeof authClient.signUp.email).toBe('function');
    expect(typeof authClient.signOut).toBe('function');
  });

  it('re-exports the same callables as named bindings', () => {
    expect(signIn).toBe(authClient.signIn);
    expect(signUp).toBe(authClient.signUp);
    expect(signOut).toBe(authClient.signOut);
  });

  it('exports an SSR-safe useSession hook', () => {
    expect(typeof useSession).toBe('function');
  });
});
