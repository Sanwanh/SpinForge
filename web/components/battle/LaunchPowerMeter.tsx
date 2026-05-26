'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';

interface LaunchPowerMeterProps {
  onLaunch: (power: number) => void;
  disabled?: boolean;
}

const CHARGE_SPEED = 1.8;
const SWEET_SPOT_MIN = 75;
const SWEET_SPOT_MAX = 95;

export function LaunchPowerMeter({ onLaunch, disabled }: LaunchPowerMeterProps) {
  const t = useT();
  const isZh = t.nav.home === '首頁';
  const [phase, setPhase] = useState<'ready' | 'charging' | 'released'>('ready');
  const [power, setPower] = useState(0);
  const [direction, setDirection] = useState(1);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  const animate = useCallback(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const raw = (Math.sin(elapsed * CHARGE_SPEED * Math.PI) + 1) / 2;
    setPower(Math.round(raw * 100));
    animRef.current = requestAnimationFrame(animate);
  }, []);

  const handleStart = useCallback(() => {
    if (disabled || phase !== 'ready') return;
    setPhase('charging');
    startTimeRef.current = Date.now();
    animRef.current = requestAnimationFrame(animate);
  }, [disabled, phase, animate]);

  const handleRelease = useCallback(() => {
    if (phase !== 'charging') return;
    cancelAnimationFrame(animRef.current);
    setPhase('released');

    setTimeout(() => {
      onLaunch(power);
    }, 800);
  }, [phase, power, onLaunch]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const isSweetSpot = power >= SWEET_SPOT_MIN && power <= SWEET_SPOT_MAX;
  const isPerfect = power >= 88 && power <= 92;

  const powerColor = power < 30
    ? '#4B5563'
    : power < 60
      ? '#00CCFF'
      : power < SWEET_SPOT_MIN
        ? '#FFB800'
        : isPerfect
          ? '#D4AF37'
          : isSweetSpot
            ? '#00FF88'
            : '#FF4444';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-black" style={{ fontFamily: 'Clash Grotesk, sans-serif', color: '#D4AF37' }}>
          {isZh ? '發射準備' : 'LAUNCH'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {phase === 'ready' && (isZh ? '按住蓄力，在最佳時機放開！' : 'Hold to charge, release at the sweet spot!')}
          {phase === 'charging' && (isZh ? '蓄力中...放開！' : 'Charging... Release!')}
          {phase === 'released' && (
            isPerfect
              ? (isZh ? '完美發射！' : 'PERFECT LAUNCH!')
              : isSweetSpot
                ? (isZh ? '優秀發射！' : 'GREAT LAUNCH!')
                : power >= 60
                  ? (isZh ? '不錯的發射' : 'Good launch')
                  : (isZh ? '發射力道不足...' : 'Weak launch...')
          )}
        </p>
      </motion.div>

      {/* Power meter */}
      <div className="relative w-64">
        {/* Background bar */}
        <div className="h-8 w-full overflow-hidden rounded-full border border-gray-700 bg-gray-900">
          {/* Sweet spot indicator */}
          <div
            className="absolute top-0 h-8 opacity-20"
            style={{
              left: `${SWEET_SPOT_MIN}%`,
              width: `${SWEET_SPOT_MAX - SWEET_SPOT_MIN}%`,
              background: 'linear-gradient(90deg, #00FF88, #D4AF37)',
              borderRadius: '0 9999px 9999px 0',
            }}
          />
          {/* Power fill */}
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${power}%`,
              background: `linear-gradient(90deg, ${powerColor}88, ${powerColor})`,
              boxShadow: `0 0 20px ${powerColor}40`,
            }}
            transition={{ duration: 0.05 }}
          />
        </div>

        {/* Power number */}
        <div className="mt-3 text-center">
          <motion.span
            className="text-4xl font-black tabular-nums"
            style={{
              fontFamily: 'Clash Grotesk, sans-serif',
              color: powerColor,
              textShadow: phase === 'released' && isSweetSpot ? `0 0 30px ${powerColor}60` : 'none',
            }}
            animate={phase === 'released' ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {power}
          </motion.span>
          <span className="ml-1 text-sm text-gray-500">/ 100</span>
        </div>
      </div>

      {/* Launch button */}
      <AnimatePresence mode="wait">
        {phase === 'ready' && (
          <motion.button
            key="ready"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onPointerDown={handleStart}
            disabled={disabled}
            className="relative select-none rounded-2xl border-2 border-gray-600 px-12 py-4 text-lg font-bold text-white transition-all hover:border-yellow-500 hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] active:scale-95 disabled:opacity-50"
            style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
          >
            {isZh ? '按住發射' : 'HOLD TO LAUNCH'}
          </motion.button>
        )}

        {phase === 'charging' && (
          <motion.button
            key="charging"
            initial={{ scale: 1 }}
            animate={{
              scale: [1, 1.05, 1],
              borderColor: [powerColor, '#fff', powerColor],
            }}
            transition={{ duration: 0.3, repeat: Infinity }}
            onPointerUp={handleRelease}
            onPointerLeave={handleRelease}
            className="relative select-none rounded-2xl border-2 px-12 py-4 text-lg font-bold text-white"
            style={{
              fontFamily: 'Cabinet Grotesk, sans-serif',
              borderColor: powerColor,
              boxShadow: `0 0 40px ${powerColor}40`,
              background: `linear-gradient(135deg, ${powerColor}15, transparent)`,
            }}
          >
            {isZh ? '放開！' : 'RELEASE!'}
          </motion.button>
        )}

        {phase === 'released' && (
          <motion.div
            key="released"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {isPerfect && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1] }}
                className="mb-2 text-3xl"
              >
                ⚡
              </motion.div>
            )}
            <p className="text-sm text-gray-500">
              {isZh ? '角動量加成' : 'AM Bonus'}: <span className="font-bold" style={{ color: powerColor }}>×{(power / 50).toFixed(2)}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
