'use client';

import { motion } from 'framer-motion';
import { useT } from '@/lib/i18n';
import {
  Eyebrow,
  PageHeader,
  Section,
  SectionHead,
  Stat,
} from '@/components/design/atoms';

const RULES_KEYS = ['rule1', 'rule2', 'rule3', 'rule4'] as const;

const BRACKET_MATCHES = [
  { round: 'Quarter-Finals', a: 'Forge Wolves', b: 'NTUST Renegades', score: '7 — 5', winner: 'a' },
  { round: 'Quarter-Finals', a: 'Vermilion Sky', b: 'Iron Halo', score: '7 — 3', winner: 'a' },
  { round: 'Quarter-Finals', a: 'Tide Wardens', b: 'Storm Embers', score: '4 — 7', winner: 'b' },
  { round: 'Quarter-Finals', a: 'Yellow Sand', b: 'Phantom Coil', score: '7 — 6', winner: 'a' },
];

export default function TournamentPage() {
  const t = useT();

  return (
    <>
      <PageHeader
        eyebrow="09 / TOURNAMENT · 賽"
        title={
          <>
            Weekend cups
            <br />
            to <span style={{ color: 'var(--epic)' }}>Forge Cup S1.</span>
          </>
        }
        sub={t.tournament.subtitle}
        kanjiBg="賽"
        accent="var(--epic)"
      />

      <Section>
        <div
          className="sf-grid"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}
        >
          <div className="panel" style={{ padding: 20 }}>
            <Stat label="Current Bracket" value="QUARTERS" color="var(--rare)" />
          </div>
          <div className="panel" style={{ padding: 20 }}>
            <Stat label="Registered Teams" value="32 / 32" color="var(--gold)" />
          </div>
          <div className="panel" style={{ padding: 20 }}>
            <Stat label="Prize Pool" value="850 SPARK" color="var(--legendary)" />
          </div>
        </div>

        <SectionHead
          eyebrow="LIVE BRACKET · Q4 2026"
          title="Forge Cup S1 · Quarter-Finals"
          sub="3v3 deck format · first to 7 points per match · WBBA rules."
        />

        <div
          className="sf-grid"
          style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}
        >
          {BRACKET_MATCHES.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="panel"
              style={{ padding: 22 }}
            >
              <Eyebrow color="var(--gold)">{m.round}</Eyebrow>
              <div
                className="sf-flex sf-justify-between sf-items-center"
                style={{ gap: 14, marginTop: 14 }}
              >
                <span
                  style={{
                    fontFamily: 'var(--f-display)',
                    fontWeight: 700,
                    fontSize: 18,
                    color: m.winner === 'a' ? 'var(--gold)' : 'var(--text-mute)',
                  }}
                >
                  {m.a}
                </span>
                <span
                  className="t-mono"
                  style={{
                    fontSize: 18,
                    color: 'var(--text)',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                  }}
                >
                  {m.score}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--f-display)',
                    fontWeight: 700,
                    fontSize: 18,
                    color: m.winner === 'b' ? 'var(--gold)' : 'var(--text-mute)',
                    textAlign: 'right',
                  }}
                >
                  {m.b}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div
          className="sf-grid"
          style={{ gridTemplateColumns: '1.4fr 1fr', gap: 32, marginTop: 80 }}
        >
          <div className="panel" style={{ padding: 28 }}>
            <Eyebrow>{t.tournament.rulesTitle}</Eyebrow>
            <ul
              style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}
            >
              {RULES_KEYS.map((k, i) => (
                <li
                  key={k}
                  style={{
                    padding: '12px 0',
                    borderTop: i === 0 ? '1px solid var(--border-soft)' : undefined,
                    borderBottom: '1px solid var(--border-soft)',
                    color: 'var(--text)',
                    fontSize: 14,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    className="t-mono"
                    style={{ color: 'var(--gold)', minWidth: 24 }}
                  >
                    0{i + 1}
                  </span>
                  {t.tournament[k]}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel" style={{ padding: 28 }}>
            <Eyebrow>{t.tournament.prizePool}</Eyebrow>
            <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
              {[
                { p: '1st', spark: '500 SPARK', label: t.tournament.firstPlace, color: 'var(--legendary)' },
                { p: '2nd', spark: '250 SPARK', label: t.tournament.secondPlace, color: 'var(--rare)' },
                { p: '3rd', spark: '100 SPARK', label: t.tournament.thirdPlace, color: 'var(--text-mute)' },
              ].map((pz) => (
                <div
                  key={pz.p}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--border-soft)',
                  }}
                >
                  <span
                    className="t-mono"
                    style={{ color: pz.color, fontSize: 13, letterSpacing: '0.1em' }}
                  >
                    {pz.p} · {pz.label}
                  </span>
                  <span
                    className="t-mono"
                    style={{ color: pz.color, fontSize: 18, fontWeight: 700 }}
                  >
                    {pz.spark}
                  </span>
                </div>
              ))}
            </div>
            <p
              className="muted"
              style={{ marginTop: 24, fontSize: 13, lineHeight: 1.55 }}
            >
              {t.tournament.comingSoonDesc}
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
