'use client';

import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useCallback } from 'react';
import { evolve, fuse, retune } from '@/lib/move-calls';

export type ForgeMode = 'evolve' | 'fuse' | 'retune';

export function useForge() {
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const doEvolve = useCallback(
    async (partIds: [string, string, string], sparkCoinId: string) => {
      const tx = evolve(partIds[0], partIds[1], partIds[2], sparkCoinId);
      return signAndExecute({ transaction: tx });
    },
    [signAndExecute]
  );

  const doFuse = useCallback(
    async (partIds: [string, string], sparkCoinId: string) => {
      const tx = fuse(partIds[0], partIds[1], sparkCoinId);
      return signAndExecute({ transaction: tx });
    },
    [signAndExecute]
  );

  const doRetune = useCallback(
    async (partId: string, statIndex: number, sparkCoinId: string, randomId: string) => {
      const tx = retune(partId, statIndex, sparkCoinId, randomId);
      return signAndExecute({ transaction: tx });
    },
    [signAndExecute]
  );

  return { doEvolve, doFuse, doRetune, isPending };
}
