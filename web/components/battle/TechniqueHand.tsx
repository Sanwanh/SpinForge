'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import { TECHNIQUE_CATEGORIES } from '@/lib/constants';

export interface TechniqueCard {
  id: string;
  name: string;
  category: string;
  description: string;
  cost?: number;
}

interface TechniqueHandProps {
  cards: TechniqueCard[];
  onPlay: (cardId: string) => void;
  disabled?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Launch: 'border-green-500 bg-green-500/10 text-green-400',
  Attack: 'border-red-500 bg-red-500/10 text-red-400',
  Defense: 'border-blue-500 bg-blue-500/10 text-blue-400',
  Xtreme: 'border-purple-500 bg-purple-500/10 text-purple-400',
  Spirit: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
};

export function TechniqueHand({ cards, onPlay, disabled = false }: TechniqueHandProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" role="list" aria-label="Technique cards in hand">
      {cards.map((card, index) => (
        <motion.button
          key={card.id}
          role="listitem"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          whileHover={disabled ? {} : { y: -8, scale: 1.05 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          disabled={disabled}
          onClick={() => onPlay(card.id)}
          className={clsx(
            'flex min-w-[120px] flex-col gap-1 rounded-lg border-2 p-3 transition-all',
            CATEGORY_COLORS[card.category] ?? 'border-gray-600 bg-gray-600/10 text-gray-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="text-[10px] uppercase tracking-wider opacity-60">{card.category}</span>
          <span className="text-sm font-bold">{card.name}</span>
          <span className="text-[10px] opacity-70 line-clamp-2">{card.description}</span>
        </motion.button>
      ))}

      {cards.length === 0 && (
        <div className="py-4 text-sm text-gray-600">No technique cards in hand</div>
      )}
    </div>
  );
}
