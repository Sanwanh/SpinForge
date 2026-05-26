import * as React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ELEMENT_MAP, type ElementId } from './tokens';

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div className="t-eyebrow" style={color ? { color } : undefined}>
      {children}
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  align = 'left',
  accent,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  align?: 'left' | 'center';
  accent?: string;
}) {
  return (
    <div
      style={{
        textAlign: align,
        maxWidth: 760,
        margin: align === 'center' ? '0 auto 64px' : '0 0 64px',
      }}
    >
      <Eyebrow color={accent}>{eyebrow}</Eyebrow>
      <h2 className="t-h2" style={{ marginTop: 14, marginBottom: 18 }}>
        {title}
      </h2>
      {sub && (
        <p className="muted" style={{ fontSize: 17, lineHeight: 1.55, margin: 0 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function ElementGlyph({ el, size = 56 }: { el: ElementId; size?: number }) {
  const v = ELEMENT_MAP[el];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: `radial-gradient(circle at 30% 30%, ${v.color}22, transparent 70%)`,
        border: `1px solid ${v.color}`,
        boxShadow: `0 0 24px ${v.color}33, inset 0 0 12px ${v.color}22`,
        color: v.color,
        fontFamily: 'var(--f-han)',
        fontWeight: 900,
        fontSize: size * 0.5,
      }}
    >
      {v.k}
    </div>
  );
}

export function Stat({
  label,
  value,
  color,
}: {
  label: ReactNode;
  value: ReactNode;
  color?: string;
}) {
  return (
    <div>
      <div
        className="t-eyebrow"
        style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '.14em' }}
      >
        {label}
      </div>
      <div
        className="t-mono"
        style={{
          fontSize: 22,
          color: color || 'var(--text)',
          fontWeight: 600,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function Corners({ color = 'var(--gold)' }: { color?: string }) {
  const s: CSSProperties = { position: 'absolute', width: 14, height: 14 };
  return (
    <>
      <span style={{ ...s, top: 8, left: 8, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <span style={{ ...s, top: 8, right: 8, borderTop: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
      <span style={{ ...s, bottom: 8, left: 8, borderBottom: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <span style={{ ...s, bottom: 8, right: 8, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
    </>
  );
}

export function Tag({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span className="tag" style={{ ...(color ? { color } : null), ...style }}>
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  accent,
  kanjiBg,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  accent?: string;
  kanjiBg?: string;
}) {
  return (
    <section
      style={{
        position: 'relative',
        paddingTop: 130,
        paddingBottom: 64,
        paddingLeft: 32,
        paddingRight: 32,
        borderBottom: '1px solid var(--border-soft)',
        overflow: 'hidden',
      }}
    >
      {kanjiBg && (
        <div
          className="kanji-watermark"
          style={{
            fontSize: 580,
            top: '50%',
            right: -80,
            transform: 'translateY(-50%)',
            color: accent || 'var(--gold)',
            opacity: 0.04,
          }}
        >
          {kanjiBg}
        </div>
      )}
      <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
        <Eyebrow color={accent || 'var(--gold)'}>{eyebrow}</Eyebrow>
        <h1
          className="t-h2"
          style={{
            marginTop: 14,
            marginBottom: 20,
            fontSize: 'clamp(48px, 6vw, 84px)',
            lineHeight: 0.98,
          }}
        >
          {title}
        </h1>
        {sub && (
          <p
            className="muted"
            style={{
              fontSize: 18,
              lineHeight: 1.55,
              maxWidth: 720,
              margin: 0,
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </section>
  );
}

export function Section({
  children,
  style,
  wide,
}: {
  children: ReactNode;
  style?: CSSProperties;
  wide?: boolean;
}) {
  return (
    <section
      style={{
        position: 'relative',
        padding: '96px 32px',
        maxWidth: wide ? undefined : 1280,
        margin: wide ? undefined : '0 auto',
        ...style,
      }}
    >
      {children}
    </section>
  );
}
