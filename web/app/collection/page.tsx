'use client';

import { motion } from 'framer-motion';
import { useInventory } from '@/hooks/useInventory';
import { PartGrid } from '@/components/collection/PartGrid';
import type { PartCardData } from '@/components/collection/PartCard';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useT } from '@/lib/i18n';
import { PageHeader, Section, Stat } from '@/components/design/atoms';

export default function CollectionPage() {
  const account = useCurrentAccount();
  const { blades, ratchets, bits, isLoading } = useInventory();
  const t = useT();

  const allParts: PartCardData[] = [
    ...blades.map((b) => ({
      objectId: b.objectId,
      type: 'blade' as const,
      name: String(b.fields.name ?? ''),
      rarity: Number(b.fields.rarity ?? 0),
      fields: b.fields,
    })),
    ...ratchets.map((r) => ({
      objectId: r.objectId,
      type: 'ratchet' as const,
      name: `${r.fields.prongs}-${r.fields.height}`,
      rarity: Number(r.fields.rarity ?? 0),
      fields: r.fields,
    })),
    ...bits.map((b) => ({
      objectId: b.objectId,
      type: 'bit' as const,
      name: String(b.fields.name ?? ''),
      rarity: Number(b.fields.rarity ?? 0),
      fields: b.fields,
    })),
  ];

  if (!account) {
    return (
      <>
        <PageHeader
          eyebrow="03 / CARDS · 卡片"
          title={
            <>
              Four tiers.
              <br />
              One forge.
            </>
          }
          sub="從一片素材到鎮殿傳說，每張卡的稀有度都有獨立的視覺語言。"
          kanjiBg="卡"
          accent="var(--epic)"
        />
        <Section>
          <div
            className="panel"
            style={{
              padding: 64,
              textAlign: 'center',
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            <p
              className="muted"
              style={{ fontSize: 16, lineHeight: 1.6, margin: 0 }}
            >
              {t.collection.connectPrompt}
            </p>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="03 / YOUR COLLECTION"
        title={
          <>
            {allParts.length}{' '}
            <span style={{ color: 'var(--epic)' }}>parts forged.</span>
          </>
        }
        sub="每張卡都是一個 Sui Object —— 它的稀有度、屬性、來歷都活在鏈上。"
        kanjiBg="卡"
        accent="var(--epic)"
      />

      <Section>
        <div
          className="sf-grid"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}
        >
          {[
            { label: 'Total Parts', value: String(allParts.length), color: 'var(--gold)' },
            { label: 'Blades', value: String(blades.length), color: 'var(--fire)' },
            { label: 'Ratchets', value: String(ratchets.length), color: 'var(--rare)' },
            { label: 'Bits', value: String(bits.length), color: 'var(--wood)' },
          ].map((s) => (
            <div key={s.label} className="panel" style={{ padding: 18 }}>
              <Stat label={s.label} value={s.value} color={s.color} />
            </div>
          ))}
        </div>

        {isLoading ? (
          <div
            className="sf-flex sf-items-center"
            style={{ justifyContent: 'center', padding: '64px 0' }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '2px solid var(--gold)',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <PartGrid parts={allParts} />
          </motion.div>
        )}
      </Section>
    </>
  );
}
