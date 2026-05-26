'use client';

import clsx from 'clsx';
import { motion } from 'framer-motion';
import {
  RARITY_LABELS,
  RARITY_BORDER_CLASSES,
  BEY_TYPE_LABELS,
  BIT_CATEGORY_LABELS,
  SPIRIT_BEASTS,
  ELEMENT_COLORS,
  type Rarity,
  type Element,
} from '@/lib/constants';
import { SpiritBeastIcon } from '@/components/shared/SpiritBeastIcon';

export interface PartCardData {
  objectId: string;
  type: 'blade' | 'ratchet' | 'bit';
  name: string;
  rarity: number;
  fields: Record<string, unknown>;
}

interface PartCardProps {
  part: PartCardData;
  selected?: boolean;
  onClick?: () => void;
}

function BladeDetails({ fields }: { fields: Record<string, unknown> }) {
  const spiritBeast = Number(fields.spirit_beast ?? 0);
  const beast = SPIRIT_BEASTS[spiritBeast];
  const beyType = BEY_TYPE_LABELS[Number(fields.bey_type ?? 0)] ?? 'Attack';
  const spinDir = Number(fields.spin_direction ?? 0) === 0 ? 'R' : 'L';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <SpiritBeastIcon beastId={spiritBeast} size={28} />
        <span className="text-xs text-gray-400">{beast?.name ?? 'Unknown'}</span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <StatLine label="ATK" value={Number(fields.attack ?? 0)} max={100} color="#EF4444" />
        <StatLine label="RCL" value={Number(fields.recoil_factor ?? 0)} max={80} color="#F97316" />
        <span className="text-gray-400">Type: <span className="text-white">{beyType}</span></span>
        <span className="text-gray-400">Spin: <span className="text-white">{spinDir}</span></span>
      </div>
    </div>
  );
}

function RatchetDetails({ fields }: { fields: Record<string, unknown> }) {
  const prongs = Number(fields.prongs ?? 0);
  const height = Number(fields.height ?? 60);

  return (
    <div className="space-y-2">
      <div className="text-sm font-mono text-brand-blue">{prongs}-{height}</div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <StatLine label="WGT" value={Number(fields.weight ?? 0)} max={100} color="#94A3B8" />
        <StatLine label="BST" value={Number(fields.burst_resistance ?? 0)} max={100} color="#A855F7" />
        <span className="text-gray-400">Prongs: <span className="text-white">{prongs}</span></span>
        <span className="text-gray-400">Height: <span className="text-white">{height}mm</span></span>
      </div>
    </div>
  );
}

function BitDetails({ fields }: { fields: Record<string, unknown> }) {
  const category = BIT_CATEGORY_LABELS[Number(fields.category ?? 0)] ?? 'Attack';
  const gear = Number(fields.gear_diameter ?? 0);

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400">Category: <span className="text-white">{category}</span></div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <StatLine label="FRC" value={Number(fields.friction ?? 0)} max={80} color="#F59E0B" />
        <StatLine label="MOB" value={Number(fields.mobility ?? 1)} max={5} color="#10B981" />
        {gear > 0 && (
          <span className="col-span-2 text-gray-400">Gear: <span className="text-brand-orange">{gear}mm</span></span>
        )}
      </div>
    </div>
  );
}

function StatLine({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-1">
      <span className="w-7 text-gray-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-6 text-right text-gray-300">{value}</span>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = { blade: 'Blade', ratchet: 'Ratchet', bit: 'Bit' };

export function PartCard({ part, selected = false, onClick }: PartCardProps) {
  const rarity = RARITY_LABELS[part.rarity] ?? ('Common' as Rarity);
  const borderClass = RARITY_BORDER_CLASSES[rarity];

  const element = part.type === 'blade'
    ? SPIRIT_BEASTS[Number(part.fields.spirit_beast ?? 0)]?.element as Element | undefined
    : undefined;
  const elementColor = element ? ELEMENT_COLORS[element] : undefined;

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={clsx(
        'card-hover relative w-full border-2 text-left transition-all',
        borderClass,
        selected && 'ring-2 ring-brand-blue ring-offset-2 ring-offset-surface'
      )}
      aria-label={`${part.name} ${part.type} - ${rarity}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">{part.name || `${TYPE_LABELS[part.type]} #${part.objectId.slice(-4)}`}</h3>
          <span className="text-xs uppercase tracking-wider text-gray-500">{TYPE_LABELS[part.type]}</span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{
            color: elementColor ?? '#9CA3AF',
            backgroundColor: `${elementColor ?? '#9CA3AF'}20`,
          }}
        >
          {rarity}
        </span>
      </div>

      {/* Details */}
      {part.type === 'blade' && <BladeDetails fields={part.fields} />}
      {part.type === 'ratchet' && <RatchetDetails fields={part.fields} />}
      {part.type === 'bit' && <BitDetails fields={part.fields} />}
    </motion.button>
  );
}
