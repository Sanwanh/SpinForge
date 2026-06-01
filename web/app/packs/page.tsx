'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RARITY_LABELS, SPIRIT_BEASTS, ELEMENT_COLORS, type Rarity, type Element } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import { useSpark } from '@/hooks/useSpark';
import { useInventory } from '@/hooks/useInventory';
import { useGameUser } from '@/hooks/useGameUser';
import { api } from '@/lib/api-fetch';
import { toPartObject, type InventoryResponse } from '@/lib/inventory-types';
import { PageHeader, Section, Corners } from '@/components/design/atoms';
import { useGuest } from '@/lib/guest';
import { GuestEntry } from '@/components/shared/Guest';

const PACK_COST = 100;

function SparkInfoCard({
  sparkBalance,
  isZh,
  t,
  onClaimed,
}: {
  sparkBalance: string;
  isZh: boolean;
  t: ReturnType<typeof useT>;
  onClaimed: () => void;
}) {
  const bal = Number(sparkBalance);
  const affordable = Math.floor(bal / PACK_COST);
  const enoughForOne = affordable >= 1;
  const need = enoughForOne ? 0 : PACK_COST - bal;

  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleClaim = useCallback(async () => {
    if (claiming) return;
    setClaiming(true);
    setClaimMsg(null);
    try {
      const res = await api('/api/claim-starter', {});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClaimMsg({ ok: false, text: data.error || t.packs.starterClaimErr });
      } else {
        setClaimMsg({ ok: true, text: t.packs.starterClaimedOk });
        onClaimed();
      }
    } catch {
      setClaimMsg({ ok: false, text: t.packs.starterClaimErr });
    } finally {
      setClaiming(false);
    }
  }, [claiming, t, onClaimed]);

  return (
    <div
      className="panel"
      style={{
        padding: 28,
        position: 'relative',
        border: enoughForOne ? '1px solid var(--gold)' : '1px solid var(--blood)',
        boxShadow: enoughForOne
          ? '0 0 32px rgba(212,175,55,0.12)'
          : '0 0 24px rgba(255,51,51,0.12)',
        marginBottom: 32,
      }}
    >
      <Corners color={enoughForOne ? 'var(--gold)' : 'var(--blood)'} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 24,
          alignItems: 'center',
          marginBottom: 22,
        }}
      >
        <div>
          <div
            className="t-mono"
            style={{
              fontSize: 10,
              color: 'var(--text-dim)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {t.packs.yourSpark}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span
              className="text-gradient"
              style={{
                fontFamily: 'var(--f-display)',
                fontWeight: 700,
                fontSize: 56,
                lineHeight: 1,
              }}
            >
              {Number(sparkBalance).toLocaleString()}
            </span>
            <span className="t-mono" style={{ fontSize: 14, color: 'var(--gold)' }}>
              SPARK
            </span>
          </div>
          <div
            className="t-mono"
            style={{ marginTop: 8, fontSize: 12, color: 'var(--text-mute)' }}
          >
            {t.packs.costPerPack}
          </div>
        </div>

        <div
          style={{
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
          }}
        >
          {enoughForOne ? (
            <>
              <div
                className="t-mono"
                style={{
                  fontSize: 11,
                  color: 'var(--wood)',
                  letterSpacing: '0.12em',
                }}
              >
                ✓ {t.packs.canAfford
                  .replace('{n}', String(affordable))
                  .replace('{s}', affordable === 1 ? '' : 's')}
              </div>
              <div
                className="t-mono"
                style={{ fontSize: 12, color: 'var(--text-mute)' }}
              >
                {sparkBalance} ÷ 100
              </div>
            </>
          ) : (
            <>
              <div
                className="t-mono"
                style={{
                  fontSize: 11,
                  color: 'var(--blood)',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                }}
              >
                ✗ {t.packs.cannotAfford}
              </div>
              <div className="t-mono" style={{ fontSize: 12, color: 'var(--text-mute)' }}>
                {t.packs.needMoreSpark.replace('{n}', String(need))}
              </div>
            </>
          )}
        </div>
      </div>

      {!enoughForOne && (
        <div style={{ marginBottom: 18 }}>
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px 0', fontSize: 14, justifyContent: 'center' }}
          >
            {claiming ? t.packs.claiming : t.packs.claimStarter}
          </button>
          <div
            className="t-mono"
            style={{
              marginTop: 8,
              fontSize: 10,
              color: 'var(--text-dim)',
              textAlign: 'center',
              letterSpacing: '0.1em',
            }}
          >
            {t.packs.onceOnly}
          </div>
          {claimMsg && (
            <div
              className="t-mono"
              style={{
                marginTop: 10,
                fontSize: 12,
                textAlign: 'center',
                color: claimMsg.ok ? 'var(--wood)' : 'var(--blood)',
                padding: 10,
                borderRadius: 6,
                border: `1px solid ${claimMsg.ok ? 'rgba(0,255,136,0.3)' : 'rgba(255,51,51,0.3)'}`,
                background: claimMsg.ok ? 'rgba(0,255,136,0.06)' : 'rgba(255,51,51,0.08)',
              }}
            >
              {claimMsg.text}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
          paddingTop: 18,
          borderTop: '1px solid var(--border-soft)',
        }}
        className="spark-info-grid"
      >
        <SparkInfoColumn
          accent="var(--wood)"
          title={t.packs.howToEarnTitle}
          items={[t.packs.howToEarn1, t.packs.howToEarn2, t.packs.howToEarn3, t.packs.howToEarn4]}
        />
        <SparkInfoColumn
          accent="var(--gold)"
          title={t.packs.howToSpendTitle}
          items={[t.packs.howToSpend1, t.packs.howToSpend2, t.packs.howToSpend3, t.packs.howToSpend4]}
        />
      </div>

      <p
        className="muted"
        style={{
          marginTop: 16,
          fontSize: 12,
          lineHeight: 1.55,
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        {t.packs.spendInfoFooter}
      </p>
    </div>
  );
}

function SparkInfoColumn({
  accent,
  title,
  items,
}: {
  accent: string;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div
        className="t-mono"
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: accent,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {items.map((it, i) => (
          <li
            key={i}
            style={{
              fontSize: 13,
              color: 'var(--text-mute)',
              lineHeight: 1.45,
              display: 'flex',
              gap: 8,
              alignItems: 'baseline',
            }}
          >
            <span style={{ color: accent, fontFamily: 'var(--f-mono)', fontSize: 11, flexShrink: 0 }}>
              ›
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface RevealedCard {
  id: string;
  name: string;
  type: 'Blade' | 'Ratchet' | 'Bit';
  rarity: Rarity;
  spiritBeast?: number;
  element?: string;
  attack?: number;
  prongs?: number;
  height?: number;
  friction?: number;
  gearDiameter?: number;
}

const TYPE_ICONS: Record<string, string> = {
  Blade: '⚔️',
  Ratchet: '⚙️',
  Bit: '🔵',
};

const TYPE_KANJI: Record<string, string> = {
  Blade: '刃',
  Ratchet: '歯',
  Bit: '軸',
};

const RARITY_GLOW: Record<Rarity, string> = {
  Common: '',
  Rare: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
  Epic: 'shadow-[0_0_25px_rgba(147,51,234,0.6)]',
  Legendary: 'shadow-[0_0_30px_rgba(234,179,8,0.7)] animate-pulse',
};

const RARITY_BG: Record<Rarity, string> = {
  Common: 'from-gray-800 to-gray-900',
  Rare: 'from-blue-900/80 to-blue-950',
  Epic: 'from-purple-900/80 to-purple-950',
  Legendary: 'from-yellow-900/60 via-amber-900/40 to-yellow-950',
};

const RARITY_BORDER: Record<Rarity, string> = {
  Common: 'border-gray-600',
  Rare: 'border-blue-500',
  Epic: 'border-purple-500',
  Legendary: 'border-yellow-400',
};

const RARITY_TEXT: Record<Rarity, string> = {
  Common: 'text-gray-400',
  Rare: 'text-blue-400',
  Epic: 'text-purple-400',
  Legendary: 'text-yellow-400',
};

type Phase = 'idle' | 'opening' | 'burst' | 'revealing' | 'done';

// Map a part (objectId + Move fields) to a reveal card. `kind` comes from the
// classified object type; fields carry the on-chain stats.
function toRevealedCard(objectId: string, kind: string | null, fields: Record<string, unknown>): RevealedCard {
  let type: RevealedCard['type'] = 'Blade';
  if (kind === 'ratchet') type = 'Ratchet';
  else if (kind === 'bit') type = 'Bit';

  const rarity = (RARITY_LABELS[fields.rarity as number] ?? 'Common') as Rarity;
  const spiritBeast = type === 'Blade' ? (fields.spirit_beast as number | undefined) : undefined;
  const beast = spiritBeast !== undefined ? SPIRIT_BEASTS[spiritBeast] : undefined;

  let name = '';
  if (type === 'Blade') name = (fields.name as string) ?? 'Blade';
  else if (type === 'Ratchet') name = `${fields.prongs}-${fields.height}`;
  else name = (fields.name as string) ?? 'Bit';

  return {
    id: objectId,
    name,
    type,
    rarity,
    spiritBeast,
    element: beast?.element,
    attack: fields.attack as number,
    prongs: fields.prongs as number,
    height: fields.height as number,
    friction: fields.friction as number,
    gearDiameter: fields.gear_diameter as number,
  };
}

// After a pack opens, hydrate the freshly-minted part ids into reveal cards by
// reading the DB-backed inventory (which merges on-chain content/fields).
async function hydrateRevealCards(partIds: string[]): Promise<RevealedCard[]> {
  if (partIds.length === 0) return [];
  let byId = new Map<string, RevealedCard>();
  try {
    const res = await api('/api/inventory');
    if (res.ok) {
      const data = (await res.json()) as InventoryResponse;
      for (const item of data.items ?? []) {
        const part = toPartObject(item);
        if (!part) continue;
        byId.set(part.objectId, toRevealedCard(part.objectId, part.type, part.fields));
      }
    }
  } catch {
    byId = new Map();
  }
  return partIds.map(
    (id) => byId.get(id) ?? { id, name: 'New Part', type: 'Blade' as const, rarity: 'Common' as Rarity },
  );
}

export default function PacksPage() {
  const { user } = useGameUser();
  const { isGuest } = useGuest();
  const t = useT();
  const { formatted: sparkBalance, refetch: refetchSpark } = useSpark();
  const { refetch: refetchInventory } = useInventory();
  const [phase, setPhase] = useState<Phase>('idle');
  const [cards, setCards] = useState<RevealedCard[]>([]);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const handleOpenPack = useCallback(async () => {
    const isZh = t.nav.home === '首頁';
    if (!user) {
      setError(isZh ? '請先登入才能開卡包。' : 'Sign in to open packs.');
      return;
    }
    if (Number(sparkBalance) < PACK_COST) {
      setError(isZh ? '你還沒有足夠的 SPARK,先去領取。' : 'Not enough SPARK — claim some first.');
      return;
    }

    setError(null);
    setCards([]);
    setRevealIndex(-1);

    // Opening animation while the server reserves SPARK and mints the parts.
    setPhase('opening');
    await new Promise((r) => setTimeout(r, 1200));
    setPhase('burst');
    await new Promise((r) => setTimeout(r, 700));

    try {
      // Session-authenticated: identity + SPARK charge are server-side. No wallet
      // payment step — the DB ledger is debited via reserve/settle on the server.
      const res = await api('/api/open-pack', {});
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? (isZh ? '開卡包失敗。' : 'Pack open failed.'));
        setPhase('idle');
        return;
      }

      await new Promise((r) => setTimeout(r, 500));
      const details: RevealedCard[] = await hydrateRevealCards(data.partIds ?? []);
      setCards(details);
      setPhase('revealing');

      for (let i = 0; i < details.length; i++) {
        await new Promise((r) => setTimeout(r, 700));
        setRevealIndex(i);
      }

      await new Promise((r) => setTimeout(r, 400));
      setPhase('done');
      refetchSpark();
      refetchInventory();
    } catch {
      setError('Network error');
      setPhase('idle');
    }
  }, [user, t, sparkBalance, refetchSpark, refetchInventory]);

  if (!user && !isGuest) {
    return (
      <>
        <PageHeader
          eyebrow={t.packs.pageEyebrow}
          title={
            <>
              {t.packs.pageTitle1}
              <br />
              <span style={{ color: 'var(--gold)' }}>{t.packs.pageTitle2}</span>
            </>
          }
          sub={t.packs.pageSub}
          kanjiBg="鑄"
        />
        <Section>
          <div
            className="panel"
            style={{
              padding: 64,
              textAlign: 'center',
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            <p className="muted" style={{ fontSize: 16, lineHeight: 1.6, marginTop: 0, marginBottom: 24 }}>
              {t.packs.connectPrompt}
            </p>
            <GuestEntry />
          </div>
        </Section>
      </>
    );
  }

  const isZh = t.nav.home === '首頁';

  return (
    <>
      <PageHeader
        eyebrow={t.packs.pageEyebrow}
        title={
          <>
            {t.packs.standardPack}
            <br />
            <span style={{ color: 'var(--gold)' }}>{t.packs.randomParts}</span>
          </>
        }
        sub={t.packs.pageSub}
        kanjiBg="鑄"
      />

      <div style={{ position: 'relative', minHeight: '60vh', padding: '60px 32px' }}>
        {/* Background particles during opening */}
        {(phase === 'opening' || phase === 'burst') && (
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 rounded-full"
                style={{ background: 'var(--gold)' }}
                initial={{
                  x: '50vw', y: '50vh', scale: 0, opacity: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 1.5, delay: Math.random() * 0.8, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}

        <div
          className="relative z-10"
          style={{ maxWidth: 760, margin: '0 auto' }}
        >

        {/* SPARK balance + education panel — only when not actively in a reveal */}
        {(phase === 'idle' || phase === 'opening' || phase === 'burst') && (
          user ? (
            <SparkInfoCard
              sparkBalance={sparkBalance}
              isZh={isZh}
              t={t}
              onClaimed={() => {
                refetchSpark();
                refetchInventory();
              }}
            />
          ) : (
            <div className="panel" style={{ padding: 28, marginBottom: 32, textAlign: 'center' }}>
              <Corners color="var(--gold)" />
              <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 10 }}>
                {isZh ? '訪客預覽' : 'Guest preview'}
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, margin: '0 auto', maxWidth: 460 }}>
                {isZh
                  ? '每包 100 SPARK,開出 5 個隨機零件(刀刃 / 棘輪 / 軸尖)。登入後可領取 SPARK 並開包。'
                  : 'Each pack is 100 SPARK and yields 5 random parts (Blade / Ratchet / Bit). Sign in to claim SPARK and open packs.'}
              </p>
            </div>
          )
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel"
            style={{
              padding: 14,
              marginBottom: 18,
              borderColor: 'var(--blood)',
              background: 'rgba(255,51,51,0.08)',
              color: 'var(--blood)',
              fontSize: 13,
              fontFamily: 'var(--f-mono)',
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Pack Card (idle / opening / burst) */}
        {(phase === 'idle' || phase === 'opening' || phase === 'burst') && (
          <div className="flex flex-col items-center gap-8 pt-8">
            <motion.div
              className="relative cursor-pointer select-none"
              whileHover={phase === 'idle' ? { scale: 1.05 } : {}}
              whileTap={phase === 'idle' ? { scale: 0.97 } : {}}
              onClick={phase === 'idle' ? handleOpenPack : undefined}
              animate={
                phase === 'opening'
                  ? { rotateY: [0, 5, -5, 3, -3, 0], scale: [1, 1.02, 1, 1.03, 1] }
                  : phase === 'burst'
                    ? { scale: [1, 1.3, 0], opacity: [1, 1, 0], rotateY: [0, 180] }
                    : {}
              }
              transition={
                phase === 'opening'
                  ? { duration: 1.5, repeat: 0 }
                  : phase === 'burst'
                    ? { duration: 0.6, ease: 'easeIn' }
                    : {}
              }
            >
              {/* Pack visual */}
              <div
                className="relative flex h-72 w-52 flex-col items-center justify-center overflow-hidden rounded-2xl border-2"
                style={{
                  borderColor: 'rgba(212,175,55,0.5)',
                  background:
                    'linear-gradient(160deg, var(--void), #1a1408 50%, var(--abyss))',
                }}
              >
                {/* Holographic shimmer */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(212,175,55,0.10), transparent, rgba(255,184,0,0.10))',
                  }}
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />

                {/* Pack content */}
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="text-6xl font-black text-gradient">S</div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">SpinForge</p>
                    <p className="text-[10px] text-gray-500">STANDARD PACK</p>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {['龍', '鳳', '虎', '龜'].map((k, i) => (
                      <span key={i} className="text-lg opacity-40">{k}</span>
                    ))}
                  </div>
                </div>

                {/* Bottom label */}
                <div className="absolute bottom-3 text-center">
                  <p className="text-[10px] text-gray-600">5 PARTS · 100 SPARK</p>
                </div>

                {phase === 'opening' && (
                  <motion.div
                    className="absolute inset-0 border-2 border-brand-blue rounded-2xl"
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                )}
              </div>
            </motion.div>

            {phase === 'idle' && (
              <motion.p
                className="text-sm text-gray-500"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {t.packs.tapToOpen}
              </motion.p>
            )}
          </div>
        )}

        {/* Card Reveal */}
        {(phase === 'revealing' || phase === 'done') && cards.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Cards grid */}
            <div className="flex flex-wrap justify-center gap-4">
              <AnimatePresence>
                {cards.map((card, i) => {
                  const isRevealed = i <= revealIndex;
                  const beast = card.spiritBeast !== undefined ? SPIRIT_BEASTS[card.spiritBeast] : undefined;
                  const color = beast ? ELEMENT_COLORS[beast.element as Element] : undefined;

                  return (
                    <div key={card.id} className="perspective-1000" style={{ perspective: '1000px' }}>
                      {!isRevealed ? (
                        /* Card back */
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{
                            scale: 1,
                            opacity: 1,
                            rotateY: [0, 2, -2, 0],
                          }}
                          transition={{
                            scale: { duration: 0.3 },
                            rotateY: { duration: 1, repeat: Infinity },
                          }}
                          className="flex h-56 w-40 items-center justify-center rounded-xl border-2 border-gray-600 bg-gradient-to-br from-gray-800 to-gray-900"
                        >
                          <div className="text-center">
                            <span className="text-3xl opacity-30">?</span>
                            <motion.div
                              className="mt-2 h-0.5 w-8 mx-auto rounded bg-brand-blue"
                              animate={{ scaleX: [0, 1, 0] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                            />
                          </div>
                        </motion.div>
                      ) : (
                        /* Card front */
                        <motion.div
                          initial={{ rotateY: -180, scale: 0.5 }}
                          animate={{ rotateY: 0, scale: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 150,
                            damping: 18,
                          }}
                          className={`relative flex h-56 w-40 flex-col overflow-hidden rounded-xl border-2 bg-gradient-to-b ${RARITY_BG[card.rarity]} ${RARITY_BORDER[card.rarity]} ${RARITY_GLOW[card.rarity]}`}
                        >
                          {/* Card shine effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                            initial={{ x: '-100%' }}
                            animate={{ x: '200%' }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />

                          {/* Top: Type icon + rarity */}
                          <div className="flex items-center justify-between px-3 pt-2">
                            <span className="text-lg">{TYPE_ICONS[card.type]}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${RARITY_TEXT[card.rarity]}`}>
                              {card.rarity}
                            </span>
                          </div>

                          {/* Center: Spirit beast / type visual */}
                          <div className="flex flex-1 flex-col items-center justify-center gap-1">
                            {beast ? (
                              <div
                                className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                                style={{
                                  background: `radial-gradient(circle, ${color}30, transparent)`,
                                  border: `2px solid ${color}60`,
                                }}
                              >
                                {['龍', '鳳', '虎', '龜', '皇'][card.spiritBeast ?? 0]}
                              </div>
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-700/50 text-2xl">
                                {TYPE_KANJI[card.type]}
                              </div>
                            )}
                            <p className="mt-1 text-sm font-bold text-white">{card.name}</p>
                            <p className="text-[10px] text-gray-400">{card.type}</p>
                          </div>

                          {/* Bottom: Stats */}
                          <div className="border-t border-white/10 bg-black/30 px-3 py-2">
                            {card.type === 'Blade' && card.attack !== undefined && (
                              <div className="flex justify-between text-[10px]">
                                <span className="text-gray-500">ATK</span>
                                <span className="font-bold text-red-400">{card.attack}</span>
                              </div>
                            )}
                            {card.type === 'Ratchet' && (
                              <div className="flex justify-between text-[10px]">
                                <span className="text-gray-500">W / BR</span>
                                <span className="font-bold text-blue-400">{card.prongs}P {card.height}H</span>
                              </div>
                            )}
                            {card.type === 'Bit' && (
                              <div className="flex justify-between text-[10px]">
                                <span className="text-gray-500">FRC</span>
                                <span className="font-bold text-green-400">{card.friction}</span>
                              </div>
                            )}
                            <p className="mt-0.5 truncate text-[8px] text-gray-600">{card.id.slice(0, 16)}...</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Actions */}
            {phase === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <p className="text-sm text-gray-400">
                  {t.packs.gotParts.replace('{n}', String(cards.length))}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setPhase('idle'); setCards([]); setRevealIndex(-1); }}
                    className="btn btn-ghost"
                  >
                    {t.packs.openAnother}
                  </button>
                  <a
                    href="/collection"
                    className="btn btn-primary"
                  >
                    {t.packs.viewCollectionLink}
                  </a>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
        </div>
      </div>
    </>
  );
}
