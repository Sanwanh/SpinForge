'use client';

import clsx from 'clsx';
import { motion } from 'framer-motion';
import type { PartCardData } from '@/components/collection/PartCard';

interface PartSlotProps {
  label: string;
  partType: 'blade' | 'ratchet' | 'bit';
  part: PartCardData | null;
  onSelect: () => void;
  onRemove: () => void;
}

const SLOT_ICONS: Record<string, string> = {
  blade: '⬡',
  ratchet: '⊙',
  bit: '▽',
};

export function PartSlot({ label, partType, part, onSelect, onRemove }: PartSlotProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
      {part ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card relative flex h-24 w-24 flex-col items-center justify-center gap-1 border-brand-blue/50"
        >
          <span className="text-xs font-bold text-white truncate max-w-[80px]">
            {part.name || partType}
          </span>
          <span className="text-[10px] text-gray-400">
            {part.objectId.slice(0, 6)}...
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80 text-[10px] text-white hover:bg-red-500"
            aria-label={`Remove ${label}`}
          >
            x
          </button>
        </motion.div>
      ) : (
        <button
          onClick={onSelect}
          className={clsx(
            'flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-700',
            'text-gray-600 transition-colors hover:border-brand-blue/50 hover:text-brand-blue'
          )}
          aria-label={`Select ${label}`}
        >
          <span className="text-2xl">{SLOT_ICONS[partType]}</span>
          <span className="text-[10px]">Select</span>
        </button>
      )}
    </div>
  );
}
