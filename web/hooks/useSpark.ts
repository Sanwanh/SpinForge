'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-fetch';
import { useGameUser } from '@/hooks/useGameUser';

interface BalanceResponse {
  balance: number;
  currency?: string;
}

/**
 * Session DB-ledger SPARK balance. Reads `GET /api/balance` (authoritative
 * off-chain economy ledger keyed by the session user). `formatted` is a plain
 * integer string of whole SPARK — the ledger stores whole units, so no 1e9
 * scaling like the on-chain coin had. Guests get 0.
 */
export function useSpark() {
  const { user, isPending: sessionPending } = useGameUser();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!user) {
      setBalance(0);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api('/api/balance');
      if (!res.ok) throw new Error(`Balance fetch failed (${res.status})`);
      const data = (await res.json()) as BalanceResponse;
      setBalance(Number(data.balance ?? 0));
    } catch {
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (sessionPending) return;
    void refetch();
  }, [sessionPending, refetch]);

  return { balance, formatted: String(balance), isLoading: isLoading || sessionPending, refetch };
}
