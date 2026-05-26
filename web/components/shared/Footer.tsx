import * as React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/design/Logo';
import { Stat } from '@/components/design/atoms';

const PLAY = [
  ['Gacha', '/packs'],
  ['Battle', '/tournament'],
  ['Forge', '/forge'],
  ['Tournament', '/tournament'],
] as const;

const LEARN = [
  ['Spin Passport', '/passport'],
  ['Five Elements', '/elements'],
  ['Cards', '/collection'],
  ['$SPARK', '/tokenomics'],
] as const;

const COMPANY = [
  ['Team', '/team'],
  ['FAQ', '/faq'],
  ['Whitepaper', '#'],
  ['Press Kit', '#'],
] as const;

export function Footer() {
  return (
    <footer
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, var(--abyss), #02040a)',
        borderTop: '1px solid var(--border-soft)',
        paddingTop: 72,
        overflow: 'hidden',
        marginTop: 80,
      }}
    >
      <div
        className="kanji-watermark"
        style={{
          fontSize: 480,
          bottom: -180,
          right: -120,
          color: 'var(--gold)',
          opacity: 0.04,
        }}
      >
        鑄
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 32px',
          position: 'relative',
        }}
      >
        <div
          className="sf-grid"
          style={{
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
            gap: 48,
            marginBottom: 56,
          }}
        >
          <div>
            <div className="sf-flex sf-items-center sf-gap-3" style={{ marginBottom: 18 }}>
              <Logo size={32} />
              <div
                style={{
                  fontFamily: 'var(--f-display)',
                  fontWeight: 700,
                  fontSize: 24,
                  letterSpacing: '-0.01em',
                }}
              >
                SPINFORGE
              </div>
            </div>
            <p
              className="muted"
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                maxWidth: 360,
                margin: 0,
              }}
            >
              Real metal meets the on-chain world. SpinForge 讓每一顆現實陀螺，都變成可累積戰績的鏈上選手。
            </p>
            <div className="sf-flex sf-gap-3" style={{ marginTop: 24 }}>
              {(
                [
                  { l: 'X', c: 'var(--text-mute)' },
                  { l: 'DC', c: 'var(--rare)' },
                  { l: 'TG', c: 'var(--water)' },
                  { l: 'GH', c: 'var(--text)' },
                ] as const
              ).map((s) => (
                <a
                  key={s.l}
                  href="#"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    display: 'grid',
                    placeItems: 'center',
                    color: s.c,
                    textDecoration: 'none',
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {s.l}
                </a>
              ))}
            </div>
          </div>

          <FooterColumn label="Play" items={PLAY} />
          <FooterColumn label="Learn" items={LEARN} />
          <FooterColumn label="Company" items={COMPANY} />
        </div>

        <div
          className="sf-grid"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
            padding: '24px 0',
            borderTop: '1px solid var(--border-soft)',
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <Stat label="Rotors Active" value="12,847" />
          <Stat label="Battles · 24h" value="2,318" color="var(--blood)" />
          <Stat label="SPARK Volume" value="184K" color="var(--gold)" />
          <Stat label="Sui Block Height" value="287,124,901" color="var(--rare)" />
        </div>

        <div
          className="sf-flex sf-justify-between sf-items-center"
          style={{
            padding: '28px 0 36px',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            © 2026 SpinForge Labs · Built on Sui · 鑄于神州
          </div>
          <div
            className="sf-flex sf-gap-6 t-mono"
            style={{ fontSize: 11, color: 'var(--text-dim)' }}
          >
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
              Terms
            </a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
              Privacy
            </a>
            <span style={{ color: 'var(--wood)' }}>● All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  label,
  items,
}: {
  label: string;
  items: readonly (readonly [string, string])[];
}) {
  return (
    <div>
      <div className="t-eyebrow">{label}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
        {items.map(([l, h]) => (
          <li key={l} style={{ padding: '6px 0' }}>
            <Link
              href={h}
              style={{
                color: 'var(--text-mute)',
                textDecoration: 'none',
                fontSize: 13,
              }}
            >
              {l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
