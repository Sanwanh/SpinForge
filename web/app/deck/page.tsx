'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useDeck, type DeckBey } from '@/hooks/useDeck';
import { useInventory } from '@/hooks/useInventory';
import { DeckBuilder } from '@/components/deck/DeckBuilder';
import { DuplicateWarning } from '@/components/deck/DuplicateWarning';
import { useT } from '@/lib/i18n';

export default function DeckPage() {
  const account = useCurrentAccount();
  const { beys: deckBeys, techniques, hasDuplicates, setBey, setTechniques, clear } = useDeck();
  const { beys: ownedBeys, isLoading } = useInventory();
  const t = useT();
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);

  if (!account) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">{t.deck.connectPrompt}</p>
      </div>
    );
  }

  const isComplete = deckBeys.every(Boolean) && techniques.length === 12;

  const handleSelectBey = (bey: DeckBey) => {
    if (selectingSlot !== null) {
      setBey(selectingSlot, bey);
      setSelectingSlot(null);
    }
  };

  // Convert owned Bey objects to DeckBey format
  const availableBeys: DeckBey[] = ownedBeys.map((b) => ({
    beyId: b.objectId,
    name: String(b.fields.name ?? `Bey #${b.objectId.slice(-4)}`),
    bladeId: String(b.fields.blade_id ?? ''),
    ratchetId: String(b.fields.ratchet_id ?? ''),
    bitId: String(b.fields.bit_id ?? ''),
  }));

  // Filter out beys already in deck
  const usedBeyIds = new Set(deckBeys.filter(Boolean).map((b) => b!.beyId));
  const selectableBeys = availableBeys.filter((b) => !usedBeyIds.has(b.beyId));

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t.deck.title}</h1>
            <p className="text-sm text-gray-400">{t.deck.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={clear} className="btn-secondary text-sm">Clear All</button>
            <button
              disabled={!isComplete || hasDuplicates}
              className="btn-primary text-sm"
            >
              {t.deck.save}
            </button>
          </div>
        </div>
      </motion.div>

      <DuplicateWarning show={hasDuplicates} />

      <DeckBuilder
        beys={deckBeys}
        onSelectSlot={(slot) => setSelectingSlot(slot)}
        onRemoveSlot={(slot) => setBey(slot, null)}
        techniques={techniques}
      />

      {/* Bey picker */}
      {selectingSlot !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {t.deck.selectBey} #{selectingSlot + 1}
            </h2>
            <button
              onClick={() => setSelectingSlot(null)}
              className="text-sm text-gray-400 hover:text-white"
            >
              {t.common.cancel}
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            </div>
          ) : selectableBeys.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">{t.deck.noBeys}</p>
              <a href="/workshop" className="mt-2 inline-block text-sm text-brand-blue hover:underline">
                {t.deck.goWorkshop}
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selectableBeys.map((bey) => (
                <motion.button
                  key={bey.beyId}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectBey(bey)}
                  className="card-hover flex flex-col items-start gap-1 border border-gray-700 text-left transition-all hover:border-brand-blue/50"
                >
                  <span className="text-sm font-bold text-white">{bey.name}</span>
                  <span className="text-[10px] text-gray-500">{bey.beyId.slice(0, 16)}...</span>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      )}

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
