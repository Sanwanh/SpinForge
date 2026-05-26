'use client';

import { SPIRIT_BEASTS, ELEMENT_COLORS, type Element } from '@/lib/constants';

interface SpiritBeastIconProps {
  beastId: number;
  size?: number;
  className?: string;
}

const BEAST_SYMBOLS: Record<number, string> = {
  0: '龍', // Dragon
  1: '鳳', // Phoenix
  2: '虎', // Tiger
  3: '龜', // Tortoise
  4: '皇', // Emperor
};

export function SpiritBeastIcon({ beastId, size = 40, className = '' }: SpiritBeastIconProps) {
  const beast = SPIRIT_BEASTS[beastId];
  if (!beast) return null;

  const color = ELEMENT_COLORS[beast.element as Element];

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}20`,
        border: `2px solid ${color}`,
        color,
        fontSize: size * 0.45,
      }}
      role="img"
      aria-label={`${beast.name} spirit beast`}
    >
      {BEAST_SYMBOLS[beastId] ?? '?'}
    </div>
  );
}
