'use client';

import { motion } from 'framer-motion';
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { PACKAGE_ID, RANKS, SPIRIT_BEASTS, SPARK_TYPE } from '@/lib/constants';
import { SpiritBeastIcon } from '@/components/shared/SpiritBeastIcon';
import { useT } from '@/lib/i18n';
import { useMemo } from 'react';

interface PartCounts {
  blades: number;
  ratchets: number;
  bits: number;
  beys: number;
  total: number;
}

function classifyAndCount(data: { data: Array<{ data?: { content?: { dataType?: string; type?: string } } }> } | undefined): PartCounts {
  const counts: PartCounts = { blades: 0, ratchets: 0, bits: 0, beys: 0, total: 0 };
  if (!data?.data) return counts;

  for (const item of data.data) {
    const typeStr = item.data?.content?.type ?? '';
    if (typeStr.includes('::blade::Blade')) counts.blades++;
    else if (typeStr.includes('::ratchet::Ratchet')) counts.ratchets++;
    else if (typeStr.includes('::bit::Bit')) counts.bits++;
    else if (typeStr.includes('::bey::Bey')) counts.beys++;
  }
  counts.total = counts.blades + counts.ratchets + counts.bits + counts.beys;
  return counts;
}

export default function ProfilePage({ params }: { params: { addr: string } }) {
  const t = useT();

  const { data: objectsData, isLoading: objectsLoading } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: params.addr,
      filter: { Package: PACKAGE_ID },
      options: { showContent: true, showType: true },
    },
    { enabled: PACKAGE_ID !== '0x0' && !!params.addr }
  );

  const { data: balanceData, isLoading: balanceLoading } = useSuiClientQuery(
    'getBalance',
    {
      owner: params.addr,
      coinType: SPARK_TYPE,
    },
    { enabled: !!params.addr }
  );

  const counts = useMemo(() => classifyAndCount(objectsData as never), [objectsData]);
  const sparkBalance = useMemo(() => {
    if (!balanceData) return '0';
    return (Number(BigInt(balanceData.totalBalance)) / 1_000_000_000).toFixed(0);
  }, [balanceData]);

  const isLoading = objectsLoading || balanceLoading;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{t.profile.title}</h1>
        <p className="text-sm font-mono text-gray-400">{params.addr}</p>
      </motion.div>

      {/* Profile card */}
      <div className="card flex items-center gap-6">
        <SpiritBeastIcon beastId={0} size={64} />
        <div>
          <h2 className="text-lg font-bold text-white">Blader #{params.addr.slice(-4)}</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ color: RANKS[0].color, backgroundColor: `${RANKS[0].color}20` }}>
              {RANKS[0].name}
            </span>
          </div>
        </div>
      </div>

      {/* On-chain stats */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-xs text-gray-500">SPARK {t.profile.balance}</p>
            <p className="text-2xl font-bold text-brand-orange">{sparkBalance}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500">{t.profile.totalParts}</p>
            <p className="text-2xl font-bold text-blue-400">{counts.total}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500">{t.profile.assembledBeys}</p>
            <p className="text-2xl font-bold text-purple-400">{counts.beys}</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-500">{t.profile.partBreakdown}</p>
            <p className="text-sm font-bold text-gray-300">
              {counts.blades}B / {counts.ratchets}R / {counts.bits}Bt
            </p>
          </div>
        </div>
      )}

      {/* Spirit Beast collection */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-white">{t.profile.spiritBeasts}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {SPIRIT_BEASTS.map((beast) => (
            <div
              key={beast.id}
              className="card flex flex-col items-center gap-2"
            >
              <SpiritBeastIcon beastId={beast.id} size={48} />
              <span className="text-xs font-bold text-white">{beast.name}</span>
              <span className="text-[10px] text-gray-500">{beast.chinese}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
