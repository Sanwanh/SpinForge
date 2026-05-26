'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import { RARITY_LABELS, RARITY_BORDER_CLASSES, type Rarity } from '@/lib/constants';
import { useT } from '@/lib/i18n';

interface ListingCardProps {
  objectId: string;
  name: string;
  partType: string;
  rarity: number;
  price: string;
  seller: string;
  onBuy: () => void;
}

export function ListingCard({ name, partType, rarity, price, seller, onBuy }: ListingCardProps) {
  const t = useT();
  const rarityLabel = RARITY_LABELS[rarity] ?? ('Common' as Rarity);
  const borderClass = RARITY_BORDER_CLASSES[rarityLabel];

  return (
    <motion.div whileHover={{ y: -4 }} className={clsx('card border-2', borderClass)}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">{name}</h3>
          <span className="text-xs uppercase text-gray-500">{partType}</span>
        </div>
        <span className="text-xs font-bold text-rarity-legendary">{rarityLabel}</span>
      </div>
      <div className="mb-3">
        <span className="text-lg font-bold text-brand-orange">{price} SPARK</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-600">
          {seller.slice(0, 6)}...{seller.slice(-4)}
        </span>
        <button onClick={onBuy} className="btn-primary text-xs">{t.common.buyNow}</button>
      </div>
    </motion.div>
  );
}
