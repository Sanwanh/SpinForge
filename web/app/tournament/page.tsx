'use client';

import { motion } from 'framer-motion';
import { useT } from '@/lib/i18n';

export default function TournamentPage() {
  const t = useT();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{t.tournament.title}</h1>
        <p className="text-sm text-gray-400">{t.tournament.subtitle}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-gray-800 bg-surface-overlay py-20"
      >
        <div className="mb-4 text-5xl opacity-30">🏆</div>
        <h2 className="mb-2 text-lg font-bold text-white">
          {t.tournament.comingSoon}
        </h2>
        <p className="mb-6 max-w-md text-center text-sm text-gray-400">
          {t.tournament.comingSoonDesc}
        </p>
      </motion.div>

      {/* Tournament rules */}
      <div className="card">
        <h3 className="mb-2 text-sm font-bold text-gray-400">{t.tournament.rulesTitle}</h3>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>- {t.tournament.rule1}</li>
          <li>- {t.tournament.rule2}</li>
          <li>- {t.tournament.rule3}</li>
          <li>- {t.tournament.rule4}</li>
        </ul>
      </div>

      {/* Prize pool info */}
      <div className="card">
        <h3 className="mb-2 text-sm font-bold text-gray-400">{t.tournament.prizePool}</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-rarity-legendary">500 SPARK</p>
            <p className="text-xs text-gray-500">{t.tournament.firstPlace}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-300">250 SPARK</p>
            <p className="text-xs text-gray-500">{t.tournament.secondPlace}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-400">100 SPARK</p>
            <p className="text-xs text-gray-500">{t.tournament.thirdPlace}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
