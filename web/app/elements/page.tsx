'use client';

import * as React from 'react';
import {
  Corners,
  Eyebrow,
  PageHeader,
  Section,
  SectionHead,
} from '@/components/design/atoms';
import { ELEMENT_MAP, type ElementId } from '@/components/design/tokens';
import { useT } from '@/lib/i18n';

const ELEMENT_ORDER: ElementId[] = ['wood', 'fire', 'earth', 'metal', 'water'];

function elementPos(el: ElementId, radius: number, offset = -90) {
  const i = ELEMENT_ORDER.indexOf(el);
  const a = ((i * 72 + offset) * Math.PI) / 180;
  return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
}

function ElementMedallion({
  el,
  x,
  y,
  size,
  active,
  onHover,
}: {
  el: ElementId;
  x: number;
  y: number;
  size: number;
  active: boolean;
  onHover: (el: ElementId) => void;
}) {
  const v = ELEMENT_MAP[el];
  const pattern =
    el === 'fire'
      ? `repeating-conic-gradient(from 0deg, ${v.color}11 0deg 6deg, transparent 6deg 12deg)`
      : el === 'water'
        ? `repeating-radial-gradient(circle at center, transparent 0 10px, ${v.color}11 10px 12px)`
        : el === 'wood'
          ? `repeating-linear-gradient(180deg, transparent 0 8px, ${v.color}11 8px 9px)`
          : el === 'metal'
            ? `linear-gradient(135deg, ${v.color}22 0%, transparent 50%, ${v.color}22 100%)`
            : `radial-gradient(circle at 50% 50%, ${v.color}22 1px, transparent 2px) 0 0 / 14px 14px`;
  return (
    <div
      style={{
        position: 'absolute',
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
      }}
      onMouseEnter={() => onHover(el)}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: size + 24,
          height: size + 24,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: `1px solid ${v.color}66`,
          boxShadow: active ? `0 0 30px ${v.color}88` : `0 0 16px ${v.color}33`,
          transition: 'box-shadow 0.3s',
          animation: active ? 'pulse-ring 2.2s ease-out infinite' : undefined,
        }}
      />
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          background: `
            radial-gradient(circle at 35% 30%, ${v.color}66 0%, ${v.color}22 35%, transparent 70%),
            radial-gradient(circle, ${v.color}11, transparent 70%)
          `,
          border: `1.5px solid ${v.color}`,
          boxShadow: active
            ? `0 0 40px ${v.color}, inset 0 0 30px ${v.color}44, 0 0 0 4px ${v.color}22`
            : `0 0 24px ${v.color}44, inset 0 0 20px ${v.color}22`,
          display: 'grid',
          placeItems: 'center',
          transition: 'box-shadow 0.3s, transform 0.3s',
          transform: active ? 'scale(1.08)' : 'scale(1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: pattern,
            opacity: 0.6,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--f-han)',
            fontWeight: 900,
            fontSize: size * 0.5,
            color: v.color,
            textShadow: `0 0 16px ${v.color}, 0 2px 0 rgba(0,0,0,0.5)`,
            position: 'relative',
            lineHeight: 1,
          }}
        >
          {v.beast}
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: size + 28,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--f-han)',
            fontSize: 20,
            fontWeight: 700,
            color: v.color,
            lineHeight: 1,
          }}
        >
          {v.k} · {v.beastNameZh}
        </div>
        <div
          className="t-mono"
          style={{
            fontSize: 9,
            color: v.color,
            opacity: 0.7,
            marginTop: 4,
            letterSpacing: '0.12em',
          }}
        >
          {v.beastName.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function Mandala({
  active,
  setActive,
}: {
  active: ElementId;
  setActive: (el: ElementId) => void;
}) {
  const W = 760;
  const beastR = 240;
  const trigramR = 340;
  const beastSize = 140;

  const genPaths = ELEMENT_ORDER.map((el, i) => {
    const p1 = elementPos(el, beastR);
    const p2 = elementPos(ELEMENT_ORDER[(i + 1) % 5], beastR);
    const mx = (p1.x + p2.x) * 0.45;
    const my = (p1.y + p2.y) * 0.45;
    return {
      d: `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`,
      color: ELEMENT_MAP[el].color,
    };
  });

  return (
    <div style={{ position: 'relative', width: W, height: W, margin: '0 auto' }}>
      <svg
        viewBox={`-${W / 2} -${W / 2} ${W} ${W}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          {ELEMENT_ORDER.map((el) => (
            <linearGradient
              key={el}
              id={`gen-${el}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor={`${ELEMENT_MAP[el].color}00`} />
              <stop offset="50%" stopColor={`${ELEMENT_MAP[el].color}88`} />
              <stop
                offset="100%"
                stopColor={`${
                  ELEMENT_MAP[
                    ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(el) + 1) % 5]
                  ].color
                }00`}
              />
            </linearGradient>
          ))}
        </defs>

        <circle cx="0" cy="0" r={trigramR + 20} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="1" />
        <circle cx="0" cy="0" r={trigramR - 20} fill="none" stroke="rgba(212,175,55,0.08)" strokeWidth="0.5" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          const x = Math.cos(a - Math.PI / 2) * trigramR;
          const y = Math.sin(a - Math.PI / 2) * trigramR;
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${i * 45})`}>
              {[0, 1, 2].map((b) => (
                <rect key={b} x="-14" y={-7 + b * 5} width="28" height="2.5" fill="rgba(212,175,55,0.45)" />
              ))}
            </g>
          );
        })}

        {genPaths.map((p, i) => {
          const next = elementPos(ELEMENT_ORDER[(i + 1) % 5], beastR);
          return (
            <g key={`gen-${i}`}>
              <path d={p.d} fill="none" stroke={`url(#gen-${ELEMENT_ORDER[i]})`} strokeWidth="3" />
              <circle cx={next.x * 0.92} cy={next.y * 0.92} r="3.5" fill={p.color} opacity="0.9" />
            </g>
          );
        })}

        {/* ke line for active */}
        {(() => {
          const a = elementPos(active, beastR - 40);
          const b = elementPos(
            ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(active) + 2) % 5],
            beastR - 40
          );
          return (
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={ELEMENT_MAP[active].color}
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.85"
            />
          );
        })()}

        <g>
          <circle r="90" fill="rgba(212,175,55,0.05)" stroke="rgba(212,175,55,0.4)" strokeWidth="1.2" />
          <circle r="74" fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth="0.5" strokeDasharray="3 5" />
          <circle r="58" fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="1" />
          <text x="0" y="-8" textAnchor="middle" fontFamily="var(--f-han)" fontWeight="900" fontSize="38" fill="var(--gold)">
            五
          </text>
          <text x="0" y="32" textAnchor="middle" fontFamily="var(--f-han)" fontWeight="900" fontSize="38" fill="var(--gold)">
            行
          </text>
        </g>

        {ELEMENT_ORDER.map((el) => {
          const p = elementPos(el, beastR - 80);
          return (
            <line
              key={el}
              x1={p.x * 0.45}
              y1={p.y * 0.45}
              x2={p.x * 0.85}
              y2={p.y * 0.85}
              stroke={ELEMENT_MAP[el].color}
              strokeWidth="0.8"
              opacity="0.4"
              strokeDasharray="3 3"
            />
          );
        })}
      </svg>

      {ELEMENT_ORDER.map((el) => {
        const p = elementPos(el, beastR);
        return (
          <ElementMedallion
            key={el}
            el={el}
            x={p.x}
            y={p.y}
            size={beastSize}
            active={active === el}
            onHover={setActive}
          />
        );
      })}
    </div>
  );
}

function ElementAltar({
  el,
  role,
  stats,
  lore,
}: {
  el: ElementId;
  role: string;
  stats: Record<string, number>;
  lore: string;
}) {
  const v = ELEMENT_MAP[el];
  const i = ELEMENT_ORDER.indexOf(el);
  const gen = ELEMENT_MAP[ELEMENT_ORDER[(i + 1) % 5]];
  const overcomes = ELEMENT_MAP[ELEMENT_ORDER[(i + 2) % 5]];
  const fedBy = ELEMENT_MAP[ELEMENT_ORDER[(i + 4) % 5]];
  const weakTo = ELEMENT_MAP[ELEMENT_ORDER[(i + 3) % 5]];

  const pattern =
    el === 'fire'
      ? `repeating-conic-gradient(from 0deg, ${v.color}11 0deg 4deg, transparent 4deg 8deg)`
      : el === 'water'
        ? `repeating-radial-gradient(circle at center, transparent 0 12px, ${v.color}11 12px 13px)`
        : el === 'wood'
          ? `repeating-linear-gradient(180deg, transparent 0 10px, ${v.color}11 10px 11px)`
          : el === 'metal'
            ? `linear-gradient(135deg, ${v.color}11 0%, transparent 50%, ${v.color}11 100%)`
            : `radial-gradient(circle at 50% 50%, ${v.color}11 1px, transparent 2px) 0 0 / 16px 16px`;

  return (
    <div
      className="altar-grid"
      style={{
        background: 'var(--void)',
        border: `1px solid ${v.color}33`,
        borderRadius: 18,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 0,
      }}
    >
      <div
        className="altar-portrait"
        style={{
          position: 'relative',
          width: 320,
          minHeight: 360,
          background: `
            radial-gradient(ellipse at 40% 30%, ${v.color}33 0%, transparent 60%),
            linear-gradient(180deg, ${v.deep}44, var(--abyss))
          `,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: pattern, opacity: 0.7 }} />
        <Corners color={v.color} />
        <div
          style={{
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: '50%',
            border: `1px solid ${v.color}44`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            border: `0.5px dashed ${v.color}66`,
            animation: 'spin 28s linear infinite',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--f-han)',
            fontWeight: 900,
            fontSize: 200,
            color: v.color,
            textShadow: `0 0 60px ${v.color}, 0 0 20px ${v.color}aa, 0 4px 0 rgba(0,0,0,0.4)`,
            lineHeight: 1,
            position: 'relative',
          }}
        >
          {v.beast}
        </span>
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            fontFamily: 'var(--f-han)',
            fontWeight: 900,
            fontSize: 38,
            color: v.color,
            opacity: 0.85,
          }}
        >
          {v.k}
        </div>
      </div>

      <div
        style={{
          padding: 36,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div>
          <div
            className="t-mono"
            style={{
              color: v.color,
              fontSize: 11,
              letterSpacing: '0.2em',
              fontWeight: 700,
            }}
          >
            {v.beastName.toUpperCase()} · {v.beastNameZh}
          </div>
          <div
            style={{
              fontFamily: 'var(--f-display)',
              fontWeight: 700,
              fontSize: 44,
              color: 'var(--text)',
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            {role}
          </div>
          <p
            className="muted"
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            {lore}
          </p>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {Object.entries(stats).map(([k, val]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="t-mono" style={{ width: 36, fontSize: 10, color: 'var(--text-dim)' }}>
                {k}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 7,
                  borderRadius: 4,
                  background: 'var(--raised)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <div
                  style={{
                    width: `${val}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${v.color}88, ${v.color})`,
                    boxShadow: `0 0 8px ${v.color}88`,
                  }}
                />
              </div>
              <div
                className="t-mono"
                style={{
                  width: 32,
                  fontSize: 12,
                  color: v.color,
                  textAlign: 'right',
                  fontWeight: 700,
                }}
              >
                {val}
              </div>
            </div>
          ))}
        </div>

        <div
          className="sf-grid"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            paddingTop: 16,
            borderTop: '1px solid var(--border-soft)',
          }}
        >
          {[
            { tag: '生 GEN', el: gen, color: 'var(--wood)' },
            { tag: '剋 OVER', el: overcomes, color: 'var(--fire)' },
            { tag: '← 生 BY', el: fedBy, color: 'var(--rare)' },
            { tag: '← 剋 BY', el: weakTo, color: 'var(--blood)' },
          ].map((r, idx) => (
            <div key={idx}>
              <div
                className="t-mono"
                style={{
                  fontSize: 9,
                  color: r.color,
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                }}
              >
                {r.tag}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-han)',
                  fontWeight: 700,
                  fontSize: 22,
                  color: r.el.color,
                  marginTop: 6,
                  lineHeight: 1,
                }}
              >
                {r.el.k} {r.el.beast}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ALTAR_STATS: Record<ElementId, Record<string, number>> = {
  wood:  { HP: 78, ATK: 70, DEF: 65, SPD: 88 },
  fire:  { HP: 65, ATK: 92, DEF: 50, SPD: 82 },
  earth: { HP: 90, ATK: 70, DEF: 85, SPD: 55 },
  metal: { HP: 80, ATK: 75, DEF: 90, SPD: 60 },
  water: { HP: 85, ATK: 60, DEF: 80, SPD: 70 },
};

const ALTAR_ORDER: ElementId[] = ['wood', 'fire', 'earth', 'metal', 'water'];

export default function ElementsPage() {
  const t = useT();
  const [active, setActive] = React.useState<ElementId>('fire');
  const v = ELEMENT_MAP[active];

  const altarRole: Record<ElementId, string> = {
    wood: t.elements.woodRole,
    fire: t.elements.fireRole,
    earth: t.elements.earthRole,
    metal: t.elements.metalRole,
    water: t.elements.waterRole,
  };
  const altarLore: Record<ElementId, string> = {
    wood: t.elements.woodLore,
    fire: t.elements.fireLore,
    earth: t.elements.earthLore,
    metal: t.elements.metalLore,
    water: t.elements.waterLore,
  };

  return (
    <>
      <PageHeader
        eyebrow={t.elements.pageEyebrow}
        title={
          <>
            {t.elements.pageTitle1}
            <br />
            {t.elements.pageTitle2}
          </>
        }
        sub={t.elements.pageSub}
        kanjiBg="五"
      />

      <section
        style={{
          padding: '80px 32px',
          position: 'relative',
          background: `radial-gradient(ellipse at center, ${v.color}08, transparent 60%)`,
          transition: 'background 0.5s',
          overflow: 'hidden',
        }}
      >
        <div
          className="kanji-watermark"
          style={{
            fontSize: 720,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: v.color,
            opacity: 0.025,
          }}
        >
          {v.beast}
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          <div
            className="mandala-grid sf-grid"
            style={{
              gridTemplateColumns: '1fr 380px',
              gap: 64,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
              }}
            >
              <Mandala active={active} setActive={setActive} />
            </div>
            <div>
              <div
                className="t-mono"
                style={{
                  color: v.color,
                  fontSize: 11,
                  letterSpacing: '0.2em',
                  fontWeight: 700,
                }}
              >
                {t.elements.hovered}{v.beastNameZh}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-display)',
                  fontWeight: 700,
                  fontSize: 88,
                  color: v.color,
                  lineHeight: 1,
                  marginTop: 16,
                  letterSpacing: '-0.02em',
                  textShadow: `0 0 32px ${v.color}66`,
                }}
              >
                {v.beast}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-han)',
                  fontWeight: 700,
                  fontSize: 36,
                  color: 'var(--text-mute)',
                  marginTop: 8,
                }}
              >
                {v.k} · {v.beastName}
              </div>

              <div
                style={{
                  marginTop: 32,
                  padding: 20,
                  border: '1px solid var(--border-soft)',
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.3)',
                }}
              >
                <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 14 }}>
                  {t.elements.legendTitle}
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div className="sf-flex sf-items-center sf-gap-3">
                    <svg width={32} height={14}>
                      <path d="M 2 7 Q 16 1, 30 7" fill="none" stroke="var(--gold)" strokeWidth="2" />
                    </svg>
                    <span
                      className="t-mono"
                      style={{ fontSize: 11, color: 'var(--text)' }}
                    >
                      {t.elements.generatesFlow}
                    </span>
                  </div>
                  <div className="sf-flex sf-items-center sf-gap-3">
                    <svg width={32} height={14}>
                      <line x1="2" y1="7" x2="30" y2="7" stroke="var(--blood)" strokeWidth="2" strokeDasharray="4 3" />
                    </svg>
                    <span
                      className="t-mono"
                      style={{ fontSize: 11, color: 'var(--text)' }}
                    >
                      {t.elements.overcomesFlow}
                    </span>
                  </div>
                  <div
                    className="sf-flex sf-items-center sf-gap-3"
                    style={{
                      marginTop: 6,
                      paddingTop: 10,
                      borderTop: '1px solid var(--border-soft)',
                    }}
                  >
                    <span
                      className="t-mono"
                      style={{ fontSize: 10, color: 'var(--text-mute)' }}
                    >
                      {t.elements.hoverHint}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <SectionHead
          eyebrow={t.elements.twoCyclesEyebrow}
          title={t.elements.twoCyclesTitle}
          sub={t.elements.twoCyclesSub}
          align="center"
        />
        <div
          className="cycles-grid sf-grid"
          style={{ gridTemplateColumns: '1fr 1fr', gap: 28 }}
        >
          {[
            {
              kanji: '生',
              en: t.elements.generatesLabel,
              color: 'var(--wood)',
              flow: t.elements.generatesFlowStr,
              desc: t.elements.generatesDesc,
              effect: t.elements.generatesEffect,
            },
            {
              kanji: '剋',
              en: t.elements.overcomesLabel,
              color: 'var(--blood)',
              flow: t.elements.overcomesFlowStr,
              desc: t.elements.overcomesDesc,
              effect: t.elements.overcomesEffect,
            },
          ].map((c, i) => (
            <div
              key={i}
              className="panel"
              style={{ padding: 36, position: 'relative', overflow: 'hidden' }}
            >
              <div
                className="kanji-watermark"
                style={{
                  fontSize: 320,
                  top: -80,
                  right: -60,
                  color: c.color,
                  opacity: 0.06,
                }}
              >
                {c.kanji}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 14,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${c.color}33, transparent)`,
                    border: `1px solid ${c.color}`,
                    display: 'grid',
                    placeItems: 'center',
                    color: c.color,
                    fontFamily: 'var(--f-han)',
                    fontWeight: 900,
                    fontSize: 32,
                  }}
                >
                  {c.kanji}
                </div>
                <div>
                  <div
                    className="t-mono"
                    style={{
                      fontSize: 11,
                      color: c.color,
                      letterSpacing: '0.2em',
                      fontWeight: 700,
                    }}
                  >
                    {c.en}
                  </div>
                  <div
                    className="t-mono"
                    style={{ fontSize: 16, color: 'var(--text)', marginTop: 6 }}
                  >
                    {c.flow}
                  </div>
                </div>
              </div>
              <p
                className="muted"
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  marginTop: 22,
                  marginBottom: 16,
                  position: 'relative',
                }}
              >
                {c.desc}
              </p>
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-soft)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 12,
                  color: c.color,
                  fontWeight: 700,
                  position: 'relative',
                }}
              >
                ★ {c.effect}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead
          eyebrow={t.elements.altarsEyebrow}
          title={t.elements.altarsTitle}
          sub={t.elements.altarsSub}
          align="center"
        />
        <div style={{ display: 'grid', gap: 24 }}>
          {ALTAR_ORDER.map((el) => (
            <ElementAltar
              key={el}
              el={el}
              role={altarRole[el]}
              stats={ALTAR_STATS[el]}
              lore={altarLore[el]}
            />
          ))}
        </div>
      </Section>

    </>
  );
}
