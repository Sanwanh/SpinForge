'use client';

import clsx from 'clsx';
import { ZONES, type Zone } from '@/lib/constants';

interface ZoneSelectorProps {
  selectedZone: Zone | null;
  onSelect: (zone: Zone) => void;
  availableZones?: Zone[];
  disabled?: boolean;
}

const ZONE_COLORS: Record<Zone, string> = {
  Center: 'border-green-500 text-green-400 hover:bg-green-500/10',
  Mid: 'border-yellow-500 text-yellow-400 hover:bg-yellow-500/10',
  Wall: 'border-orange-500 text-orange-400 hover:bg-orange-500/10',
  Rail: 'border-blue-500 text-blue-400 hover:bg-blue-500/10',
};

const ZONE_SELECTED: Record<Zone, string> = {
  Center: 'bg-green-500/20 border-green-400 text-green-300',
  Mid: 'bg-yellow-500/20 border-yellow-400 text-yellow-300',
  Wall: 'bg-orange-500/20 border-orange-400 text-orange-300',
  Rail: 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-lg shadow-blue-500/20',
};

export function ZoneSelector({
  selectedZone,
  onSelect,
  availableZones = [...ZONES],
  disabled = false,
}: ZoneSelectorProps) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Zone selection">
      {ZONES.map((zone) => {
        const available = availableZones.includes(zone);
        const selected = selectedZone === zone;

        return (
          <button
            key={zone}
            role="radio"
            aria-checked={selected}
            disabled={disabled || !available}
            onClick={() => onSelect(zone)}
            className={clsx(
              'rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all',
              selected
                ? ZONE_SELECTED[zone]
                : available
                  ? ZONE_COLORS[zone]
                  : 'border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
            )}
          >
            {zone}
            {zone === 'Rail' && <span className="ml-1 text-[10px]">X</span>}
          </button>
        );
      })}
    </div>
  );
}
