'use client';

import { motion } from 'framer-motion';
import type { PartCardData } from '@/components/collection/PartCard';
import { SPIRIT_BEASTS, ELEMENT_COLORS, type Element } from '@/lib/constants';

interface AssemblyPreviewProps {
  blade: PartCardData | null;
  ratchet: PartCardData | null;
  bit: PartCardData | null;
}

export function AssemblyPreview({ blade, ratchet, bit }: AssemblyPreviewProps) {
  const allSelected = blade && ratchet && bit;
  const spiritBeast = blade ? Number(blade.fields.spirit_beast ?? 0) : 0;
  const beast = SPIRIT_BEASTS[spiritBeast];
  const element = beast?.element as Element | undefined;
  const color = element ? ELEMENT_COLORS[element] : '#6B7280';

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        animate={allSelected ? { rotate: [0, 360], scale: [1, 1.05, 1] } : {}}
        transition={{
          rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
          scale: { duration: 2, repeat: Infinity },
        }}
        className="relative flex h-32 w-32 items-center justify-center"
      >
        <div
          className="absolute inset-0 rounded-full border-4 transition-colors duration-300"
          style={{ borderColor: blade ? color : '#374151', boxShadow: blade ? `0 0 20px ${color}40` : 'none' }}
        />
        <div
          className="absolute inset-4 rounded-full border-2 transition-colors duration-300"
          style={{ borderColor: ratchet ? '#94A3B8' : '#1F2937' }}
        />
        <div
          className="h-8 w-8 rounded-full transition-colors duration-300"
          style={{
            backgroundColor: bit ? `${color}60` : '#111827',
            border: bit ? `2px solid ${color}` : '2px solid #1F2937',
          }}
        />
      </motion.div>
      {allSelected ? (
        <div className="text-center">
          <p className="text-sm font-bold text-white">{beast?.name ?? 'Unknown'} Beast</p>
          <p className="text-xs text-gray-400">Assembly Ready</p>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          {[!blade && 'Blade', !ratchet && 'Ratchet', !bit && 'Bit'].filter(Boolean).join(' + ')} needed
        </p>
      )}
    </div>
  );
}
