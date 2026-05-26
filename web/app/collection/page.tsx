'use client';

import { motion } from 'framer-motion';
import { useInventory } from '@/hooks/useInventory';
import { PartGrid } from '@/components/collection/PartGrid';
import type { PartCardData } from '@/components/collection/PartCard';
import { useCurrentAccount } from '@mysten/dapp-kit';

export default function CollectionPage() {
  const account = useCurrentAccount();
  const { blades, ratchets, bits, isLoading } = useInventory();

  const allParts: PartCardData[] = [
    ...blades.map((b) => ({
      objectId: b.objectId,
      type: 'blade' as const,
      name: String(b.fields.name ?? ''),
      rarity: Number(b.fields.rarity ?? 0),
      fields: b.fields,
    })),
    ...ratchets.map((r) => ({
      objectId: r.objectId,
      type: 'ratchet' as const,
      name: `${r.fields.prongs}-${r.fields.height}`,
      rarity: Number(r.fields.rarity ?? 0),
      fields: r.fields,
    })),
    ...bits.map((b) => ({
      objectId: b.objectId,
      type: 'bit' as const,
      name: String(b.fields.name ?? ''),
      rarity: Number(b.fields.rarity ?? 0),
      fields: b.fields,
    })),
  ];

  if (!account) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">Connect your wallet to view your collection.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Collection</h1>
        <p className="text-sm text-gray-400">
          {allParts.length} parts ({blades.length} Blades, {ratchets.length} Ratchets, {bits.length} Bits)
        </p>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
        </div>
      ) : (
        <PartGrid parts={allParts} />
      )}
    </div>
  );
}
