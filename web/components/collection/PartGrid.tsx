'use client';

import { useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';
import { PartCard, type PartCardData } from './PartCard';
import { ELEMENTS, BEY_TYPES, RARITIES } from '@/lib/constants';
import { useT } from '@/lib/i18n';

interface PartGridProps {
  parts: PartCardData[];
  onSelect?: (part: PartCardData) => void;
  selectedId?: string;
}

type PartTypeFilter = 'all' | 'blade' | 'ratchet' | 'bit';

const PAGE_SIZE = 12;

export function PartGrid({ parts, onSelect, selectedId }: PartGridProps) {
  const t = useT();
  const isZh = t.nav.home === '首頁';
  const [typeFilter, setTypeFilter] = useState<PartTypeFilter>('all');
  const [elementFilter, setElementFilter] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const typeLabels: Record<PartTypeFilter, string> = {
    all: isZh ? '全部' : 'All',
    blade: isZh ? '刀刃' : 'Blades',
    ratchet: isZh ? '棘輪' : 'Ratchets',
    bit: isZh ? '軸尖' : 'Bits',
  };

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

  // Collapse the wall: only render a page at a time. Reset when filters change.
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [typeFilter, elementFilter, rarityFilter, search]);
  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder={isZh ? '搜尋零件…' : 'Search parts...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-700 bg-surface-overlay px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
          aria-label={isZh ? '搜尋零件' : 'Search parts'}
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
              {typeLabels[t]}
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
          <option value="all">{t.collection.filterByElement}</option>
          {ELEMENTS.map((el, i) => (
            <option key={el} value={String(i)}>{t.elements[el.toLowerCase() as keyof typeof t.elements]}</option>
          ))}
        </select>

        {/* Rarity filter */}
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-surface-overlay px-2 py-1.5 text-xs text-gray-300"
          aria-label="Filter by rarity"
        >
          <option value="all">{t.collection.filterByRarity}</option>
          {RARITIES.map((r, i) => (
            <option key={r} value={String(i)}>{t.rarities[r.toLowerCase() as keyof typeof t.rarities]}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((part) => (
          <PartCard
            key={part.objectId}
            part={part}
            selected={part.objectId === selectedId}
            onClick={() => onSelect?.(part)}
          />
        ))}
      </div>

      {remaining > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
          >
            {isZh ? `載入更多 · 還有 ${remaining} 個` : `Show more · ${remaining} left`}
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-16 text-center text-gray-500">
          {parts.length === 0 ? t.collection.noItems : (isZh ? '沒有符合篩選的零件。' : 'No parts match your filters.')}
        </div>
      )}
    </div>
  );
}
