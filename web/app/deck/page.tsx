'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useDeck, type DeckBey } from '@/hooks/useDeck';
import { useInventory } from '@/hooks/useInventory';
import { DeckBuilder } from '@/components/deck/DeckBuilder';
import { DuplicateWarning } from '@/components/deck/DuplicateWarning';
import { useT } from '@/lib/i18n';
import { Eyebrow, PageHeader, Section } from '@/components/design/atoms';

export default function DeckPage() {
  const account = useCurrentAccount();
  const { beys: deckBeys, techniques, hasDuplicates, setBey, setTechniques, clear } = useDeck();
  const { beys: ownedBeys, isLoading } = useInventory();
  const t = useT();
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);

  if (!account) {
    return (
      <>
        <PageHeader
          eyebrow="DECK · 牌組"
          title={<>Build your <span style={{ color: 'var(--rare)' }}>3on3</span></>}
          sub={t.deck.subtitle}
          kanjiBg="牌"
          accent="var(--rare)"
        />
        <Section>
          <div className="panel" style={{ padding: 64, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
            <p className="muted" style={{ fontSize: 16, margin: 0 }}>{t.deck.connectPrompt}</p>
          </div>
        </Section>
      </>
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
    <>
      <PageHeader
        eyebrow="DECK · 牌組"
        title={<>Build your <span style={{ color: 'var(--rare)' }}>3on3 deck.</span></>}
        sub={t.deck.subtitle}
        kanjiBg="牌"
        accent="var(--rare)"
      />
      <Section style={{ paddingTop: 64, paddingBottom: 64 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div className="sf-flex sf-justify-between sf-items-center" style={{ gap: 12 }}>
          <Eyebrow>{availableBeys.length} Beys ready</Eyebrow>
          <div className="sf-flex sf-gap-3">
            <button onClick={clear} className="btn btn-ghost" style={{ padding: '10px 16px', fontSize: 12 }}>
              Clear All
            </button>
            <button
              disabled={!isComplete || hasDuplicates}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: 12 }}
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
      <div className="panel" style={{ padding: 24, marginTop: 32 }}>
        <Eyebrow>WBBA Deck Rules</Eyebrow>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '14px 0 0',
            display: 'grid',
            gap: 8,
            color: 'var(--text-mute)',
            fontSize: 13,
          }}
        >
          {[
            '3 assembled Beyblades required',
            'No duplicate parts across your deck',
            '12 Technique cards (max 2 Launch, max 2 Xtreme, max 1 Spirit)',
            'First to 7 points wins the match',
          ].map((line, i) => (
            <li
              key={i}
              style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}
            >
              <span
                className="t-mono"
                style={{
                  color: 'var(--gold)',
                  fontSize: 11,
                  minWidth: 24,
                  letterSpacing: '0.1em',
                }}
              >
                0{i + 1}
              </span>
              {line}
            </li>
          ))}
        </ul>
      </div>
      </Section>
    </>
  );
}
