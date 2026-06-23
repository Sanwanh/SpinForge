'use client';

import * as React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/design/Logo';
import { Stat } from '@/components/design/atoms';
import { useT } from '@/lib/i18n';

export function Footer() {
  const t = useT();

  const play = [
    [t.nav.battle,     '/battle'],
    [t.nav.forge,      '/forge'],
    [t.nav.tournament, '/tournament'],
  ] as const;

  const learn = [
    [t.footer.spinPassport, '/passport'],
    [t.footer.fiveElements, '/elements'],
    [t.nav.cards,           '/collection'],
    [t.nav.spark,           '/tokenomics'],
  ] as const;

  const company = [
    [t.nav.team,            '/team'],
    [t.nav.faq,             '/faq'],
    [t.footer.whitepaper,   '#'],
    [t.footer.pressKit,     '#'],
  ] as const;

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
          className="sf-grid footer-top"
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
              {t.footer.tagline}
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

          <FooterColumn label={t.footer.play} items={play} />
          <FooterColumn label={t.footer.learn} items={learn} />
          <FooterColumn label={t.footer.company} items={company} />
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
          <Stat label={t.footer.rotorsActive} value="12,847" />
          <Stat label={t.footer.battles24h} value="2,318" color="var(--blood)" />
          <Stat label={t.footer.sparkVolume} value="184K" color="var(--gold)" />
          <Stat label={t.footer.suiBlock} value="287,124,901" color="var(--rare)" />
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
            {t.footer.copyright}
          </div>
          <div
            className="sf-flex sf-gap-6 t-mono"
            style={{ fontSize: 11, color: 'var(--text-dim)' }}
          >
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
              {t.footer.terms}
            </a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
              {t.footer.privacy}
            </a>
            <span style={{ color: 'var(--wood)' }}>● {t.footer.systemsOk}</span>
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
