'use client';

import { motion } from 'framer-motion';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useT } from '@/lib/i18n';

export default function MarketPage() {
  const account = useCurrentAccount();
  const t = useT();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{t.market.title}</h1>
        <p className="text-sm text-gray-400">{t.market.subtitle}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-gray-800 bg-surface-overlay py-20"
      >
        <div className="mb-4 text-5xl opacity-30">🏪</div>
        <h2 className="mb-2 text-lg font-bold text-white">
          {t.market.comingSoon}
        </h2>
        <p className="mb-6 max-w-md text-center text-sm text-gray-400">
          {t.market.comingSoonDesc}
        </p>
        <a
          href="/collection"
          className="btn-primary rounded-xl px-6 py-2.5 text-sm"
        >
          {t.market.viewCollection}
        </a>
      </motion.div>
    </div>
  );
}
