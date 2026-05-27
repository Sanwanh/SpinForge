'use client';

import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { useMemo } from 'react';
import { ORIGINAL_PACKAGE_ID } from '@/lib/constants';

export interface PartObject {
  objectId: string;
  type: 'blade' | 'ratchet' | 'bit' | 'bey';
  fields: Record<string, unknown>;
}

function classifyType(typeStr: string): PartObject['type'] | null {
  if (typeStr.includes('::blade::Blade')) return 'blade';
  if (typeStr.includes('::ratchet::Ratchet')) return 'ratchet';
  if (typeStr.includes('::bit::Bit')) return 'bit';
  if (typeStr.includes('::bey::Bey')) return 'bey';
  return null;
}

export function useInventory() {
  const account = useCurrentAccount();

  const { data, isLoading, error, refetch } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address ?? '',
      // Sui type identity is bound to the ORIGINAL defining package, not upgraded versions.
      // All Blade/Ratchet/Bit/Bey/SPARK_TOKEN types live under ORIGINAL_PACKAGE_ID.
      filter: { Package: ORIGINAL_PACKAGE_ID },
      options: { showContent: true, showType: true },
    },
    { enabled: !!account?.address }
  );

  const parts = useMemo(() => {
    if (!data?.data) return { blades: [], ratchets: [], bits: [], beys: [] };

    const blades: PartObject[] = [];
    const ratchets: PartObject[] = [];
    const bits: PartObject[] = [];
    const beys: PartObject[] = [];

    for (const item of data.data) {
      const content = item.data?.content;
      if (content?.dataType !== 'moveObject') continue;

      const partType = classifyType(content.type);
      if (!partType) continue;

      const part: PartObject = {
        objectId: item.data?.objectId ?? '',
        type: partType,
        fields: (content.fields as Record<string, unknown>) ?? {},
      };

      switch (partType) {
        case 'blade':
          blades.push(part);
          break;
        case 'ratchet':
          ratchets.push(part);
          break;
        case 'bit':
          bits.push(part);
          break;
        case 'bey':
          beys.push(part);
          break;
      }
    }

    return { blades, ratchets, bits, beys };
  }, [data]);

  return { ...parts, isLoading, error, refetch };
}
