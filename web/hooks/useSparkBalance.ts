'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { useSession } from '@/lib/auth-client';
import { api } from '@/lib/api-fetch';
import { SPARK_TYPE } from '@/lib/constants';

// SPARK balance is now read from the authoritative off-chain ledger (economy.ts)
// via the session-authenticated GET /api/economy. The ledger stores whole-SPARK
// integers, so no on-chain coin query / 1e9 decimal conversion is needed.
export function useSparkBalance() {
  const { data: session } = useSession();
  const loggedIn = !!session?.user;

  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!loggedIn) {
      setBalance(0);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api('/api/economy?currency=SPARK');
      if (res.ok) {
        const data = await res.json();
        setBalance(Number(data.balance ?? 0));
      }
    } catch {
      /* transient — caller can refetch */
    } finally {
      setIsLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const formatted = useMemo(() => String(balance), [balance]);

  return { balance, formatted, isLoading, refetch };
}

// On-chain SPARK coin objects, still needed for building Sui transactions
// (pack opening / forging spend real coins). This is a chain read, not an
// identity/auth path, so it remains wallet-scoped.
export function useSparkCoins() {
  const account = useCurrentAccount();

  const { data, isLoading, refetch } = useSuiClientQuery(
    'getCoins',
    {
      owner: account?.address ?? '',
      coinType: SPARK_TYPE,
    },
    {
      enabled: !!account?.address,
      refetchOnMount: 'always',
      staleTime: 0,
    },
  );

  const coins = useMemo(() => {
    return data?.data ?? [];
  }, [data]);

  const primaryCoinId = coins.length > 0 ? coins[0].coinObjectId : null;

  return { coins, primaryCoinId, isLoading, refetch };
}
