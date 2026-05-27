'use client';

import * as React from 'react';
import Link from 'next/link';
import { Beyblade } from '@/components/design/Beyblade';
import {
  Corners,
  Eyebrow,
  PageHeader,
  Section,
  Tag,
} from '@/components/design/atoms';
import { ELEMENT_MAP, type ElementId } from '@/components/design/tokens';
import { useT } from '@/lib/i18n';

function LaunchMeter() {
  const t = useT();
  const [power, setPower] = React.useState(0);
  const [locked, setLocked] = React.useState<number | null>(null);
  const dirRef = React.useRef(1);

  React.useEffect(() => {
    if (locked !== null) return;
    const id = setInterval(() => {
      setPower((p) => {
        let next = p + dirRef.current * 2.4;
        if (next >= 100) { next = 100; dirRef.current = -1; }
        if (next <= 0) { next = 0; dirRef.current = 1; }
        return next;
      });
    }, 16);
    return () => clearInterval(id);
  }, [locked]);

  const zoneColor = (p: number) =>
    p < 30 ? 'var(--text-mute)'
    : p < 55 ? 'var(--rare)'
    : p < 75 ? 'var(--earth)'
    : p < 88 ? 'var(--wood)'
    : p < 95 ? 'var(--gold)'
    :          'var(--blood)';

  const verdict = (p: number) =>
      p < 30 ? { label: t.battle.weak,     color: 'var(--text-mute)' }
    : p < 55 ? { label: t.battle.average,  color: 'var(--rare)' }
    : p < 75 ? { label: t.battle.strong,   color: 'var(--earth)' }
    : p < 88 ? { label: t.battle.great,    color: 'var(--wood)' }
    : p < 95 ? { label: t.battle.perfect,  color: 'var(--gold)' }
    :          { label: t.battle.overload, color: 'var(--blood)' };

  const displayed = locked ?? power;
  const am = displayed / 50;
  const v = verdict(displayed);

  return (
    <div
      className="panel"
      style={{ padding: 36, position: 'relative', overflow: 'hidden' }}
    >
      <Corners color={v.color} />
      <div
        className="sf-flex sf-justify-between sf-items-center"
        style={{ marginBottom: 28 }}
      >
        <div>
          <Eyebrow>{t.battle.launchMeterTitle}</Eyebrow>
          <div
            className="t-h3"
            style={{ marginTop: 6, fontSize: 28 }}
          >
            {t.battle.launchMeterSub}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="t-eyebrow" style={{ fontSize: 9 }}>
            {t.battle.angularMomentumLabel}
          </div>
          <div
            className="t-mono"
            style={{
              fontSize: 40,
              color: v.color,
              fontWeight: 700,
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            ×{am.toFixed(2)}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          height: 64,
          borderRadius: 8,
          background: 'var(--abyss)',
          border: '1px solid var(--border-soft)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg,
              var(--text-mute) 0%, var(--text-mute) 30%,
              var(--rare) 30%, var(--rare) 55%,
              var(--earth) 55%, var(--earth) 75%,
              var(--wood) 75%, var(--wood) 88%,
              var(--gold) 88%, var(--gold) 95%,
              var(--blood) 95%, var(--blood) 100%)`,
            opacity: 0.12,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${displayed}%`,
            background: `linear-gradient(90deg, transparent, ${zoneColor(displayed)})`,
            transition: locked !== null ? 'width 0.2s' : 'none',
            boxShadow: `inset 0 0 24px ${zoneColor(displayed)}44`,
          }}
        />
        {[30, 55, 75, 88, 95].map((t) => (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: `${t}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '88%',
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            color: 'var(--gold)',
            letterSpacing: '0.12em',
            fontWeight: 700,
          }}
        >
          SWEET
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--f-mono)',
            fontSize: 28,
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 0 12px rgba(0,0,0,0.8)',
          }}
        >
          {Math.round(displayed)}
        </div>
      </div>

      <div
        className="sf-flex sf-justify-between"
        style={{
          marginTop: 8,
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          color: 'var(--text-dim)',
        }}
      >
        <span>0</span>
        <span>30</span>
        <span>55</span>
        <span>75</span>
        <span>88</span>
        <span>95</span>
        <span>100</span>
      </div>

      <div
        className="sf-flex sf-justify-between sf-items-center"
        style={{ marginTop: 28 }}
      >
        <div>
          <div className="t-eyebrow" style={{ fontSize: 10 }}>
            {t.battle.resultLabel}
          </div>
          <div
            style={{
              fontFamily: 'var(--f-display)',
              fontWeight: 700,
              fontSize: 36,
              color: v.color,
              lineHeight: 1,
              marginTop: 6,
              textShadow: locked !== null ? `0 0 24px ${v.color}88` : 'none',
            }}
          >
            {v.label}
          </div>
        </div>
        <div>
          {locked === null ? (
            <button className="btn btn-battle" onClick={() => setLocked(power)}>
              {t.battle.lockAndLaunch}
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => setLocked(null)}>
              {t.battle.reset}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: '1px solid var(--border-soft)',
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          color: 'var(--text-dim)',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: 'var(--gold)' }}>→</span> {t.battle.helperPower}
        <br />
        <span style={{ color: 'var(--gold)' }}>→</span> {t.battle.helperPerfect}
        <br />
        <span style={{ color: 'var(--gold)' }}>→</span> {t.battle.helperLong}
      </div>
    </div>
  );
}

interface TeamSlotProps {
  rotor: string;
  el: ElementId;
  name: string;
  code: string;
  role: string;
  spinSpeed?: number;
}

function TeamSlot({ rotor, el, name, code, role, spinSpeed = 1 }: TeamSlotProps) {
  const v = ELEMENT_MAP[el];
  return (
    <div
      className="panel"
      style={{
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        border: `1px solid ${v.color}33`,
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <Beyblade size={92} element={el} spinSpeed={spinSpeed} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="t-mono"
          style={{
            fontSize: 10,
            color: v.color,
            letterSpacing: '0.1em',
          }}
        >
          {role} · {rotor}
        </div>
        <div
          style={{
            fontFamily: 'var(--f-ui)',
            fontWeight: 800,
            fontSize: 18,
            marginTop: 4,
            lineHeight: 1.1,
          }}
        >
          {name}
        </div>
        <div
          className="t-mono"
          style={{
            fontSize: 11,
            color: 'var(--text-dim)',
            marginTop: 4,
          }}
        >
          {code}
        </div>
      </div>
    </div>
  );
}

function VS() {
  return (
    <div
      style={{
        width: 96,
        height: 96,
        borderRadius: '50%',
        border: '1px solid var(--gold)',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(circle, rgba(212,175,55,0.2), transparent)',
        boxShadow: '0 0 28px rgba(212,175,55,0.3)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-display)',
          fontWeight: 700,
          fontSize: 32,
          color: 'var(--gold)',
        }}
      >
        VS
      </span>
    </div>
  );
}

export default function BattlePage() {
  const t = useT();
  const winConditions = [
    { kanji: '停', en: t.battle.spinFinishLabel,  desc: t.battle.spinFinishDesc,  color: 'var(--rare)',  pts: '+1' },
    { kanji: '界', en: t.battle.ringOutLabel,     desc: t.battle.ringOutDesc,     color: 'var(--earth)', pts: '+2' },
    { kanji: '爆', en: t.battle.burstFinishLabel, desc: t.battle.burstFinishDesc, color: 'var(--blood)', pts: '+3' },
  ];
  return (
    <>
      <PageHeader
        eyebrow={t.battle.pageEyebrow}
        title={
          <>
            {t.battle.pageTitle1}
            <br />
            {t.battle.pageTitle2}
          </>
        }
        sub={t.battle.pageSub}
        kanjiBg="戰"
        accent="var(--blood)"
      />

      <Section>
        <div
          className="battle-lineup sf-grid"
          style={{
            gridTemplateColumns: '1fr auto 1fr',
            gap: 40,
            alignItems: 'center',
            marginBottom: 80,
          }}
        >
          <div>
            <div
              className="sf-flex sf-items-center sf-gap-3"
              style={{ marginBottom: 18 }}
            >
              <Tag color="var(--gold)">{t.battle.playerA}</Tag>
              <span
                className="t-mono"
                style={{ fontSize: 11, color: 'var(--text-mute)' }}
              >
                0xA1...8F4D
              </span>
            </div>
            <div className="sf-grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
              <TeamSlot rotor="R1" el="fire"  name="BLAZE CORE" code="0x89af · #1024" role={t.battle.attackRole}  spinSpeed={0.95} />
              <TeamSlot rotor="R2" el="metal" name="TIGER FANG" code="0x7b2c · #0512" role={t.battle.defenseRole} spinSpeed={1.1} />
              <TeamSlot rotor="R3" el="wood"  name="VINE WHIP"  code="0x6d33 · #2104" role={t.battle.staminaRole} spinSpeed={0.8} />
            </div>
          </div>
          <VS />
          <div>
            <div
              className="sf-flex sf-items-center sf-gap-3"
              style={{ marginBottom: 18, justifyContent: 'flex-end' }}
            >
              <span
                className="t-mono"
                style={{ fontSize: 11, color: 'var(--text-mute)' }}
              >
                0xC2...3A91
              </span>
              <Tag color="var(--blood)">{t.battle.playerB}</Tag>
            </div>
            <div className="sf-grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
              <TeamSlot rotor="R1" el="water" name="ABYSS SHELL"   code="0x4a8f · #0089" role={t.battle.staminaRole} spinSpeed={1.0} />
              <TeamSlot rotor="R2" el="earth" name="STONE EMPEROR" code="0x2b91 · #0420" role={t.battle.defenseRole} spinSpeed={0.85} />
              <TeamSlot rotor="R3" el="fire"  name="EMBER STRIKER" code="0xf30d · #1188" role={t.battle.attackRole}  spinSpeed={1.2} />
            </div>
          </div>
        </div>

        <div
          className="battle-bottom sf-grid"
          style={{ gridTemplateColumns: '1.2fr 1fr', gap: 32 }}
        >
          <LaunchMeter />
          <div className="panel" style={{ padding: 32 }}>
            <Eyebrow>{t.battle.winConditions}</Eyebrow>
            <h3 className="t-h3" style={{ marginTop: 8, marginBottom: 20 }}>
              {t.battle.threeWaysVictory}
            </h3>
            <div style={{ display: 'grid', gap: 0 }}>
              {winConditions.map((w, i) => (
                <div
                  key={i}
                  className="sf-flex sf-items-center sf-gap-4"
                  style={{
                    padding: '18px 0',
                    borderTop: i > 0 ? '1px solid var(--border-soft)' : undefined,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: `${w.color}22`,
                      border: `1px solid ${w.color}`,
                      display: 'grid',
                      placeItems: 'center',
                      color: w.color,
                      fontFamily: 'var(--f-han)',
                      fontWeight: 900,
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    {w.kanji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      className="t-mono"
                      style={{
                        fontSize: 12,
                        color: w.color,
                        letterSpacing: '0.1em',
                        fontWeight: 700,
                      }}
                    >
                      {w.en}
                    </div>
                    <div
                      className="muted"
                      style={{ fontSize: 12, marginTop: 4 }}
                    >
                      {w.desc}
                    </div>
                  </div>
                  <div
                    className="t-mono"
                    style={{
                      fontSize: 20,
                      color: w.color,
                      fontWeight: 700,
                    }}
                  >
                    {w.pts}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid var(--border-soft)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div className="t-eyebrow" style={{ fontSize: 9 }}>
                  {t.battle.bestOf}
                </div>
                <div
                  className="t-mono"
                  style={{ fontSize: 18, marginTop: 2 }}
                >
                  3 / 5
                </div>
              </div>
              <Link href="/tournament" className="btn btn-battle">
                {t.battle.enterArena}
              </Link>
            </div>
          </div>
        </div>

        <div
          className="panel"
          style={{
            marginTop: 32,
            padding: 24,
            borderColor: 'rgba(212,175,55,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div className="sf-flex sf-items-center sf-gap-3">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--wood)',
                boxShadow: '0 0 8px var(--wood)',
                animation: 'float-y 1.2s ease-in-out infinite',
              }}
            />
            <div>
              <div
                className="t-mono"
                style={{
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  letterSpacing: '0.15em',
                }}
              >
                {t.battle.onCompletion}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                <span style={{ color: 'var(--text-mute)' }}>0x</span>
                <span style={{ color: 'var(--gold)' }}>3f7a89c2</span>
                <span style={{ color: 'var(--text-mute)' }}>...e2d4 · {t.battle.battleRecordWritten}</span>
              </div>
            </div>
          </div>
          <div
            className="sf-flex sf-gap-4"
            style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
          >
            <span>
              <span style={{ color: 'var(--text-dim)' }}>gas:</span> 0.00021 SUI
            </span>
            <span>
              <span style={{ color: 'var(--text-dim)' }}>finality:</span> 2.1s
            </span>
          </div>
        </div>
      </Section>
    </>
  );
}
