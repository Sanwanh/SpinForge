'use client';

import { motion } from 'framer-motion';
import { RANKS, SPIRIT_BEASTS } from '@/lib/constants';
import { SpiritBeastIcon } from '@/components/shared/SpiritBeastIcon';
import { useT } from '@/lib/i18n';

export default function ProfilePage({ params }: { params: { addr: string } }) {
  const t = useT();
  const rank = RANKS[2]; // Silver mock

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
            <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ color: rank.color, backgroundColor: `${rank.color}20` }}>
              {rank.name}
            </span>
            <span className="text-xs text-gray-500">1,250 XP</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: t.profile.totalMatches, value: '47', color: '#3B82F6' },
          { label: t.profile.winRate, value: '64%', color: '#10B981' },
          { label: t.profile.xtremeFinishes, value: '8', color: '#A855F7' },
          { label: t.profile.burstFinishes, value: '15', color: '#F97316' },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Spirit Beast collection */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-white">{t.profile.spiritBeasts}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {SPIRIT_BEASTS.map((beast) => {
            const unlocked = beast.id < 3;
            return (
              <div
                key={beast.id}
                className={`card flex flex-col items-center gap-2 ${unlocked ? '' : 'opacity-30'}`}
              >
                <SpiritBeastIcon beastId={beast.id} size={48} />
                <span className="text-xs font-bold text-white">{beast.name}</span>
                <span className="text-[10px] text-gray-500">{beast.chinese}</span>
                {!unlocked && <span className="text-[10px] text-gray-600">Locked</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
