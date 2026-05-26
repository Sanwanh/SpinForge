'use client';

import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { RANKS, SPIRIT_BEASTS, ELEMENT_COLORS, type Element } from '@/lib/constants';
import { SpiritBeastIcon } from '@/components/shared/SpiritBeastIcon';

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, displayName } = useAuth();
  const t = useT();

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t.home.rank} value={RANKS[1].name} color={RANKS[1].color} />
        <StatCard label={t.home.wins} value="12" color="#10B981" />
        <StatCard label="SPARK" value="450" color="#F97316" />
        <StatCard label={t.home.parts} value="24" color="#3B82F6" />
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
