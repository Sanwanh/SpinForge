'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { RARITY_LABELS, SPIRIT_BEASTS, ELEMENT_COLORS, PACKAGE_ID, type Rarity, type Element } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import { useSparkBalance } from '@/hooks/useSparkBalance';
import { useInventory } from '@/hooks/useInventory';

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

export default function PacksPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const t = useT();
  const { formatted: sparkBalance, refetch: refetchSpark } = useSparkBalance();
  const { refetch: refetchInventory } = useInventory();
  const [phase, setPhase] = useState<Phase>('idle');
  const [cards, setCards] = useState<RevealedCard[]>([]);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const fetchPartDetails = useCallback(async (partIds: string[]): Promise<RevealedCard[]> => {
    const results: RevealedCard[] = [];
    for (const id of partIds) {
      try {
        const obj = await client.getObject({ id, options: { showContent: true, showType: true } });
        const objType = obj.data?.type ?? '';
        const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields ?? {};

        let type: RevealedCard['type'] = 'Blade';
        if (objType.includes('::ratchet::')) type = 'Ratchet';
        else if (objType.includes('::bit::')) type = 'Bit';

        const rarity = RARITY_LABELS[fields.rarity as number] ?? 'Common';
        const spiritBeast = type === 'Blade' ? (fields.spirit_beast as number) : undefined;
        const beast = spiritBeast !== undefined ? SPIRIT_BEASTS[spiritBeast] : undefined;

        let name = '';
        if (type === 'Blade') name = (fields.name as string) ?? 'Blade';
        else if (type === 'Ratchet') name = `${fields.prongs}-${fields.height}`;
        else name = (fields.name as string) ?? 'Bit';

        results.push({
          id,
          name,
          type,
          rarity: rarity as Rarity,
          spiritBeast,
          element: beast?.element,
          attack: fields.attack as number,
          prongs: fields.prongs as number,
          height: fields.height as number,
          friction: fields.friction as number,
          gearDiameter: fields.gear_diameter as number,
        });
      } catch {
        results.push({ id, name: 'Mystery Part', type: 'Blade', rarity: 'Common' });
      }
    }
    return results;
  }, [client]);

  const handleOpenPack = useCallback(async () => {
    if (!account?.address) return;

    setPhase('opening');
    setError(null);
    setCards([]);
    setRevealIndex(-1);

    await new Promise((r) => setTimeout(r, 1500));
    setPhase('burst');
    await new Promise((r) => setTimeout(r, 800));

    try {
      const res = await fetch('/api/open-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account.address }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setPhase('idle');
        return;
      }

      await new Promise((r) => setTimeout(r, 500));
      const details = await fetchPartDetails(data.partIds ?? []);
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
  }, [account, fetchPartDetails, refetchSpark, refetchInventory]);

  if (!account) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">{t.packs.connectPrompt}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[80vh]">
      {/* Background particles during opening */}
      {(phase === 'opening' || phase === 'burst') && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-brand-blue"
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

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white">{t.packs.title}</h1>
          <p className="text-sm text-gray-400">{t.packs.contains}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1">
            <span className="text-xs text-gray-400">SPARK</span>
            <span className="text-sm font-bold text-brand-orange">{sparkBalance}</span>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
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
                  ? { duration: 1.5, repeat: Infinity }
                  : phase === 'burst'
                    ? { duration: 0.6, ease: 'easeIn' }
                    : {}
              }
            >
              {/* Pack visual */}
              <div className="relative flex h-72 w-52 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-brand-blue/50 bg-gradient-to-br from-gray-900 via-blue-950/50 to-gray-900">
                {/* Holographic shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/10 via-transparent to-brand-orange/10" />
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
                {t.nav.home === '首頁' ? '點擊卡包開啟' : 'Tap the pack to open'}
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
                  {t.nav.home === '首頁'
                    ? `✨ 獲得了 ${cards.length} 個零件！`
                    : `✨ Got ${cards.length} parts!`}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setPhase('idle'); setCards([]); setRevealIndex(-1); }}
                    className="rounded-xl border border-gray-600 px-6 py-2.5 text-sm font-medium text-gray-300 transition-all hover:border-brand-blue hover:text-white"
                  >
                    {t.nav.home === '首頁' ? '再開一包' : 'Open Another'}
                  </button>
                  <a
                    href="/collection"
                    className="btn-primary rounded-xl px-6 py-2.5 text-sm"
                  >
                    {t.nav.home === '首頁' ? '查看收藏庫 →' : 'View Collection →'}
                  </a>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
