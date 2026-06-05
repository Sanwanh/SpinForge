// @vitest-environment jsdom
//
// Regression — wallet-era leftover: GuestBanner keyed its auto-dismiss on
// useCurrentAccount() (a Sui wallet) and told visitors to "connect a wallet to
// play and save progress". After the web2-hybrid migration no wallet ever
// connects, so the banner was permanently stuck and pointed users at a
// wallet-connect flow that does not exist. It must:
//   1. never instruct users to connect a wallet, and
//   2. disappear once the Better Auth session is authenticated.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({
  isAuthenticated: false,
  isGuest: true,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: h.isAuthenticated }),
}));
vi.mock('@/lib/guest', () => ({
  useGuest: () => ({
    isGuest: h.isGuest,
    enter: vi.fn(),
    exit: vi.fn(),
    hydrate: vi.fn(),
  }),
}));
// English locale so we assert on stable copy.
vi.mock('@/lib/i18n', () => ({ useT: () => ({ nav: { home: 'Home' } }) }));

import { GuestBanner } from '@/components/shared/Guest';

beforeEach(() => {
  cleanup();
  h.isAuthenticated = false;
  h.isGuest = true;
});

describe('GuestBanner', () => {
  it('does not tell the user to connect a wallet', () => {
    render(<GuestBanner />);
    const text = document.body.textContent ?? '';
    expect(text.toLowerCase()).not.toContain('connect a wallet');
    expect(text).not.toContain('連接錢包');
  });

  it('offers a way to sign in', () => {
    render(<GuestBanner />);
    const signIn = screen.queryByRole('link', { name: /sign in/i });
    expect(signIn).not.toBeNull();
    expect(signIn?.getAttribute('href')).toBe('/login');
  });

  it('hides itself once the session is authenticated', () => {
    h.isAuthenticated = true;
    const { container } = render(<GuestBanner />);
    expect(container.firstChild).toBeNull();
  });
});
