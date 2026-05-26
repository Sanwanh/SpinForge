'use client';

import { motion } from 'framer-motion';
import { ELEMENT_COLORS, type Element } from '@/lib/constants';

interface SpinningTopProps {
  element: Element;
  angularMomentum: number; // 0-100 percentage
  size?: number;
  label?: string;
  isDeathSpin?: boolean;
}

export function SpinningTop({
  element,
  angularMomentum,
  size = 80,
  label,
  isDeathSpin = false,
}: SpinningTopProps) {
  const color = ELEMENT_COLORS[element];
  const amPct = Math.max(0, Math.min(100, angularMomentum));
  const spinDuration = Math.max(0.3, 3 - (amPct / 100) * 2.5);

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        animate={{
          rotate: 360,
          scale: isDeathSpin ? [1, 0.95, 1.05, 0.97, 1] : 1,
        }}
        transition={{
          rotate: { duration: spinDuration, repeat: Infinity, ease: 'linear' },
          scale: isDeathSpin ? { duration: 0.8, repeat: Infinity } : undefined,
        }}
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color}40 0%, ${color}10 70%, transparent 100%)`,
          border: `2px solid ${color}`,
          boxShadow: `0 0 ${amPct * 0.3}px ${color}80`,
        }}
      >
        {/* Inner ring */}
        <div
          className="rounded-full"
          style={{
            width: size * 0.55,
            height: size * 0.55,
            background: `radial-gradient(circle, ${color}80 0%, ${color}30 100%)`,
          }}
        />
        {/* Center dot */}
        <div
          className="absolute rounded-full"
          style={{
            width: size * 0.2,
            height: size * 0.2,
            backgroundColor: color,
          }}
        />
      </motion.div>

      {label && (
        <span className="text-xs font-medium text-gray-400">{label}</span>
      )}
      {isDeathSpin && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 animate-pulse">
          Death Spin
        </span>
      )}
    </div>
  );
}
