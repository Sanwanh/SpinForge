'use client';

import { useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit';
import { useCallback } from 'react';
import { buyFromMarket, listOnMarket } from '@/lib/move-calls';
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
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const { data: listingsData, isLoading, refetch } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: PACKAGE_ID,
      options: { showContent: true, showType: true },
    },
    { enabled: PACKAGE_ID !== '0x0' }
  );

  const list = useCallback(
    async (kioskId: string, partId: string, price: bigint) => {
      const tx = listOnMarket(kioskId, partId, price);
      return signAndExecute({ transaction: tx });
    },
    [signAndExecute]
  );

  const buy = useCallback(
    async (kioskId: string, partId: string, paymentCoinId: string, policyId: string) => {
      const tx = buyFromMarket(kioskId, partId, paymentCoinId, policyId);
      return signAndExecute({ transaction: tx });
    },
    [signAndExecute]
  );

  const listings: MarketListing[] = [];

  return { listings, isLoading, isPending, list, buy, refetch };
}
