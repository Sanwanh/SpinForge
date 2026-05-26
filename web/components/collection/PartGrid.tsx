'use client';

import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { PartCard, type PartCardData } from './PartCard';
import { ELEMENTS, BEY_TYPES, RARITIES } from '@/lib/constants';

interface PartGridProps {
  parts: PartCardData[];
  onSelect?: (part: PartCardData) => void;
  selectedId?: string;
}

type PartTypeFilter = 'all' | 'blade' | 'ratchet' | 'bit';

export function PartGrid({ parts, onSelect, selectedId }: PartGridProps) {
  const [typeFilter, setTypeFilter] = useState<PartTypeFilter>('all');
  const [elementFilter, setElementFilter] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return parts.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (rarityFilter !== 'all' && String(p.rarity) !== rarityFilter) return false;
      if (elementFilter !== 'all' && p.type === 'blade') {
        const el = Number(p.fields.element ?? -1);
        if (String(el) !== elementFilter) return false;
      }
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [parts, typeFilter, elementFilter, rarityFilter, search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search parts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-700 bg-surface-overlay px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
          aria-label="Search parts"
        />

        {/* Type filter */}
        <div className="flex gap-1">
          {(['all', 'blade', 'ratchet', 'bit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                typeFilter === t ? 'bg-brand-blue text-white' : 'bg-surface-overlay text-gray-400 hover:text-white'
              )}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
            </button>
          ))}
        </div>

        {/* Element filter */}
        <select
          value={elementFilter}
          onChange={(e) => setElementFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-surface-overlay px-2 py-1.5 text-xs text-gray-300"
          aria-label="Filter by element"
        >
          <option value="all">All Elements</option>
          {ELEMENTS.map((el, i) => (
            <option key={el} value={String(i)}>{el}</option>
          ))}
        </select>

        {/* Rarity filter */}
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-surface-overlay px-2 py-1.5 text-xs text-gray-300"
          aria-label="Filter by rarity"
        >
          <option value="all">All Rarities</option>
          {RARITIES.map((r, i) => (
            <option key={r} value={String(i)}>{r}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((part) => (
          <PartCard
            key={part.objectId}
            part={part}
            selected={part.objectId === selectedId}
            onClick={() => onSelect?.(part)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-gray-500">
          {parts.length === 0 ? 'No parts found. Open packs to get started!' : 'No parts match your filters.'}
        </div>
      )}
    </div>
  );
}
