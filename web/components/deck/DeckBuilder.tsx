'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { DeckBey } from '@/hooks/useDeck';

interface DeckBuilderProps {
  beys: (DeckBey | null)[];
  onSelectSlot: (slot: number) => void;
  onRemoveSlot: (slot: number) => void;
  techniques: string[];
}

export function DeckBuilder({ beys, onSelectSlot, onRemoveSlot, techniques }: DeckBuilderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
          Beyblades (3 required)
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {beys.map((bey, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02 }}
              className={clsx(
                'card-hover flex min-h-[120px] flex-col items-center justify-center gap-2',
                bey ? 'border-brand-blue/30' : 'border-dashed border-gray-700'
              )}
            >
              {bey ? (
                <>
                  <span className="text-sm font-bold text-white">{bey.name}</span>
                  <span className="text-[10px] text-gray-500">{bey.beyId.slice(0, 8)}...</span>
                  <button
                    onClick={() => onRemoveSlot(i)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onSelectSlot(i)}
                  className="text-sm text-gray-500 hover:text-brand-blue"
                >
                  + Add Bey #{i + 1}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
          Techniques ({techniques.length}/12)
        </h3>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className={clsx(
                'flex h-16 items-center justify-center rounded-lg border text-xs',
                techniques[i]
                  ? 'border-brand-blue/30 bg-surface-overlay text-white'
                  : 'border-dashed border-gray-700 text-gray-600'
              )}
            >
              {techniques[i] ?? `Slot ${i + 1}`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
