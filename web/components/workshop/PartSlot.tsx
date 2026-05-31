'use client';

import { motion } from 'framer-motion';
import type { PartCardData } from '@/components/collection/PartCard';
import { Corners } from '@/components/design/atoms';
import { RARITY_MAP, type RarityId } from '@/components/design/tokens';

interface PartSlotProps {
  label: string;
  partType: 'blade' | 'ratchet' | 'bit';
  part: PartCardData | null;
  onSelect: () => void;
  onRemove: () => void;
}

const SLOT_ICONS: Record<string, string> = { blade: '⬡', ratchet: '⊙', bit: '▽' };
const RARITY_IDS: RarityId[] = ['common', 'rare', 'epic', 'legendary'];

const BOX = 104;

export function PartSlot({ label, partType, part, onSelect, onRemove }: PartSlotProps) {
  const rarity = part ? RARITY_MAP[RARITY_IDS[Math.min(Number(part.rarity ?? 0), 3)]] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <span className="t-eyebrow" style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.14em' }}>{label}</span>

      {part && rarity ? (
        <motion.button
          type="button"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={onSelect}
          aria-label={`Change ${label}`}
          style={{
            position: 'relative',
            width: BOX,
            height: BOX,
            borderRadius: 14,
            border: `1.5px solid ${rarity.color}`,
            background: rarity.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            cursor: 'pointer',
            padding: 8,
            boxShadow: `0 0 22px ${rarity.color}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          <Corners color={rarity.color} />
          <span style={{ fontSize: 20, opacity: 0.9 }}>{SLOT_ICONS[partType]}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text)',
              textAlign: 'center',
              lineHeight: 1.15,
              maxWidth: 86,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {part.name || partType}
          </span>
          <span className="t-mono" style={{ fontSize: 9, color: rarity.color, letterSpacing: '0.1em' }}>{rarity.label}</span>
          <span
            role="button"
            tabIndex={0}
            aria-label={`Remove ${label}`}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'var(--blood)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 10,
              cursor: 'pointer',
              border: '1px solid rgba(0,0,0,0.45)',
            }}
          >
            ✕
          </span>
        </motion.button>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className="part-slot-empty"
          aria-label={`Select ${label}`}
          style={{
            width: BOX,
            height: BOX,
            borderRadius: 14,
            border: '1.5px dashed var(--border)',
            background: 'var(--void)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: 'var(--text-dim)',
            cursor: 'pointer',
            transition: 'border-color .2s, color .2s, box-shadow .2s',
          }}
        >
          <span style={{ fontSize: 26 }}>{SLOT_ICONS[partType]}</span>
          <span className="t-mono" style={{ fontSize: 10, letterSpacing: '0.12em' }}>SELECT</span>
        </button>
      )}
    </div>
  );
}
