'use client';

import * as React from 'react';
import { BEY_PALETTES, type BeyPaletteId } from './tokens';

export interface BeybladeProps {
  size?: number;
  element?: BeyPaletteId;
  spinSpeed?: number;
  paused?: boolean;
}

/**
 * Illustrated 2.5D Beyblade.
 *
 * Cleaner than the original CSS-3D-extruded-rings approach: a tilted
 * ellipse body with gradient depth, a spinning conic-gradient surface
 * for the notched weight disc, a glossy cap, and a clipped driver tip.
 * Reads correctly from 80px up to 500px without parts looking detached.
 */
export function Beyblade({
  size = 280,
  element = 'gold',
  spinSpeed = 1,
  paused = false,
}: BeybladeProps) {
  const p = BEY_PALETTES[element] || BEY_PALETTES.gold;
  const ps = paused ? 'paused' : 'running';

  const bodyH = size * 0.62;
  const driverH = size * 0.18;
  const containerH = bodyH + driverH * 0.7;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {/* Ground shadow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: size * 0.1,
          width: size * 0.72,
          height: size * 0.1,
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, ${p.glow}, transparent 70%)`,
          filter: 'blur(10px)',
        }}
      />

      {/* Pulse rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size * 0.78,
            height: size * 0.78,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: `1.2px solid ${p.rim}`,
            opacity: 0.4,
            animation: 'pulse-ring 2.6s ease-out infinite',
            animationDelay: `${i * 0.87}s`,
            animationPlayState: ps,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Bey — wobbles as one piece */}
      <div
        style={{
          position: 'relative',
          width: size * 0.88,
          height: containerH,
          animation: `wobble ${1.8 / spinSpeed}s ease-in-out infinite`,
          animationPlayState: ps,
        }}
      >
        {/* DRIVER TIP */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            width: size * 0.14,
            height: driverH,
            transform: 'translateX(-50%)',
            background: `linear-gradient(180deg, ${p.deep} 0%, #1a1a1a 60%, #050810 100%)`,
            clipPath: 'polygon(20% 0, 80% 0, 65% 100%, 35% 100%)',
            boxShadow: `0 4px 12px ${p.glow}`,
            zIndex: 1,
          }}
        />

        {/* WEIGHT DISC */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: bodyH,
            borderRadius: '50%',
            background: `linear-gradient(180deg, ${p.deep} 50%, #050810 100%)`,
            boxShadow: `
              inset 0 -10% 16px rgba(0,0,0,0.7),
              inset 0 4px 8px rgba(255,255,255,0.15),
              0 12px 28px ${p.glow}
            `,
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              overflow: 'hidden',
            }}
          >
            {/* Spinning notched surface */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: `
                  repeating-conic-gradient(
                    from 0deg,
                    ${p.rim} 0deg 7deg,
                    ${p.deep} 7deg 14deg
                  )
                `,
                transform: 'translateY(-50%) scaleY(1)',
                height: bodyH,
                animation: `spinZAxis ${0.55 / spinSpeed}s linear infinite`,
                animationPlayState: ps,
                transformOrigin: '50% 50%',
              }}
            />
            {/* Top-half highlight */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                height: '55%',
                background: `
                  radial-gradient(ellipse 100% 100% at 50% 100%, transparent 60%, rgba(0,0,0,0.4) 100%),
                  radial-gradient(ellipse 80% 80% at 50% 20%, ${p.core}88 0%, transparent 60%)
                `,
                borderRadius: '50% 50% 0 0',
                pointerEvents: 'none',
              }}
            />
            {/* Bottom rim */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '50%',
                background: `linear-gradient(180deg, transparent 0%, ${p.deep}aa 30%, #050810 100%)`,
                borderRadius: '0 0 50% 50% / 0 0 100% 100%',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* CAP */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: bodyH * 0.05,
            width: '70%',
            height: bodyH * 0.55,
            transform: 'translateX(-50%)',
            borderRadius: '50%',
            background: `radial-gradient(ellipse 80% 80% at 50% 30%, ${p.core} 0%, ${p.rim} 50%, ${p.deep} 100%)`,
            boxShadow: `
              inset 0 -6px 10px rgba(0,0,0,0.5),
              inset 0 3px 6px rgba(255,255,255,0.25),
              0 4px 14px ${p.glow}
            `,
            zIndex: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `
                repeating-conic-gradient(
                  from 0deg,
                  transparent 0deg 18deg,
                  rgba(0,0,0,0.15) 18deg 22deg
                )
              `,
              animation: `spinZAxis ${1.4 / spinSpeed}s linear infinite reverse`,
              animationPlayState: ps,
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '60%',
              background: `radial-gradient(ellipse 100% 100% at 50% 100%, ${p.deep}aa, transparent 70%)`,
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* KANJI — non-spinning, sits over the cap */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: bodyH * 0.12,
            width: '60%',
            height: bodyH * 0.4,
            transform: 'translateX(-50%)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--f-han)',
              fontWeight: 900,
              fontSize: size * 0.24,
              color: '#0a0a0a',
              textShadow: `0 0 12px ${p.core}, 0 1px 0 ${p.core}aa`,
              lineHeight: 1,
            }}
          >
            {p.kanji}
          </span>
        </div>
      </div>

      {/* Speed line streaks */}
      <svg
        viewBox="-100 -100 200 200"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: size * 1.02,
          height: size * 1.02,
          transform: 'translate(-50%, -50%)',
          animation: `spin-fast ${0.32 / spinSpeed}s linear infinite`,
          animationPlayState: ps,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i * 360) / 5;
          return (
            <path
              key={i}
              d="M 92 0 A 92 92 0 0 1 76 42"
              fill="none"
              stroke={p.rim}
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.35"
              transform={`rotate(${a})`}
            />
          );
        })}
      </svg>
    </div>
  );
}
