import * as React from 'react';
import { PageHeader, Section, SectionHead } from '@/components/design/atoms';

const ALLOCATIONS = [
  { k: 'Play-to-Earn',    pct: 38, color: '#D4AF37', desc: 'Battle rewards · season prizes · tournament pools' },
  { k: 'Treasury',        pct: 18, color: '#00CCFF', desc: 'Governance vault · 4yr vesting' },
  { k: 'Team & Advisors', pct: 15, color: '#a855f7', desc: '12-month cliff · 36-month linear' },
  { k: 'Liquidity',       pct: 12, color: '#00FF88', desc: 'Cetus + Aftermath DEX seeding' },
  { k: 'Public Sale',     pct: 10, color: '#FFB800', desc: 'Community round · TGE Q3 2026' },
  { k: 'Marketing',       pct:  7, color: '#FF4444', desc: 'Arenas · creators · partners' },
];

function SparkPie() {
  const R = 130;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: 320, height: 320 }}>
      <svg
        viewBox="-170 -170 340 340"
        style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}
      >
        {ALLOCATIONS.map((d, i) => {
          const dash = (d.pct / 100) * C;
          const seg = (
            <circle
              key={i}
              cx="0"
              cy="0"
              r={R}
              fill="none"
              stroke={d.color}
              strokeWidth="42"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              opacity="0.92"
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        <div>
          <div className="t-eyebrow" style={{ fontSize: 10 }}>
            Total Supply
          </div>
          <div
            className="text-gradient"
            style={{
              fontFamily: 'var(--f-display)',
              fontWeight: 700,
              fontSize: 56,
              lineHeight: 1,
              marginTop: 6,
            }}
          >
            1B
          </div>
          <div
            className="t-mono"
            style={{
              fontSize: 11,
              color: 'var(--text-mute)',
              marginTop: 6,
              whiteSpace: 'nowrap',
            }}
          >
            $SPARK · SUI
          </div>
        </div>
      </div>
    </div>
  );
}

const UTILITY = [
  { k: 'EARN',  desc: 'Win battles, complete seasons, tournament prizes', color: 'var(--wood)' },
  { k: 'FORGE', desc: 'Burn SPARK to fuse parts and unlock legendary tiers', color: 'var(--gold)' },
  { k: 'STAKE', desc: 'Lock in arenas to earn fees + governance weight',   color: 'var(--rare)' },
  { k: 'TRADE', desc: 'Marketplace fees flow back to the play-to-earn pool', color: 'var(--epic)' },
];

export default function TokenomicsPage() {
  return (
    <>
      <PageHeader
        eyebrow="08 / $SPARK"
        title={
          <>
            The current
            <br />
            that drives the spin.
          </>
        }
        sub="SPARK 是 SpinForge 的角動量代幣 —— 抽包、鑄造、上市、報名比賽，每一個動作都流動著它。"
        kanjiBg="幣"
      />

      <Section>
        <div
          className="alloc-grid sf-grid"
          style={{
            gridTemplateColumns: '1fr 1.2fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <SparkPie />
          </div>
          <div>
            {ALLOCATIONS.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: '18px 0',
                  borderTop: i === 0 ? '1px solid var(--border-soft)' : undefined,
                  borderBottom: '1px solid var(--border-soft)',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    background: d.color,
                    boxShadow: `0 0 8px ${d.color}88`,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--f-ui)',
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    {d.k}
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {d.desc}
                  </div>
                </div>
                <div
                  className="t-mono"
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: d.color,
                    width: 80,
                    textAlign: 'right',
                  }}
                >
                  {d.pct}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 96 }}>
          <SectionHead
            eyebrow="UTILITY LOOP"
            title="A closed economic circle."
            sub="SPARK 不是被動囤積的資產 —— 它在玩家、戰場、市場之間不停旋轉。"
            align="center"
          />
          <div
            className="utility-grid sf-grid"
            style={{
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              background: 'var(--border-soft)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {UTILITY.map((d, i) => (
              <div
                key={i}
                style={{ padding: '32px 28px', background: 'var(--void)' }}
              >
                <div
                  style={{
                    fontFamily: 'var(--f-display)',
                    fontWeight: 700,
                    fontSize: 36,
                    color: d.color,
                    lineHeight: 1,
                  }}
                >
                  {d.k}
                </div>
                <div className="muted" style={{ fontSize: 14, marginTop: 14 }}>
                  {d.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 96 }}>
          <SectionHead
            eyebrow="EMISSIONS"
            title="48-month deflationary curve."
            sub="Play-to-Earn 池每月遞減 8%。Forge 與賽季報名會永久銷毀 30% SPARK，讓網路在規模化時保持稀缺。"
            align="center"
          />
          <div className="panel" style={{ padding: 32 }}>
            <svg viewBox="0 0 800 220" style={{ width: '100%', height: 220 }}>
              <defs>
                <linearGradient id="emitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(212,175,55,0.6)" />
                  <stop offset="100%" stopColor="rgba(212,175,55,0)" />
                </linearGradient>
              </defs>
              <line x1="40" y1="180" x2="780" y2="180" stroke="var(--border-soft)" strokeWidth="1" />
              <line x1="40" y1="20" x2="40" y2="180" stroke="var(--border-soft)" strokeWidth="1" />
              <path d="M 40 40 Q 200 60, 400 110 T 780 170 L 780 180 L 40 180 Z" fill="url(#emitGrad)" />
              <path d="M 40 40 Q 200 60, 400 110 T 780 170" fill="none" stroke="var(--gold)" strokeWidth="2" />
              {[
                { x: 40, y: 40, label: 'TGE', v: '10M / mo' },
                { x: 260, y: 80, label: 'M12', v: '7M / mo' },
                { x: 520, y: 130, label: 'M24', v: '4M / mo' },
                { x: 780, y: 170, label: 'M48', v: '1M / mo' },
              ].map((m, i) => (
                <g key={i}>
                  <circle cx={m.x} cy={m.y} r="4" fill="var(--gold)" />
                  <text
                    x={m.x}
                    y={m.y - 12}
                    fill="var(--gold)"
                    fontSize="10"
                    fontFamily="var(--f-mono)"
                    textAnchor="middle"
                  >
                    {m.label}
                  </text>
                  <text
                    x={m.x}
                    y={m.y + 18}
                    fill="var(--text-mute)"
                    fontSize="9"
                    fontFamily="var(--f-mono)"
                    textAnchor="middle"
                  >
                    {m.v}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </Section>

    </>
  );
}
