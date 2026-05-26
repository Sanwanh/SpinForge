'use client';

import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useCallback } from 'react';
import { evolveBlades, fuseBlades, retuneBlade } from '@/lib/move-calls';

export type ForgeMode = 'evolve' | 'fuse' | 'retune';

export function useForge() {
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const doEvolve = useCallback(
    async (partIds: [string, string, string], sparkCoinId: string) => {
      const tx = evolveBlades(partIds[0], partIds[1], partIds[2], sparkCoinId);
      return signAndExecute({ transaction: tx });
    },
    [signAndExecute],
  );

  const doFuse = useCallback(
    async (partIds: [string, string], sparkCoinId: string) => {
      const tx = fuseBlades(partIds[0], partIds[1], sparkCoinId);
      return signAndExecute({ transaction: tx });
    },
    [signAndExecute],
  );

  const doRetune = useCallback(
    async (bladeId: string, newAttack: number, sparkCoinId: string) => {
      const tx = retuneBlade(bladeId, newAttack, sparkCoinId);
      return signAndExecute({ transaction: tx });
    },
    [signAndExecute],
  );

  return { doEvolve, doFuse, doRetune, isPending };
}
