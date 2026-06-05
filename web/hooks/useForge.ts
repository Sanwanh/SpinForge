'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api-fetch';

export type ForgeMode = 'evolve' | 'fuse' | 'retune';

export interface ForgeResult {
  newPartId?: string;
  digest?: string;
  newAttack?: number;
}

async function postForge(path: string, body: unknown): Promise<ForgeResult> {
  const res = await api(path, body);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? 'Forge operation failed');
  }
  return data as ForgeResult;
}

/**
 * Session-backed forge actions. Each call POSTs to a relay endpoint that
 * reserves DB SPARK, relays the on-chain mutation from platform custody, and
 * finalizes ownership. The part type (blade/ratchet/bit) lets the server pick
 * the matching Move entry point. No wallet signing or SPARK coin id is needed.
 */
export function useForge() {
  const [isPending, setIsPending] = useState(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setIsPending(true);
    try {
      return await fn();
    } finally {
      setIsPending(false);
    }
  }, []);

  const doEvolve = useCallback(
    (partIds: [string, string, string], partType: string) =>
      run(() => postForge('/api/forge/evolve', { partIds, partType })),
    [run],
  );

  const doFuse = useCallback(
    (partIds: [string, string], partType: string) =>
      run(() => postForge('/api/forge/fuse', { partIds, partType })),
    [run],
  );

  const doRetune = useCallback(
    (bladeId: string, newAttack: number) =>
      run(() => postForge('/api/forge/retune', { partId: bladeId, newAttack })),
    [run],
  );

  return { doEvolve, doFuse, doRetune, isPending };
}
