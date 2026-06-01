// Regression — BUG #4: inventory was always empty because `toPartObject` ran the
// SHORT objectType ('blade'/'ratchet'/'bit'/'bey') through `classifyType`, which
// only recognises fully-qualified Move types, so every item resolved to null.
// These tests lock the invariant: the short kind maps directly, with a
// fully-qualified fallback, and unknown items drop out.

import { describe, it, expect } from 'vitest';
import {
  classifyType,
  toPartObject,
  sortInventory,
  type InventoryItem,
} from '@/lib/inventory-types';

function item(over: Partial<InventoryItem>): InventoryItem {
  return {
    objectId: '0x1',
    objectType: 'blade',
    status: 'owned',
    parentObjectId: null,
    content: null,
    ...over,
  };
}

describe('classifyType (fully-qualified Move type → kind)', () => {
  it('maps each of the four part structs', () => {
    expect(classifyType('0xpkg::blade::Blade')).toBe('blade');
    expect(classifyType('0xpkg::ratchet::Ratchet')).toBe('ratchet');
    expect(classifyType('0xpkg::bit::Bit')).toBe('bit');
    expect(classifyType('0xpkg::bey::Bey')).toBe('bey');
  });

  it('returns null for a short kind or junk (this was the bug)', () => {
    expect(classifyType('blade')).toBeNull();
    expect(classifyType('')).toBeNull();
    expect(classifyType('0xpkg::other::Thing')).toBeNull();
  });
});

describe('toPartObject', () => {
  it.each(['blade', 'ratchet', 'bit', 'bey'] as const)(
    'maps short objectType %s directly (regression)',
    (kind) => {
      const part = toPartObject(item({ objectType: kind }));
      expect(part).not.toBeNull();
      expect(part!.type).toBe(kind);
    },
  );

  it('falls back to the fully-qualified content.type when objectType is not a kind', () => {
    const part = toPartObject(
      item({ objectType: 'rotor', content: { dataType: 'moveObject', type: '0xpkg::ratchet::Ratchet' } }),
    );
    expect(part?.type).toBe('ratchet');
  });

  it('returns null when neither objectType nor content type classify', () => {
    expect(toPartObject(item({ objectType: 'mystery', content: null }))).toBeNull();
    expect(
      toPartObject(item({ objectType: 'mystery', content: { dataType: 'moveObject', type: '0xpkg::x::Y' } })),
    ).toBeNull();
  });

  it('extracts struct fields from a moveObject content envelope', () => {
    const part = toPartObject(
      item({ objectType: 'bey', content: { dataType: 'moveObject', type: 't', fields: { name: 'Dranzer' } } }),
    );
    expect(part?.fields).toEqual({ name: 'Dranzer' });
  });

  it('yields empty fields for array-shaped or missing content', () => {
    expect(toPartObject(item({ objectType: 'bit', content: null }))?.fields).toEqual({});
    expect(
      toPartObject(item({ objectType: 'bit', content: { dataType: 'moveObject', type: 't', fields: [] } }))?.fields,
    ).toEqual({});
  });
});

describe('sortInventory', () => {
  it('buckets a mixed list into the four part arrays and drops unclassifiable items', () => {
    const out = sortInventory([
      item({ objectId: '0xa', objectType: 'blade' }),
      item({ objectId: '0xb', objectType: 'ratchet' }),
      item({ objectId: '0xc', objectType: 'bit' }),
      item({ objectId: '0xd', objectType: 'bey' }),
      item({ objectId: '0xe', objectType: 'junk', content: null }),
    ]);
    expect(out.blades).toHaveLength(1);
    expect(out.ratchets).toHaveLength(1);
    expect(out.bits).toHaveLength(1);
    expect(out.beys).toHaveLength(1);
    expect(out.blades[0].objectId).toBe('0xa');
  });

  it('returns four empty buckets for an empty list', () => {
    expect(sortInventory([])).toEqual({ blades: [], ratchets: [], bits: [], beys: [] });
  });
});
