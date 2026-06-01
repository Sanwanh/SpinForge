// Regression — BUG #5 (part a): GET /api/profile didn't exist, so /passport 404'd.
// The route must be session-gated (returns the auth 401 when unauthenticated) and
// project the profile + leaderboard aggregate into the documented shape.

import { describe, it, expect, vi } from 'vitest';
import { NextResponse } from 'next/server';

const h = vi.hoisted(() => ({ require: vi.fn(), execute: vi.fn() }));

vi.mock('@/lib/server-user', () => ({ requireGameUser: (...a: unknown[]) => h.require(...a) }));
vi.mock('@/lib/db', () => ({ db: { execute: (...a: unknown[]) => h.execute(...a) } }));

import { GET } from '@/app/api/profile/route';

const req = () => ({ headers: new Headers() }) as never;

describe('GET /api/profile', () => {
  it('propagates the 401 from requireGameUser when unauthenticated', async () => {
    h.require.mockResolvedValue({ error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns the projected profile + stats for an authenticated user', async () => {
    h.require.mockResolvedValue({ user: { id: 'u1', email: 'a@b.co', name: 'Alice', handle: 'alice', chainSubject: '0xabc' } });
    h.execute.mockResolvedValue([
      { handle: 'alice', display_name: 'Alice', chain_subject: '0xabc', wins: '3', losses: 1, elo: 1100, xtreme_finishes: 2 },
    ]);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profileId).toBe('0xabc');
    expect(body.fields).toEqual({
      handle: 'alice',
      display_name: 'Alice',
      wins: 3, // coerced from the string the DB driver returns for SUM()
      losses: 1,
      elo: 1100,
      xtreme_finishes: 2,
    });
  });

  it('returns an empty profile (not 500) when the user has no profiles row yet', async () => {
    h.require.mockResolvedValue({ user: { id: 'u1', email: 'a@b.co', name: 'Alice', handle: 'alice', chainSubject: '0xabc' } });
    h.execute.mockResolvedValue([]);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ fields: null, profileId: '' });
  });
});
