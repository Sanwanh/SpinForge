'use client';

import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { useMemo } from 'react';
import { SPARK_TYPE } from '@/lib/constants';

export function useSparkBalance() {
  const account = useCurrentAccount();

  const { data, isLoading, refetch } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address ?? '',
      coinType: SPARK_TYPE,
    },
    { enabled: !!account?.address },
  );

  const balance = useMemo(() => {
    if (!data) return 0n;
    return BigInt(data.totalBalance);
  }, [data]);

  const formatted = useMemo(() => {
    return (Number(balance) / 1_000_000_000).toFixed(0);
  }, [balance]);

  return { balance, formatted, isLoading, refetch };
}

export function useSparkCoins() {
  const account = useCurrentAccount();

  const { data, isLoading, refetch } = useSuiClientQuery(
    'getCoins',
    {
      owner: account?.address ?? '',
      coinType: SPARK_TYPE,
    },
    { enabled: !!account?.address },
  );

  const coins = useMemo(() => {
    return data?.data ?? [];
  }, [data]);

  const primaryCoinId = coins.length > 0 ? coins[0].coinObjectId : null;

  return { coins, primaryCoinId, isLoading, refetch };
}
