'use client';

import { useSuiClientQuery } from '@mysten/dapp-kit';
import { PACKAGE_ID } from '@/lib/constants';

export interface MarketListing {
  objectId: string;
  partType: string;
  name: string;
  rarity: number;
  price: bigint;
  seller: string;
}

export function useMarketplace() {
  const { data: listingsData, isLoading, refetch } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: PACKAGE_ID,
      options: { showContent: true, showType: true },
    },
    { enabled: PACKAGE_ID !== '0x0' },
  );

  const listings: MarketListing[] = [];

  return { listings, isLoading, refetch };
}
