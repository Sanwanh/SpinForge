'use client';

import * as React from 'react';
import Link from 'next/link';
import { Beyblade } from '@/components/design/Beyblade';
import {
  Corners,
  Eyebrow,
  PageHeader,
  Section,
  SectionHead,
  Stat,
  Tag,
} from '@/components/design/atoms';

function PassportCard() {
  return (
    <div
      className="r-legendary"
      style={{
        width: '100%',
        maxWidth: 480,
        background: 'linear-gradient(160deg, #1a1408 0%, #0a0e17 50%, #0a0805 100%)',
        borderRadius: 18,
        padding: 28,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Corners color="var(--gold)" />
      <div
        className="kanji-watermark"
        style={{ fontSize: 360, top: '-60px', right: '-60px', opacity: 0.06, color: 'var(--gold)' }}
      >
        龍
      </div>

      <div
        className="sf-flex sf-justify-between sf-items-center"
        style={{ position: 'relative' }}
      >
        <div>
          <div className="t-eyebrow" style={{ color: 'var(--gold)' }}>
            Spin Passport · 陀螺護照
          </div>
          <div
            className="t-mono"
            style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}
          >
            Sui Object · 0x89af...d4e2
          </div>
        </div>
        <div
          style={{
            padding: '4px 9px',
            borderRadius: 4,
            background: 'rgba(212,175,55,0.15)',
            border: '1px solid var(--gold)',
            color: 'var(--gold)',
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
          }}
        >
          VERIFIED
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'relative',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <Beyblade size={160} element="fire" spinSpeed={0.9} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="t-eyebrow" style={{ fontSize: 9 }}>
            Rotor Name
          </div>
          <div
            style={{
              fontFamily: 'var(--f-display)',
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: '-0.01em',
              lineHeight: 1.05,
              marginTop: 4,
            }}
          >
            BLAZE CORE
          </div>
          <div className="t-mono" style={{ fontSize: 14, color: 'var(--gold)' }}>
            #1024
          </div>
          <div
            className="sf-flex sf-gap-2"
            style={{ marginTop: 10, flexWrap: 'wrap' }}
          >
            <Tag color="var(--fire)" style={{ fontSize: 9 }}>火 ATTACK</Tag>
            <Tag color="var(--gold)" style={{ fontSize: 9 }}>S-TIER</Tag>
          </div>
        </div>
      </div>

      <div
        className="sf-grid"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid var(--border-soft)',
          position: 'relative',
        }}
      >
        <Stat label="Battles" value="48" />
        <Stat label="Wins" value="34" color="var(--wood)" />
        <Stat label="Losses" value="14" color="var(--text-mute)" />
        <Stat label="Burst" value="11" color="var(--fire)" />
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 18,
          borderTop: '1px solid var(--border-soft)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div>
          <div className="t-eyebrow" style={{ fontSize: 9 }}>
            Holder
          </div>
          <div className="t-mono" style={{ fontSize: 13, marginTop: 4 }}>
            <span style={{ color: 'var(--gold)' }}>0xA1...8F4D</span>
            <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>· 134d</span>
          </div>
        </div>
        <div className="sf-flex sf-gap-2">
          {[
            { k: '校', c: 'var(--rare)' },
            { k: '爆', c: 'var(--fire)' },
            { k: '季', c: 'var(--gold)' },
          ].map((b) => (
            <div
              key={b.k}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: `1px solid ${b.c}`,
                background: `radial-gradient(circle, ${b.c}22, transparent)`,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--f-han)',
                  fontWeight: 900,
                  fontSize: 16,
                  color: b.c,
                }}
              >
                {b.k}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RegistrationFlow() {
  const steps = [
    { n: 1, k: '拿出實體陀螺', en: 'Grab your real-world top', icon: '▣' },
    { n: 2, k: '掃描 QR / NFC', en: 'Scan QR · tap NFC · or manual', icon: '◈' },
    { n: 3, k: '鑄造 Rotor Object', en: 'Mint on-chain Rotor', icon: '✦' },
    { n: 4, k: '戰績開始累積', en: 'Battle history begins', icon: '⚡' },
  ];
  return (
    <div
      className="sf-grid"
      style={{
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        marginTop: 64,
        borderTop: '1px solid var(--border-soft)',
        borderBottom: '1px solid var(--border-soft)',
      }}
    >
      {steps.map((s, i) => (
        <div
          key={i}
          style={{
            padding: '32px 24px',
            borderRight: i < 3 ? '1px solid var(--border-soft)' : undefined,
            position: 'relative',
          }}
        >
          <div
            className="t-mono"
            style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em' }}
          >
            STEP {String(s.n).padStart(2, '0')}
          </div>
          <div
            style={{
              marginTop: 16,
              marginBottom: 18,
              fontSize: 28,
              color: 'var(--gold)',
              opacity: 0.5,
            }}
          >
            {s.icon}
          </div>
          <div
            style={{
              fontFamily: 'var(--f-ui)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--text)',
              marginBottom: 6,
            }}
          >
            {s.k}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {s.en}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ModeCardProps {
  tag: string;
  kanji: string;
  title: string;
  sub: string;
  body: string[];
  accent: string;
  recommended?: boolean;
}

function ModeCard({ tag, kanji, title, sub, body, accent, recommended }: ModeCardProps) {
  return (
    <div
      className="panel"
      style={{
        padding: 28,
        position: 'relative',
        border: recommended ? `1px solid ${accent}` : '1px solid var(--border-soft)',
        boxShadow: recommended
          ? `0 0 0 1px ${accent}22, 0 12px 40px ${accent}22`
          : undefined,
      }}
    >
      {recommended && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: 20,
            padding: '4px 10px',
            borderRadius: 4,
            background: accent,
            color: 'var(--abyss)',
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.15em',
            whiteSpace: 'nowrap',
          }}
        >
          RECOMMENDED MVP
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          fontFamily: 'var(--f-han)',
          fontWeight: 900,
          fontSize: 80,
          color: accent,
          opacity: 0.08,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {kanji}
      </div>
      <div className="t-eyebrow" style={{ color: accent }}>
        {tag}
      </div>
      <h3 className="t-h3" style={{ marginTop: 12, marginBottom: 6 }}>
        {title}
      </h3>
      <div className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
        {sub}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {body.map((line, i) => (
          <li
            key={i}
            style={{
              fontSize: 14,
              color: 'var(--text)',
              padding: '8px 0',
              borderTop: i === 0 ? undefined : '1px dashed var(--border-soft)',
              display: 'flex',
              gap: 10,
              alignItems: 'baseline',
            }}
          >
            <span
              style={{
                color: accent,
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
              }}
            >
              ›
            </span>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

const PASSPORT_FIELDS = [
  { k: 'Rotor Object ID', v: "Permanent Sui Object — your top's unique signature" },
  { k: 'Battle History',  v: 'Every match, every result, every burst — immutable' },
  { k: 'Season Standing', v: 'Ranked points, tournament eligibility, badges' },
  { k: 'Part Provenance', v: 'Verified parts vs community-made, with full custody chain' },
  { k: 'Owner Trail',     v: 'Original minter + all transfers — like a car title' },
];

const REGISTRATION_METHODS = [
  { k: 'QR', n: 'QR Code Sticker', desc: '貼在陀螺盒或本體。掃描即領取鏈上 Rotor。', price: '成本最低 · MVP 首選', tier: 'OFFICIAL', color: 'var(--gold)' },
  { k: 'NFC', n: 'NFC Tag', desc: '手機靠近即驗證。實體收藏品質感、防偽性強。', price: '中高成本 · 賽級用', tier: 'PREMIUM', color: 'var(--rare)' },
  { k: 'DIY', n: 'Manual Register', desc: '上傳照片、輸入零件組合。任何陀螺都能成為社群 Rotor。', price: '免費 · 限友誼賽', tier: 'COMMUNITY', color: 'var(--epic)' },
];

export default function PassportPage() {
  return (
    <>
      <PageHeader
        eyebrow="01 / SPIN PASSPORT"
        title={
          <>
            Your real-world top
            <br />
            gets a <span style={{ color: 'var(--gold)' }}>life on-chain.</span>
          </>
        }
        sub="鏈上不取代你那顆陀螺，而是幫它建立數位身分、戰績履歷、零件認證、賽事資格與獎勵。實體陀螺負責「玩」，Sui 鏈負責「證明、紀錄、交易、成長」。"
        kanjiBg="證"
      />

      <Section>
        <div
          className="passport-grid sf-grid"
          style={{
            gridTemplateColumns: '1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <PassportCard />
          </div>
          <div>
            <Eyebrow color="var(--gold)">What lives in your Passport</Eyebrow>
            <h2 className="t-h3" style={{ marginTop: 14, marginBottom: 24, fontSize: 36 }}>
              A car license plate.
              <br />
              An athlete's ID.
              <br />
              A historical record.
            </h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {PASSPORT_FIELDS.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: 16,
                    alignItems: 'baseline',
                  }}
                >
                  <div
                    className="t-mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--gold)',
                      letterSpacing: '0.1em',
                      minWidth: 140,
                      fontWeight: 700,
                    }}
                  >
                    {d.k}
                  </div>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {d.v}
                  </div>
                </div>
              ))}
            </div>
            <div className="sf-flex sf-gap-3" style={{ marginTop: 32 }}>
              <Link href="/packs" className="btn btn-primary">
                Register My Top
              </Link>
              <a
                href="https://suiexplorer.com/"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
              >
                View on Sui Explorer ↗
              </a>
            </div>
          </div>
        </div>

        <RegistrationFlow />

        <div style={{ marginTop: 96 }}>
          <SectionHead
            eyebrow="THREE WAYS TO BATTLE"
            title="實體陀螺，鏈上紀錄。"
            sub="從最簡單的雙方確認，到 AI 裁判全自動判定 —— 三種模式對應不同場景。"
            align="center"
          />
          <div
            className="mode-grid sf-grid"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}
          >
            <ModeCard
              tag="MODE · 01"
              kanji="戰"
              title="Physical Battle + Chain Record"
              sub="實體對戰 + 鏈上紀錄"
              accent="var(--gold)"
              recommended
              body={[
                '雙方掃描自己的陀螺，建立 Battle Room',
                '現實中發射，實體判定勝負',
                '賽後雙方點擊確認，結果寫入 Sui',
                '每場真實對戰 → 鏈上 BattleRecord',
              ]}
            />
            <ModeCard
              tag="MODE · 02"
              kanji="策"
              title="Physical + Card Strategy"
              sub="實體陀螺 + 卡牌輔助"
              accent="var(--rare)"
              body={[
                '賽前裝備 3 張任務型卡牌',
                '卡牌不改物理結果，只影響賽事獎勵',
                'Burst Hunter · Long Spin · Arena Boost',
                '讓不同陀螺類型都有上場空間',
              ]}
            />
            <ModeCard
              tag="MODE · 03"
              kanji="模"
              title="Pure Online Simulation"
              sub="純線上模擬對戰"
              accent="var(--epic)"
              body={[
                '沒有實體陀螺也能玩',
                '回合制 · 出牌影響系統判定',
                '適合早期 MVP 與遠距離 PvP',
                '戰績同樣寫入鏈上',
              ]}
            />
          </div>
        </div>

        <div style={{ marginTop: 96 }}>
          <SectionHead
            eyebrow="REGISTRATION METHODS"
            title="三種方式，把陀螺鑄上鏈。"
            sub="從便宜的 QR 貼紙，到高級的 NFC 認證，再到自帶陀螺的社群註冊 —— 任何人都不被擋在門外。"
            align="center"
          />
          <div
            className="mode-grid sf-grid"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}
          >
            {REGISTRATION_METHODS.map((r, i) => (
              <div
                key={i}
                className="panel"
                style={{ padding: 28, position: 'relative', overflow: 'hidden' }}
              >
                <div
                  className="kanji-watermark"
                  style={{
                    fontSize: 200,
                    top: -40,
                    right: -30,
                    color: r.color,
                    opacity: 0.06,
                  }}
                >
                  {r.k}
                </div>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    border: `1px solid ${r.color}`,
                    background: `radial-gradient(circle, ${r.color}22, transparent)`,
                    display: 'grid',
                    placeItems: 'center',
                    color: r.color,
                    fontFamily: 'var(--f-mono)',
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  {r.k}
                </div>
                <div
                  className="t-eyebrow"
                  style={{ color: r.color, marginTop: 18 }}
                >
                  {r.tier}
                </div>
                <div className="t-h3" style={{ marginTop: 8, marginBottom: 10 }}>
                  {r.n}
                </div>
                <p
                  className="muted"
                  style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}
                >
                  {r.desc}
                </p>
                <div
                  className="t-mono"
                  style={{
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-soft)',
                    fontSize: 11,
                    color: r.color,
                    letterSpacing: '0.05em',
                  }}
                >
                  {r.price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

    </>
  );
}
