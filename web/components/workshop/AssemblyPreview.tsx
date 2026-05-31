'use client';

import { motion } from 'framer-motion';
import type { PartCardData } from '@/components/collection/PartCard';
import { Beyblade } from '@/components/design/Beyblade';
import { ELEMENT_MAP, type ElementId, type BeyPaletteId } from '@/components/design/tokens';
import { SPIRIT_BEASTS } from '@/lib/constants';

interface AssemblyPreviewProps {
  blade: PartCardData | null;
  ratchet: PartCardData | null;
  bit: PartCardData | null;
}

const ELEMENT_TO_ID: Record<string, ElementId> = {
  Wood: 'wood',
  Fire: 'fire',
  Metal: 'metal',
  Water: 'water',
  Earth: 'earth',
};

export function AssemblyPreview({ blade, ratchet, bit }: AssemblyPreviewProps) {
  const allSelected = !!(blade && ratchet && bit);
  const spiritBeast = blade ? Number(blade.fields.spirit_beast ?? 0) : -1;
  const beast = spiritBeast >= 0 ? SPIRIT_BEASTS[spiritBeast] : null;
  const elementId = beast ? ELEMENT_TO_ID[String(beast.element)] : undefined;
  // Yellow Dragon (Koryu, index 4) is the golden legendary.
  const palette: BeyPaletteId = spiritBeast === 4 ? 'gold' : (elementId ?? 'gold');
  const elMeta = elementId ? ELEMENT_MAP[elementId] : null;
  const accent = elMeta?.color ?? 'var(--gold)';

  const checklist = [
    { k: 'Blade', ok: !!blade },
    { k: 'Ratchet', ok: !!ratchet },
    { k: 'Bit', ok: !!bit },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '4px 0' }}>
      <div style={{ opacity: blade ? 1 : 0.45, transition: 'opacity .3s' }}>
        <Beyblade size={188} element={palette} spinSpeed={1} paused={!allSelected} />
      </div>

      {allSelected && beast ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>
            {beast.name}
            {elMeta && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> · {elMeta.beastNameZh}</span>}
          </div>
          <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5, letterSpacing: '0.1em' }}>
            {elMeta ? `${elMeta.k} ${String(beast.element).toUpperCase()} · ` : ''}READY TO FORGE
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', gap: 16 }}>
          {checklist.map((c) => (
            <span
              key={c.k}
              className="t-mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.06em',
                color: c.ok ? 'var(--gold)' : 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>{c.ok ? '◆' : '◇'}</span>
              {c.k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
