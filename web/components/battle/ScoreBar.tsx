'use client';

import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';

interface ScoreBarProps {
  scoreA: number;
  scoreB: number;
  playerAName: string;
  playerBName: string;
  target?: number;
}

export function ScoreBar({
  scoreA,
  scoreB,
  playerAName,
  playerBName,
  target = 7,
}: ScoreBarProps) {
  const t = useT();
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-raised px-6 py-3">
      {/* Player A */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-400">{playerAName}</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={scoreA}
            initial={{ scale: 1.5, color: '#3B82F6' }}
            animate={{ scale: 1, color: '#FFFFFF' }}
            className="text-3xl font-black tabular-nums"
          >
            {scoreA}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs text-gray-600 uppercase tracking-widest">{t.battle.vs}</span>
        <span className="text-[10px] text-gray-700">First to {target}</span>
      </div>

      {/* Player B */}
      <div className="flex items-center gap-3">
        <AnimatePresence mode="wait">
          <motion.span
            key={scoreB}
            initial={{ scale: 1.5, color: '#F97316' }}
            animate={{ scale: 1, color: '#FFFFFF' }}
            className="text-3xl font-black tabular-nums"
          >
            {scoreB}
          </motion.span>
        </AnimatePresence>
        <span className="text-sm font-medium text-gray-400">{playerBName}</span>
      </div>

      {/* Progress indicators */}
      <div className="absolute inset-x-0 bottom-0 flex h-1">
        <div
          className="bg-brand-blue transition-all duration-500"
          style={{ width: `${(scoreA / target) * 50}%` }}
        />
        <div className="flex-1" />
        <div
          className="bg-brand-orange transition-all duration-500"
          style={{ width: `${(scoreB / target) * 50}%` }}
        />
      </div>
    </div>
  );
}
