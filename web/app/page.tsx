'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { useSparkBalance } from '@/hooks/useSparkBalance';
import { useInventory } from '@/hooks/useInventory';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { RANKS, SPIRIT_BEASTS } from '@/lib/constants';
import { SpiritBeastIcon } from '@/components/shared/SpiritBeastIcon';

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function StarterPackBanner({ address, onClaimed }: { address: string; onClaimed: () => void }) {
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
      if (!res.ok) {
        setError(data.error);
      } else {
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center"
      >
        <p className="text-lg font-bold text-green-400">{result}</p>
        <Link href="/packs" className="btn-primary mt-4 inline-block text-sm">
          {t.packs.openPack} →
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-brand-blue/30 bg-gradient-to-r from-brand-blue/10 to-brand-orange/10 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">
            {t.nav.home === '首頁' ? '🎁 領取新手禮包' : '🎁 Claim Starter Pack'}
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {t.nav.home === '首頁'
              ? '免費獲得 500 SPARK — 可以開 5 個卡包！'
              : 'Get 500 SPARK for free — enough for 5 packs!'}
          </p>
        </div>
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="btn-primary whitespace-nowrap px-6 py-3 text-base disabled:opacity-50"
        >
          {claiming
            ? (t.common.loading)
            : t.nav.home === '首頁' ? '立即領取' : 'Claim Now'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, displayName } = useAuth();
  const account = useCurrentAccount();
  const t = useT();
  const { formatted: sparkBalance, refetch: refetchSpark } = useSparkBalance();
  const { blades, ratchets, bits, beys, refetch: refetchInventory } = useInventory();

  const totalParts = blades.length + ratchets.length + bits.length;
  const showStarter = account && Number(sparkBalance) === 0 && totalParts === 0;

  const quickActions = [
    { href: '/collection', label: t.nav.collection, desc: t.home.viewParts },
    { href: '/workshop', label: t.nav.workshop, desc: t.home.assembleBeys },
    { href: '/deck', label: t.nav.deck, desc: t.home.buildDeck },
    { href: '/packs', label: t.nav.packs, desc: t.home.getNewParts },
    { href: '/market', label: t.nav.market, desc: t.home.tradeParts },
    { href: '/forge', label: t.nav.forge, desc: t.home.evolveAndFuse },
  ];

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h1 className="text-5xl font-black text-gradient">{t.home.title}</h1>
          <p className="text-lg text-gray-400">{t.home.subtitle}</p>
          <p className="text-sm text-gray-500">{t.home.connectPrompt}</p>
          <div className="flex justify-center gap-4 pt-4">
            {SPIRIT_BEASTS.slice(0, 4).map((beast) => (
              <SpiritBeastIcon key={beast.id} beastId={beast.id} size={48} />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{t.nav.home}</h1>
        <p className="text-sm text-gray-400">{t.home.welcome}{displayName}</p>
      </motion.div>

      {showStarter && (
        <StarterPackBanner
          address={account.address}
          onClaimed={() => { refetchSpark(); refetchInventory(); }}
        />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t.home.rank} value={RANKS[0].name} color={RANKS[0].color} />
        <StatCard label={t.home.wins} value="0" color="#10B981" />
        <StatCard label="SPARK" value={sparkBalance} color="#F97316" />
        <StatCard label={t.home.parts} value={String(totalParts)} color="#3B82F6" />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold text-white">{t.home.quickActions}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={action.href} className="card-hover block">
                <h3 className="text-sm font-bold text-white">{action.label}</h3>
                <p className="text-xs text-gray-500">{action.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold text-white">{t.home.recentMatches}</h2>
        <div className="card space-y-3">
          <p className="text-sm text-gray-500">{t.home.noMatches}</p>
          <Link href="/tournament" className="btn-primary inline-block text-sm">
            {t.common.findMatch}
          </Link>
        </div>
      </div>
    </div>
  );
}
