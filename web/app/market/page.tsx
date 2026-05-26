'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useT } from '@/lib/i18n';
import {
  Eyebrow,
  PageHeader,
  Section,
  SectionHead,
  Stat,
} from '@/components/design/atoms';

const SAMPLE_LISTINGS = [
  { id: 1, name: 'BLAZE CORE',  element: 'fire',  rarity: 'legendary', price: 5_200, color: 'var(--fire)' },
  { id: 2, name: 'TIDE GUARD',  element: 'water', rarity: 'rare',      price: 480,   color: 'var(--water)' },
  { id: 3, name: 'VINE WHIP',   element: 'wood',  rarity: 'epic',      price: 1_540, color: 'var(--wood)' },
  { id: 4, name: 'IRON BASE',   element: 'metal', rarity: 'common',    price: 90,    color: 'var(--metal)' },
  { id: 5, name: 'EARTH ANVIL', element: 'earth', rarity: 'epic',      price: 1_280, color: 'var(--earth)' },
  { id: 6, name: 'STORM EDGE',  element: 'metal', rarity: 'rare',      price: 540,   color: 'var(--metal)' },
] as const;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Listings' },
  { value: 'price-asc', label: 'Price · Low → High' },
  { value: 'price-desc', label: 'Price · High → Low' },
  { value: 'rarity', label: 'Rarity · Legendary First' },
  { value: 'pop', label: 'Most Watched' },
];

export default function MarketPage() {
  const t = useT();
  const [sort, setSort] = React.useState('newest');

  return (
    <>
      <PageHeader
        eyebrow="07 / SPIRIT BAZAAR · 市"
        title={
          <>
            Trade rare parts.
            <br />
            <span style={{ color: 'var(--rare)' }}>Build your stable.</span>
          </>
        }
        sub="稀有零件、限定卡牌、場館徽章、外觀 Skin —— Kiosk 結算，鏈上不可竄改。"
        kanjiBg="市"
        accent="var(--rare)"
      />

      <Section>
        <div
          className="sf-grid"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}
        >
          <div className="panel" style={{ padding: 18 }}>
            <Stat label="Listings · 24h" value="2,318" color="var(--gold)" />
          </div>
          <div className="panel" style={{ padding: 18 }}>
            <Stat label="Floor · Common" value="40 SPARK" />
          </div>
          <div className="panel" style={{ padding: 18 }}>
            <Stat label="Floor · Legendary" value="4,800 SPARK" color="var(--gold)" />
          </div>
          <div className="panel" style={{ padding: 18 }}>
            <Stat label="Volume · 24h" value="184K" color="var(--wood)" />
          </div>
        </div>

        <div
          className="sf-flex sf-justify-between sf-items-center"
          style={{ marginBottom: 24, flexWrap: 'wrap', gap: 16 }}
        >
          <Eyebrow>Live Listings · {SAMPLE_LISTINGS.length}</Eyebrow>
          <div className="sf-flex sf-items-center sf-gap-3">
            <span
              className="t-mono"
              style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}
            >
              SORT
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                background: 'var(--void)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 14px',
                fontFamily: 'var(--f-mono)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="sf-grid market-grid"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}
        >
          {SAMPLE_LISTINGS.map((l) => (
            <motion.div
              key={l.id}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="panel"
              style={{
                padding: 22,
                position: 'relative',
                overflow: 'hidden',
                borderColor: `${l.color}55`,
              }}
            >
              <div
                className="kanji-watermark"
                style={{
                  fontSize: 200,
                  top: -50,
                  right: -40,
                  color: l.color,
                  opacity: 0.08,
                }}
              >
                {l.element === 'fire' ? '火' : l.element === 'water' ? '水' : l.element === 'wood' ? '木' : l.element === 'metal' ? '金' : '土'}
              </div>
              <div
                className="t-mono"
                style={{
                  fontSize: 10,
                  color: l.color,
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                }}
              >
                {l.element.toUpperCase()} · {l.rarity.toUpperCase()}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-display)',
                  fontWeight: 700,
                  fontSize: 26,
                  marginTop: 8,
                  position: 'relative',
                }}
              >
                {l.name}
              </div>
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: '1px solid var(--border-soft)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  position: 'relative',
                }}
              >
                <div>
                  <div
                    className="t-eyebrow"
                    style={{ fontSize: 9, color: 'var(--text-dim)' }}
                  >
                    Price
                  </div>
                  <div
                    className="t-mono"
                    style={{
                      fontSize: 22,
                      color: 'var(--gold)',
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    {l.price.toLocaleString()} SPARK
                  </div>
                </div>
                <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 11 }}>
                  Buy
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ marginTop: 80 }}>
          <SectionHead
            eyebrow="MARKETPLACE · 設計中"
            title={t.market.comingSoon}
            sub={t.market.comingSoonDesc}
            align="center"
          />
          <div className="sf-flex" style={{ justifyContent: 'center' }}>
            <Link href="/collection" className="btn btn-primary">
              {t.market.viewCollection}
            </Link>
          </div>
        </div>
      </Section>

    </>
  );
}
