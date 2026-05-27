'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { useSparkBalance } from '@/hooks/useSparkBalance';
import { useInventory } from '@/hooks/useInventory';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Beyblade } from '@/components/design/Beyblade';
import { Stat, Eyebrow, SectionHead, ElementGlyph, Tag } from '@/components/design/atoms';
import type { ElementId } from '@/components/design/tokens';

function HeroVisual() {
  const elements: ElementId[] = ['fire', 'water', 'wood', 'metal', 'earth'];
  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        minHeight: 520,
      }}
    >
      {/* trigram orbit */}
      <svg
        viewBox="-200 -200 400 400"
        style={{
          position: 'absolute',
          width: 580,
          height: 580,
          animation: 'spin 80s linear infinite',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        <circle
          cx="0"
          cy="0"
          r="180"
          fill="none"
          stroke="rgba(212,175,55,0.25)"
          strokeWidth="0.5"
          strokeDasharray="2 6"
        />
        <circle cx="0" cy="0" r="155" fill="none" stroke="rgba(212,175,55,0.18)" strokeWidth="0.5" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 360) / 8;
          const rad = (a * Math.PI) / 180;
          const x = Math.cos(rad - Math.PI / 2) * 180;
          const y = Math.sin(rad - Math.PI / 2) * 180;
          return (
            <g key={i} transform={`translate(${x}, ${y}) rotate(${a})`}>
              {[0, 1, 2].map((b) => (
                <rect
                  key={b}
                  x="-10"
                  y={-6 + b * 5}
                  width="20"
                  height="2.5"
                  fill="rgba(212,175,55,0.5)"
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* orbiting element chips — outer wrapper positions, inner wrapper animates */}
      {elements.map((el, i) => {
        const a = (i * 360) / 5 + 18;
        const rad = (a * Math.PI) / 180;
        const r = 260;
        // Round to avoid SSR/CSR hydration mismatch on float math
        const x = Math.round(Math.cos(rad - Math.PI / 2) * r * 100) / 100;
        const y = Math.round(Math.sin(rad - Math.PI / 2) * r * 100) / 100;
        return (
          <div
            key={el}
            style={{
              position: 'absolute',
              left: `calc(50% + ${x - 20}px)`,
              top: `calc(50% + ${y - 20}px)`,
              zIndex: 1,
            }}
          >
            <div
              style={{
                animation: 'float-y 3s ease-in-out infinite',
                animationDelay: `${i * 0.4}s`,
              }}
            >
              <ElementGlyph el={el} size={40} />
            </div>
          </div>
        );
      })}

      <Beyblade size={440} element="gold" spinSpeed={1.2} />

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          color: 'var(--text-dim)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Rotor · 0x89af · Blaze Core #1024
      </div>
    </div>
  );
}

function Hero({ ctas }: { ctas: React.ReactNode }) {
  const t = useT();
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        paddingTop: 80,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'var(--hero-bg)', zIndex: 0 }} />
      <div
        className="kanji-watermark"
        style={{
          fontSize: 720,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.04,
        }}
      >
        龍
      </div>

      <div
        className="hero-grid"
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'grid',
          gridTemplateColumns: '1.05fr 1fr',
          alignItems: 'center',
          gap: 48,
          maxWidth: 1280,
          width: '100%',
          padding: '60px 32px 80px',
        }}
      >
        <div>
          <div className="sf-flex sf-gap-3 sf-items-center" style={{ marginBottom: 24 }}>
            <Tag color="var(--gold)">
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--gold)',
                }}
              />
              Beta · Sui Testnet
            </Tag>
            <Tag color="var(--text-mute)">v0.4.2</Tag>
          </div>

          <h1
            className="t-display glow-text"
            style={{ fontSize: 'clamp(56px, 7.2vw, 104px)', margin: 0 }}
          >
            ANCIENT
            <br />
            <span className="text-gradient">STEEL.</span>
            <br />
            ON-CHAIN SPIN.
          </h1>

          <p
            className="muted"
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              maxWidth: 520,
              marginTop: 28,
              marginBottom: 36,
            }}
          >
            {t.home.heroSub}
            <br />
            <br />
            <span style={{ color: 'var(--text)' }}>
              {t.home.heroSubEn}
            </span>
          </p>

          <div className="sf-flex sf-gap-3" style={{ marginBottom: 56, flexWrap: 'wrap' }}>
            {ctas}
          </div>

          <div
            className="sf-grid"
            style={{
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
              paddingTop: 28,
              borderTop: '1px solid var(--border-soft)',
            }}
          >
            <Stat label="Rotors Minted" value="12,847" />
            <Stat label="Battles On-Chain" value="48,219" />
            <Stat label="Active Arenas" value="36" color="var(--gold)" />
            <Stat label="Season" value="01 / Speed" color="var(--rare)" />
          </div>
        </div>

        <HeroVisual />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          color: 'var(--text-dim)',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          zIndex: 3,
        }}
      >
        Scroll
        <div
          style={{
            width: 1,
            height: 28,
            background: 'linear-gradient(180deg, var(--gold), transparent)',
          }}
        />
      </div>

    </section>
  );
}

interface FeatureGroup {
  label: string;
  items: { id: string; title: string; k: string; desc: string; color: string; href: string }[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: '01 · Your Top, On-Chain',
    items: [
      { id: 'passport', title: 'Spin Passport', k: '證', desc: 'Register your physical top as a Sui Object with permanent battle history.', color: 'var(--gold)', href: '/passport' },
      { id: 'elements', title: 'Five Elements', k: '五', desc: 'Wu Xing combat triangle. Wood beats earth. Fire beats metal.', color: 'var(--wood)', href: '/elements' },
      { id: 'cards',    title: 'Cards & Parts', k: '卡', desc: 'Four rarity tiers. From Common to Legendary, each carries weight.', color: 'var(--epic)', href: '/collection' },
    ],
  },
  {
    label: '02 · Play',
    items: [
      { id: 'gacha',  title: 'Gacha', k: '鑄', desc: 'Open booster packs. Watch five parts emerge from elemental burst.', color: 'var(--gold)', href: '/packs' },
      { id: 'battle', title: 'Battle', k: '戰', desc: '3v3 on the real arena. Pre-launch power meter, on-chain result.', color: 'var(--blood)', href: '/tournament' },
      { id: 'forge',  title: 'Forge', k: '鍛', desc: 'Fuse two parts. Evolve one. Legendary tier unlocks skill slots.', color: 'var(--earth)', href: '/forge' },
    ],
  },
  {
    label: '03 · Economy',
    items: [
      { id: 'marketplace', title: 'Market',     k: '市', desc: 'The Spirit Bazaar. Trade rare parts, skill cards, arena fragments.', color: 'var(--rare)', href: '/market' },
      { id: 'tokenomics',  title: '$SPARK',     k: '幣', desc: 'The current that drives the spin. Earn, forge, stake, trade.', color: 'var(--gold)', href: '/tokenomics' },
      { id: 'tournament',  title: 'Tournament', k: '賽', desc: 'Weekend cups to global Forge Cup S1. Passport required.', color: 'var(--epic)', href: '/tournament' },
    ],
  },
];

function FeatureCard({
  item,
}: {
  item: FeatureGroup['items'][number];
}) {
  return (
    <Link
      href={item.href}
      className="feat-card"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--void)',
        border: '1px solid var(--border-soft)',
        borderRadius: 14,
        padding: 28,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.25s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = item.color;
        e.currentTarget.style.boxShadow = `0 12px 36px ${item.color}22`;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-soft)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        className="kanji-watermark"
        style={{
          fontSize: 220,
          top: -50,
          right: -40,
          color: item.color,
          opacity: 0.08,
        }}
      >
        {item.k}
      </div>

      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${item.color}22, transparent)`,
          border: `1px solid ${item.color}66`,
          display: 'grid',
          placeItems: 'center',
          color: item.color,
          fontFamily: 'var(--f-han)',
          fontWeight: 900,
          fontSize: 28,
          position: 'relative',
        }}
      >
        {item.k}
      </div>

      <div
        style={{
          fontFamily: 'var(--f-display)',
          fontWeight: 700,
          fontSize: 26,
          marginTop: 20,
          marginBottom: 10,
          lineHeight: 1,
          position: 'relative',
        }}
      >
        {item.title}
      </div>

      <p
        className="muted"
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          margin: 0,
          position: 'relative',
        }}
      >
        {item.desc}
      </p>

      <div
        className="t-eyebrow"
        style={{
          position: 'relative',
          marginTop: 20,
          fontSize: 10,
          color: item.color,
        }}
      >
        Open →
      </div>
    </Link>
  );
}

function FeatureMap() {
  const t = useT();
  return (
    <section
      style={{
        padding: '96px 32px',
        borderTop: '1px solid var(--border-soft)',
        background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.02), transparent)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SectionHead
          eyebrow={t.home.featureEyebrow}
          title={t.home.featureTitle}
          sub={t.home.featureSub}
          align="center"
        />

        {FEATURE_GROUPS.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 36 }}>
            <div
              className="t-eyebrow"
              style={{
                marginBottom: 18,
                fontSize: 11,
                color: 'var(--text-dim)',
                letterSpacing: '0.2em',
              }}
            >
              {g.label}
            </div>
            <div
              className="sf-grid feature-row"
              style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
            >
              {g.items.map((it) => (
                <FeatureCard key={it.id} item={it} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StarterPackBanner({
  address,
  onClaimed,
}: {
  address: string;
  onClaimed: () => void;
}) {
  const t = useT();
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else {
        setResult(data.message);
        onClaimed();
      }
    } catch {
      setError('Network error');
    } finally {
      setClaiming(false);
    }
  }, [address, onClaimed]);

  if (result) {
    return (
      <div
        className="panel"
        style={{
          padding: 24,
          textAlign: 'center',
          borderColor: 'var(--wood)',
          background:
            'linear-gradient(160deg, rgba(0,255,136,0.08), rgba(10,14,23,0.92))',
        }}
      >
        <p
          className="t-display"
          style={{ fontSize: 22, color: 'var(--wood)', margin: '0 0 16px' }}
        >
          {result}
        </p>
        <Link href="/packs" className="btn btn-primary">
          {t.packs.openPack} →
        </Link>
      </div>
    );
  }

  return (
    <div
      className="panel"
      style={{
        padding: 28,
        borderColor: 'var(--gold)',
        background:
          'linear-gradient(160deg, rgba(212,175,55,0.08), rgba(10,14,23,0.92))',
      }}
    >
      <div
        className="sf-flex sf-justify-between sf-items-center"
        style={{ gap: 24, flexWrap: 'wrap' }}
      >
        <div>
          <Eyebrow color="var(--gold)">{t.home.starterEyebrow}</Eyebrow>
          <h3
            className="t-h3"
            style={{ marginTop: 10, marginBottom: 6, fontSize: 22 }}
          >
            {t.home.starterTitleZh}
          </h3>
          <p className="muted" style={{ fontSize: 14, margin: 0 }}>
            {t.home.starterSubZh}
          </p>
        </div>
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="btn btn-primary"
        >
          {claiming ? t.common.loading : t.home.starterClaim}
        </button>
      </div>
      {error && (
        <p
          className="t-mono"
          style={{ marginTop: 12, color: 'var(--blood)', fontSize: 12 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function DashboardStrip() {
  const { displayName } = useAuth();
  const account = useCurrentAccount();
  const t = useT();
  const { formatted: sparkBalance, refetch: refetchSpark } = useSparkBalance();
  const { blades, ratchets, bits, refetch: refetchInventory } = useInventory();
  const totalParts = blades.length + ratchets.length + bits.length;
  const showStarter = account && Number(sparkBalance) === 0 && totalParts === 0;

  return (
    <section
      style={{
        position: 'relative',
        padding: '64px 32px',
        maxWidth: 1280,
        margin: '0 auto',
        borderTop: '1px solid var(--border-soft)',
      }}
    >
      <div className="sf-flex sf-items-center" style={{ gap: 16, marginBottom: 28 }}>
        <Eyebrow>{t.home.forgeOperator}</Eyebrow>
        <div
          className="t-mono"
          style={{ fontSize: 12, color: 'var(--text-mute)' }}
        >
          {t.home.welcome}
          <span style={{ color: 'var(--gold)' }}>{displayName}</span>
        </div>
      </div>

      {showStarter && account && (
        <div style={{ marginBottom: 24 }}>
          <StarterPackBanner
            address={account.address}
            onClaimed={() => {
              refetchSpark();
              refetchInventory();
            }}
          />
        </div>
      )}

      <div
        className="sf-grid"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
      >
        {[
          { label: 'SPARK Balance', value: sparkBalance, color: 'var(--gold)' },
          { label: 'Parts Owned', value: String(totalParts), color: 'var(--rare)' },
          { label: 'Wins', value: '0', color: 'var(--wood)' },
          { label: 'Rank', value: 'Initiate', color: 'var(--epic)' },
        ].map((c) => (
          <div key={c.label} className="panel" style={{ padding: 18 }}>
            <Stat label={c.label} value={c.value} color={c.color} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  const ctas = isAuthenticated ? (
    <>
      <Link href="/packs" className="btn btn-primary">
        Open Booster Pack →
      </Link>
      <Link href="/collection" className="btn btn-ghost">
        View Collection
      </Link>
    </>
  ) : (
    <>
      <Link href="/passport" className="btn btn-primary">
        Claim Spin Passport →
      </Link>
      <Link href="/tournament" className="btn btn-ghost">
        Watch Battle Demo
      </Link>
    </>
  );

  return (
    <>
      <Hero ctas={ctas} />
      {isAuthenticated && <DashboardStrip />}
      <FeatureMap />
    </>
  );
}
