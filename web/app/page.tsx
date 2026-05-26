'use client';

import { useCurrentAccount } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { RANKS, SPIRIT_BEASTS, ELEMENT_COLORS, type Element } from '@/lib/constants';
import { SpiritBeastIcon } from '@/components/shared/SpiritBeastIcon';

const QUICK_ACTIONS = [
  { href: '/collection', label: 'Collection', desc: 'View your parts' },
  { href: '/workshop', label: 'Workshop', desc: 'Assemble Beys' },
  { href: '/deck', label: 'Deck Builder', desc: 'Build 3on3 deck' },
  { href: '/packs', label: 'Open Packs', desc: 'Get new parts' },
  { href: '/market', label: 'Marketplace', desc: 'Trade parts' },
  { href: '/forge', label: 'Forge', desc: 'Evolve & fuse' },
] as const;

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const account = useCurrentAccount();

  if (!account) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h1 className="text-5xl font-black text-gradient">SpinForge</h1>
          <p className="text-lg text-gray-400">
            Beyblade X Blockchain Card Game on Sui
          </p>
          <p className="text-sm text-gray-500">
            Connect your wallet to start collecting, assembling, and battling
          </p>
          <div className="flex justify-center gap-4 pt-4">
            {SPIRIT_BEASTS.slice(0, 4).map((beast) => (
              <SpiritBeastIcon key={beast.id} beastId={beast.id} size={48} />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400">
          Welcome back, {account.address.slice(0, 8)}...
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Rank" value={RANKS[1].name} color={RANKS[1].color} />
        <StatCard label="Wins" value="12" color="#10B981" />
        <StatCard label="SPARK" value="450" color="#F97316" />
        <StatCard label="Parts" value="24" color="#3B82F6" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-white">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {QUICK_ACTIONS.map((action, i) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={action.href} className="card-hover block">
                <h3 className="text-sm font-bold text-white">{action.label}</h3>
                <p className="text-xs text-gray-500">{action.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Matches */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-white">Recent Matches</h2>
        <div className="card space-y-3">
          <p className="text-sm text-gray-500">No recent matches. Start a battle to see your history here.</p>
          <Link href="/tournament" className="btn-primary inline-block text-sm">
            Find Match
          </Link>
        </div>
      </div>
    </div>
  );
}
