'use client';

import * as React from 'react';
import Link from 'next/link';
import { Beyblade } from './Beyblade';
import { Corners } from './atoms';
import { ELEMENT_MAP, type ElementId } from './tokens';

const ELEMENT_ORDER: ElementId[] = ['fire', 'water', 'wood', 'metal', 'earth'];

/**
 * Deterministic element pick from object id — every Bey gets a consistent
 * visual identity even though the chain only stores name + stats.
 */
export function elementForBey(objectId: string): ElementId {
  if (!objectId) return 'fire';
  let h = 0;
  for (let i = 0; i < objectId.length; i++) {
    h = (h * 31 + objectId.charCodeAt(i)) >>> 0;
  }
  return ELEMENT_ORDER[h % ELEMENT_ORDER.length];
}

export interface BeyCardData {
  objectId: string;
  name: string;
  wins: number;
  losses: number;
  burstFinishes: number;
  xtremeFinishes: number;
  /** NFT-style real photo of the physical Bey, if uploaded. */
  imageUrl?: string | null;
}

export interface BeyCardProps {
  bey: BeyCardData;
  selected?: boolean;
  lastUsed?: boolean;
  compact?: boolean;
  onClick?: () => void;
  /** When provided, the card renders as a Next.js Link. Takes precedence over onClick. */
  href?: string;
}

export function BeyCard({
  bey,
  selected = false,
  lastUsed = false,
  compact = false,
  onClick,
  href,
}: BeyCardProps) {
  const el = elementForBey(bey.objectId);
  const meta = ELEMENT_MAP[el];
  const winRate = bey.wins + bey.losses > 0
    ? Math.round((bey.wins / (bey.wins + bey.losses)) * 100)
    : null;

  const interactive = !!onClick || !!href;
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'block',
    textAlign: 'left',
    padding: 16,
    borderRadius: 14,
    border: selected ? `1px solid ${meta.color}` : '1px solid var(--border-soft)',
    background: selected
      ? `linear-gradient(160deg, ${meta.color}18, var(--void) 60%, var(--abyss))`
      : 'var(--void)',
    boxShadow: selected
      ? `0 0 0 1px ${meta.color}66, 0 14px 36px ${meta.glow}`
      : '0 8px 18px rgba(0,0,0,0.2)',
    cursor: interactive ? 'pointer' : 'default',
    transition: 'transform 0.15s, box-shadow 0.2s, border-color 0.2s',
    fontFamily: 'var(--f-body)',
    color: 'var(--text)',
    overflow: 'hidden',
    width: '100%',
    textDecoration: 'none',
  };
  const onMouseOver = (e: React.MouseEvent<HTMLElement>) => {
    if (!interactive || selected) return;
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.borderColor = meta.color;
    e.currentTarget.style.boxShadow = `0 12px 28px ${meta.glow}`;
  };
  const onMouseOut = (e: React.MouseEvent<HTMLElement>) => {
    if (!interactive || selected) return;
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.borderColor = 'var(--border-soft)';
    e.currentTarget.style.boxShadow = '0 8px 18px rgba(0,0,0,0.2)';
  };

  // Inner content shared between <Link>, <button>, and <div> wrappers.
  const inner = (
    <>
      {selected && <Corners color={meta.color} />}

      {/* Watermark */}
      <div
        style={{
          position: 'absolute',
          top: -28,
          right: -16,
          fontFamily: 'var(--f-han)',
          fontWeight: 900,
          fontSize: 140,
          color: meta.color,
          opacity: 0.08,
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {meta.beast}
      </div>

      {/* Last-used badge */}
      {lastUsed && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            padding: '3px 8px',
            borderRadius: 999,
            background: 'rgba(212,175,55,0.18)',
            border: '1px solid var(--gold)',
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.1em',
            color: 'var(--gold)',
            fontWeight: 700,
          }}
        >
          LAST
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          position: 'relative',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          {bey.imageUrl ? (
            <img
              src={bey.imageUrl}
              alt={bey.name || 'Bey photo'}
              style={{
                width: compact ? 64 : 80,
                height: compact ? 64 : 80,
                objectFit: 'cover',
                borderRadius: '50%',
                border: `1px solid ${meta.color}66`,
              }}
            />
          ) : (
            <Beyblade size={compact ? 64 : 80} element={el} spinSpeed={0.9} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="t-mono"
            style={{
              fontSize: 9,
              color: meta.color,
              letterSpacing: '0.14em',
              fontWeight: 700,
            }}
          >
            {meta.k} · {meta.beastNameZh}
          </div>
          <div
            style={{
              fontFamily: 'var(--f-display)',
              fontWeight: 700,
              fontSize: compact ? 15 : 17,
              lineHeight: 1.15,
              marginTop: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {bey.name || 'Unnamed Rotor'}
          </div>
          <div
            className="t-mono"
            style={{
              fontSize: 10,
              color: 'var(--text-dim)',
              marginTop: 2,
            }}
          >
            {bey.objectId.slice(0, 8)}…{bey.objectId.slice(-4)}
          </div>
        </div>
      </div>

      {!compact && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--border-soft)',
            position: 'relative',
          }}
        >
          <Stat label="W"     value={bey.wins}            color="var(--wood)" />
          <Stat label="L"     value={bey.losses}          color="var(--text-mute)" />
          <Stat label="Burst" value={bey.burstFinishes}   color="var(--fire)" />
          <Stat label="Win%"  value={winRate != null ? `${winRate}%` : '—'} color="var(--gold)" />
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bey-card"
        style={containerStyle}
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
      >
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="bey-card"
        style={containerStyle}
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="bey-card" style={containerStyle}>
      {inner}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        className="t-mono"
        style={{
          fontSize: 8,
          letterSpacing: '0.1em',
          color: 'var(--text-dim)',
        }}
      >
        {label}
      </div>
      <div
        className="t-mono"
        style={{
          fontSize: 14,
          fontWeight: 700,
          color,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ─── Local storage for "last used" ─── */

const LAST_USED_KEY = 'spinforge:lastUsedRotor';

export function getLastUsedRotor(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_USED_KEY);
  } catch {
    return null;
  }
}

export function setLastUsedRotor(objectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_USED_KEY, objectId);
  } catch {
    /* ignore */
  }
}
