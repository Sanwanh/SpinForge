'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { ListingCard } from '@/components/market/ListingCard';
import { BuyModal } from '@/components/market/BuyModal';
import { useT } from '@/lib/i18n';

interface MockListing {
  objectId: string;
  name: string;
  partType: string;
  rarity: number;
  price: string;
  seller: string;
}

const MOCK_LISTINGS: MockListing[] = [
  { objectId: '0x1', name: 'Phoenix Wing', partType: 'Blade', rarity: 2, price: '150', seller: '0xabc123def456' },
  { objectId: '0x2', name: '5-80', partType: 'Ratchet', rarity: 1, price: '75', seller: '0xdef789abc012' },
  { objectId: '0x3', name: 'Gear Flat', partType: 'Bit', rarity: 2, price: '200', seller: '0x123456789abc' },
  { objectId: '0x4', name: 'Dragon Claw', partType: 'Blade', rarity: 3, price: '500', seller: '0xfed321cba654' },
  { objectId: '0x5', name: 'Rush', partType: 'Bit', rarity: 0, price: '30', seller: '0x999888777666' },
  { objectId: '0x6', name: '3-60', partType: 'Ratchet', rarity: 0, price: '25', seller: '0x111222333444' },
];

export default function MarketPage() {
  const account = useCurrentAccount();
  const [selectedListing, setSelectedListing] = useState<MockListing | null>(null);
  const t = useT();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{t.market.title}</h1>
        <p className="text-sm text-gray-400">{t.market.subtitle}</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_LISTINGS.map((listing) => (
          <ListingCard
            key={listing.objectId}
            {...listing}
            onBuy={() => setSelectedListing(listing)}
          />
        ))}
      </div>

      <BuyModal
        open={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        onConfirm={() => setSelectedListing(null)}
        itemName={selectedListing?.name ?? ''}
        price={selectedListing?.price ?? '0'}
        isPending={false}
      />
    </div>
  );
}
