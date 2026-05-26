'use client';

import * as React from 'react';
import { Corners } from './atoms';
import { ELEMENT_MAP, RARITY_MAP, type ElementId, type RarityId } from './tokens';

export interface PartCardProps {
  rarity: RarityId;
  element: ElementId;
  name: string;
  kanji?: string;
  type: string;
  stats: Record<string, string | number>;
  code: string;
  size?: 'md' | 'lg' | 'sm';
  onClick?: () => void;
  href?: string;
}

export function PartCard({
  rarity,
  element,
  name,
  kanji,
  type,
  stats,
  code,
  size = 'md',
  onClick,
  href,
}: PartCardProps) {
  const v = ELEMENT_MAP[element];
  const rarityMeta = RARITY_MAP[rarity];

  const dims =
    size === 'lg'
      ? { w: 300, art: 240, fs: 130 }
      : size === 'sm'
        ? { w: 180, art: 140, fs: 80 }
        : { w: 240, art: 200, fs: 110 };

  const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
  };
  const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
  };

  const inner = (
    <div
      className={rarityMeta.cls}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onClick={onClick}
      style={{
        width: dims.w,
        borderRadius: 14,
        background: rarityMeta.bg,
        padding: 14,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.3s',
        cursor: onClick || href ? 'pointer' : 'default',
      }}
    >
      <div
        className="sf-flex sf-justify-between sf-items-center"
        style={{ gap: 8 }}
      >
        <span
          style={{
            padding: '3px 7px',
            borderRadius: 4,
            border: `1px solid ${v.color}`,
            color: v.color,
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          {element.toUpperCase()} · {type}
        </span>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            color: rarityMeta.color,
            letterSpacing: '0.1em',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {rarityMeta.label}
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          height: dims.art,
          marginTop: 14,
          marginBottom: 14,
          borderRadius: 10,
          background: `radial-gradient(ellipse at center, ${v.color}22, transparent 70%), linear-gradient(180deg, #0a0e17, #050810)`,
          border: `1px solid ${v.color}33`,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
        }}
      >
        {rarity === 'legendary' && (
          <>
            <div
              className="kanji-watermark"
              style={{
                fontSize: 180,
                top: '-30px',
                right: '-20px',
                opacity: 0.1,
                color: v.color,
              }}
            >
              {v.beast}
            </div>
            <svg
              viewBox="0 0 200 200"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                animation: 'spin 30s linear infinite',
                opacity: 0.3,
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const a = i * 30;
                return (
                  <line
                    key={i}
                    x1="100"
                    y1="100"
                    x2="100"
                    y2="20"
                    stroke={v.color}
                    strokeWidth="0.3"
                    transform={`rotate(${a} 100 100)`}
                  />
                );
              })}
            </svg>
          </>
        )}
        {rarity === 'epic' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(45deg, transparent 0 14px, ${v.color}08 14px 15px)`,
            }}
          />
        )}

        <div
          style={{
            fontFamily: 'var(--f-han)',
            fontWeight: 900,
            fontSize: rarity === 'legendary' ? dims.fs * 1.18 : dims.fs,
            color: v.color,
            textShadow:
              rarity === 'legendary'
                ? `0 0 40px ${v.color}, 0 0 80px ${v.color}88`
                : `0 0 24px ${v.color}66`,
            position: 'relative',
            lineHeight: 1,
          }}
        >
          {kanji || v.beast}
        </div>

        {rarity === 'legendary' && <Corners color={v.color} />}
      </div>

      <div
        style={{
          fontFamily: 'var(--f-display)',
          fontWeight: 700,
          fontSize: 20,
          lineHeight: 1.1,
          color: rarity === 'legendary' ? v.color : 'var(--text)',
        }}
      >
        {name}
      </div>
      <div
        className="t-mono"
        style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}
      >
        {code}
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--border-soft)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {Object.entries(stats).map(([k, val]) => (
          <div key={k} style={{ textAlign: 'center' }}>
            <div
              className="t-mono"
              style={{
                fontSize: 8,
                color: 'var(--text-dim)',
                letterSpacing: '0.1em',
              }}
            >
              {k}
            </div>
            <div
              className="t-mono"
              style={{
                fontSize: 13,
                color: v.color,
                fontWeight: 700,
                marginTop: 2,
              }}
            >
              {val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {inner}
      </a>
    );
  }
  return inner;
}
