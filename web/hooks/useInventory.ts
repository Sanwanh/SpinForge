'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-fetch';
import { useGameUser } from '@/hooks/useGameUser';
import {
  type InventoryResponse,
  type PartObject,
  type SortedInventory,
  sortInventory,
} from '@/lib/inventory-types';

export type { PartObject } from '@/lib/inventory-types';

const EMPTY: SortedInventory = { blades: [], ratchets: [], bits: [], beys: [] };

/**
 * Session + DB-backed inventory. Fetches `GET /api/inventory` (the server joins
 * DB ownership with on-chain object content and returns each asset's Move
 * `fields`), then buckets the flat list into blade/ratchet/bit/bey arrays so the
 * existing visual components keep the same data shape they had under wallet
 * queries. No wallet connection is required — identity comes from the session
 * cookie. Guests (no session) get an empty inventory.
 */
export function useInventory() {
  const { user, isPending: sessionPending } = useGameUser();
  const [parts, setParts] = useState<SortedInventory>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setParts(EMPTY);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await api('/api/inventory');
      if (!res.ok) throw new Error(`Inventory fetch failed (${res.status})`);
      const data = (await res.json()) as InventoryResponse;
      setParts(sortInventory(data.items ?? []));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Inventory fetch failed'));
      setParts(EMPTY);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (sessionPending) return;
    void refetch();
  }, [sessionPending, refetch]);

  return { ...parts, isLoading: isLoading || sessionPending, error, refetch };
}

export type { PartObject as PartObjectType } from '@/lib/inventory-types';
export type { SortedInventory };
export type InventoryPart = PartObject;
