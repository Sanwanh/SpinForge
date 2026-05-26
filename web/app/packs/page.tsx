'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { RARITY_LABELS, RARITY_BORDER_CLASSES, SPIRIT_BEASTS, ELEMENT_COLORS, type Rarity, type Element } from '@/lib/constants';

interface RevealedPart {
  id: string;
  name: string;
  type: string;
  rarity: number;
  spiritBeast?: number;
}

const MOCK_RESULTS: RevealedPart[] = [
  { id: '1', name: 'Wizard Rod', type: 'Blade', rarity: 1, spiritBeast: 0 },
  { id: '2', name: '3-60', type: 'Ratchet', rarity: 0 },
  { id: '3', name: 'Needle', type: 'Bit', rarity: 0 },
  { id: '4', name: 'Storm Wing', type: 'Blade', rarity: 2, spiritBeast: 1 },
  { id: '5', name: 'Gear Ball', type: 'Bit', rarity: 1 },
];

export default function PacksPage() {
  const account = useCurrentAccount();
  const [isOpening, setIsOpening] = useState(false);
  const [revealed, setRevealed] = useState<RevealedPart[]>([]);
  const [revealIndex, setRevealIndex] = useState(-1);

  const handleOpenPack = useCallback(async () => {
    setIsOpening(true);
    setRevealed(MOCK_RESULTS);
    setRevealIndex(-1);

    for (let i = 0; i < MOCK_RESULTS.length; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setRevealIndex(i);
    }

    setIsOpening(false);
  }, []);

  const handleReset = useCallback(() => {
    setRevealed([]);
    setRevealIndex(-1);
  }, []);

  if (!account) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">Connect your wallet to open packs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Open Packs</h1>
        <p className="text-sm text-gray-400">Each pack contains 5 parts. Cost: 100 SPARK</p>
      </motion.div>

      {revealed.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-16">
          <motion.div
            whileHover={{ scale: 1.05, rotateY: 10 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-48 w-36 cursor-pointer items-center justify-center rounded-xl border-2 border-brand-blue bg-gradient-to-br from-brand-blue/20 to-brand-orange/20"
            onClick={handleOpenPack}
          >
            <div className="text-center">
              <div className="text-4xl font-black text-gradient">S</div>
              <p className="mt-2 text-xs text-gray-400">Click to Open</p>
            </div>
          </motion.div>
          <p className="text-sm text-gray-500">100 SPARK per pack</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <AnimatePresence>
              {revealed.map((part, i) => {
                const rarityLabel = RARITY_LABELS[part.rarity] ?? ('Common' as Rarity);
                const borderClass = RARITY_BORDER_CLASSES[rarityLabel];
                const beast = part.spiritBeast !== undefined ? SPIRIT_BEASTS[part.spiritBeast] : undefined;
                const color = beast ? ELEMENT_COLORS[beast.element as Element] : '#9CA3AF';

                return i <= revealIndex ? (
                  <motion.div
                    key={part.id}
                    initial={{ rotateY: 180, opacity: 0, scale: 0.5 }}
                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className={`card flex flex-col items-center gap-2 border-2 ${borderClass}`}
                  >
                    {beast && (
                      <div
                        className="h-10 w-10 rounded-full"
                        style={{ backgroundColor: `${color}30`, border: `2px solid ${color}` }}
                      />
                    )}
                    <span className="text-xs font-bold text-white">{part.name}</span>
                    <span className="text-[10px] text-gray-500">{part.type}</span>
                    <span className="text-[10px] font-bold" style={{ color }}>
                      {rarityLabel}
                    </span>
                  </motion.div>
                ) : (
                  <div
                    key={part.id}
                    className="card flex h-32 items-center justify-center border-2 border-gray-700 animate-pulse"
                  >
                    <span className="text-gray-600">?</span>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>

          {!isOpening && (
            <div className="flex justify-center gap-4">
              <button onClick={handleReset} className="btn-secondary">Close</button>
              <button onClick={handleOpenPack} className="btn-primary">Open Another</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
