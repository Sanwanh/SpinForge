'use client';

import { motion } from 'framer-motion';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useDeck } from '@/hooks/useDeck';
import { DeckBuilder } from '@/components/deck/DeckBuilder';
import { DuplicateWarning } from '@/components/deck/DuplicateWarning';

export default function DeckPage() {
  const account = useCurrentAccount();
  const { beys, techniques, hasDuplicates, setBey, setTechniques, clear } = useDeck();

  if (!account) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">Connect your wallet to build your deck.</p>
      </div>
    );
  }

  const isComplete = beys.every(Boolean) && techniques.length === 12;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Deck Builder</h1>
            <p className="text-sm text-gray-400">Build your 3on3 deck: 3 Beys + 12 Technique cards</p>
          </div>
          <div className="flex gap-2">
            <button onClick={clear} className="btn-secondary text-sm">Clear All</button>
            <button
              disabled={!isComplete || hasDuplicates}
              className="btn-primary text-sm"
            >
              Save Deck
            </button>
          </div>
        </div>
      </motion.div>

      <DuplicateWarning show={hasDuplicates} />

      <DeckBuilder
        beys={beys}
        onSelectSlot={(slot) => {
          setBey(slot, {
            beyId: `placeholder-${slot}`,
            name: `Bey #${slot + 1}`,
            bladeId: `blade-${slot}`,
            ratchetId: `ratchet-${slot}`,
            bitId: `bit-${slot}`,
          });
        }}
        onRemoveSlot={(slot) => setBey(slot, null)}
        techniques={techniques}
      />

      {/* Rules reminder */}
      <div className="card">
        <h3 className="mb-2 text-sm font-bold text-gray-400">WBBA Deck Rules</h3>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>- 3 assembled Beyblades required</li>
          <li>- No duplicate parts across your deck</li>
          <li>- 12 Technique cards (max 2 Launch, max 2 Xtreme, max 1 Spirit)</li>
          <li>- First to 7 points wins the match</li>
        </ul>
      </div>
    </div>
  );
}
