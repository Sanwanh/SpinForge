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
          eyebrow={t.collection.pageEyebrowEmpty}
          title={
            <>
              {t.collection.pageTitleEmpty}
              <br />
              {t.collection.pageTitleEmptyAccent}
            </>
          }
          sub={t.collection.pageSubEmpty}
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
        eyebrow={t.collection.pageEyebrowOwned}
        title={
          <span style={{ color: 'var(--epic)' }}>
            {t.collection.partsForged.replace('{n}', String(allParts.length))}
          </span>
        }
        sub={t.collection.pageSubOwned}
        kanjiBg="卡"
        accent="var(--epic)"
      />

      <Section>
        <div
          className="sf-grid"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}
        >
          {[
            { label: t.collection.totalParts, value: String(allParts.length), color: 'var(--gold)' },
            { label: t.workshop.blade,        value: String(blades.length),   color: 'var(--fire)' },
            { label: t.workshop.ratchet,      value: String(ratchets.length), color: 'var(--rare)' },
            { label: t.workshop.bit,          value: String(bits.length),     color: 'var(--wood)' },
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
