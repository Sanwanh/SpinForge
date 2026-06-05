// Regression — BUG #5 (part b): the public GET /api/passport/[id] route didn't
// exist. It must validate the object-id format (400), 404 a non-moveObject, and
// return the on-chain type + fields for a real rotor.

import { describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => ({ getObject: vi.fn() }));

vi.mock('@/lib/relay', () => ({ getSuiClient: () => ({ getObject: (...a: unknown[]) => h.getObject(...a) }) }));

import { GET } from '@/app/api/passport/[id]/route';

const VALID_ID = '0x' + 'a'.repeat(64);
const call = (id: string) => GET({} as never, { params: { id } });

describe('GET /api/passport/[id]', () => {
  it.each(['abc', '0x', '0xZZ', '0x' + 'a'.repeat(65)])('rejects malformed id %s with 400', async (id) => {
    const res = await call(id);
    expect(res.status).toBe(400);
  });

  it('404s when the object is not a moveObject', async () => {
    h.getObject.mockResolvedValue({ data: { content: null } });
    const res = await call(VALID_ID);
    expect(res.status).toBe(404);
  });

  it('returns objectId, type and fields for a real rotor', async () => {
    h.getObject.mockResolvedValue({
      data: { content: { dataType: 'moveObject', type: '0xpkg::bey::Bey', fields: { name: 'Dranzer' } } },
    });
    const res = await call(VALID_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ objectId: VALID_ID, objectType: '0xpkg::bey::Bey', fields: { name: 'Dranzer' } });
  });
});
