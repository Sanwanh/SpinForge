'use client';

import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useT } from '@/lib/i18n';

interface PhysicsHUDProps {
  angularMomentum: number;
  maxAM: number;
  burstIntegrity: number;
  maxBI: number;
  friction: number;
  mobility: number;
  gearRating: number;
  isDeathSpin?: boolean;
  side: 'left' | 'right';
}

function StatBar({
  label,
  value,
  max,
  color,
  warning = false,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  warning?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-400">{label}</span>
        <span className={clsx('font-mono tabular-nums', warning ? 'text-red-400 animate-pulse' : 'text-gray-300')}>
          {Math.round(value)} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-800">
        <motion.div
          className={clsx('h-full rounded-full', warning && 'animate-pulse')}
          style={{ backgroundColor: color }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function PhysicsHUD({
  angularMomentum,
  maxAM,
  burstIntegrity,
  maxBI,
  friction,
  mobility,
  gearRating,
  isDeathSpin = false,
  side,
}: PhysicsHUDProps) {
  const t = useT();
  const amPct = maxAM > 0 ? (angularMomentum / maxAM) * 100 : 0;

  return (
    <div className={clsx('w-full space-y-3 rounded-xl bg-surface-raised p-4', side === 'right' && 'text-right')}>
      <StatBar
        label={t.battle.angularMomentum}
        value={angularMomentum}
        max={maxAM}
        color={amPct < 20 ? '#EF4444' : '#3B82F6'}
        warning={isDeathSpin}
      />

      <StatBar
        label={t.battle.burstIntegrity}
        value={burstIntegrity}
        max={maxBI}
        color={burstIntegrity < maxBI * 0.3 ? '#F97316' : '#A855F7'}
        warning={burstIntegrity < maxBI * 0.2}
      />

      <div className="flex gap-4 text-xs text-gray-500">
        <span>FRC: <span className="text-gray-300">{friction}</span></span>
        <span>MOB: <span className="text-gray-300">{mobility}</span></span>
        {gearRating > 0 && (
          <span>GEAR: <span className="text-brand-orange">{gearRating}</span></span>
        )}
      </div>

      {isDeathSpin && (
        <div className="rounded-lg bg-red-500/10 px-2 py-1 text-center text-xs font-bold text-red-400">
          {t.battle.deathSpin}
        </div>
      )}
    </div>
  );
}
