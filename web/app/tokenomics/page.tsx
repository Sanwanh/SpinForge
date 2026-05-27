'use client';

import * as React from 'react';
import { PageHeader, Section, SectionHead } from '@/components/design/atoms';
import { useT } from '@/lib/i18n';

const ALLOC_PCT = [38, 18, 15, 12, 10, 7] as const;
const ALLOC_COLORS = ['#D4AF37', '#00CCFF', '#a855f7', '#00FF88', '#FFB800', '#FF4444'];

function SparkPie({ totalLabel, suite }: { totalLabel: string; suite: string }) {
  const R = 130;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: 320, height: 320 }}>
      <svg
        viewBox="-170 -170 340 340"
        style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}
      >
        {ALLOC_PCT.map((pct, i) => {
          const dash = (pct / 100) * C;
          const seg = (
            <circle
              key={i}
              cx="0"
              cy="0"
              r={R}
              fill="none"
              stroke={ALLOC_COLORS[i]}
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
            {totalLabel}
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
            {suite}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TokenomicsPage() {
  const t = useT();

  const allocations = [
    { k: t.tokenomics.p2eName,        desc: t.tokenomics.p2eDesc,        pct: 38, color: '#D4AF37' },
    { k: t.tokenomics.treasuryName,   desc: t.tokenomics.treasuryDesc,   pct: 18, color: '#00CCFF' },
    { k: t.tokenomics.teamName,       desc: t.tokenomics.teamDesc,       pct: 15, color: '#a855f7' },
    { k: t.tokenomics.liquidityName,  desc: t.tokenomics.liquidityDesc,  pct: 12, color: '#00FF88' },
    { k: t.tokenomics.publicName,     desc: t.tokenomics.publicDesc,     pct: 10, color: '#FFB800' },
    { k: t.tokenomics.marketingName,  desc: t.tokenomics.marketingDesc,  pct: 7,  color: '#FF4444' },
  ];

  const utility = [
    { k: t.tokenomics.earnName,  desc: t.tokenomics.earnDesc,  color: 'var(--wood)' },
    { k: t.tokenomics.forgeName, desc: t.tokenomics.forgeDesc, color: 'var(--gold)' },
    { k: t.tokenomics.stakeName, desc: t.tokenomics.stakeDesc, color: 'var(--rare)' },
    { k: t.tokenomics.tradeName, desc: t.tokenomics.tradeDesc, color: 'var(--epic)' },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t.tokenomics.pageEyebrow}
        title={
          <>
            {t.tokenomics.pageTitle1}
            <br />
            {t.tokenomics.pageTitle2}
          </>
        }
        sub={t.tokenomics.pageSub}
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
            <SparkPie totalLabel={t.tokenomics.totalSupply} suite={t.tokenomics.suite} />
          </div>
          <div>
            {allocations.map((d, i) => (
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
            eyebrow={t.tokenomics.utilityEyebrow}
            title={t.tokenomics.utilityTitle}
            sub={t.tokenomics.utilitySub}
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
            {utility.map((d, i) => (
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
            eyebrow={t.tokenomics.emissionsEyebrow}
            title={t.tokenomics.emissionsTitle}
            sub={t.tokenomics.emissionsSub}
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
