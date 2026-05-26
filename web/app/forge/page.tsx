'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useCurrentAccount } from '@mysten/dapp-kit';
import type { ForgeMode } from '@/hooks/useForge';

const FORGE_MODES: { mode: ForgeMode; label: string; desc: string; cost: string; inputs: string }[] = [
  { mode: 'evolve', label: 'Evolution', desc: '3 Common parts -> 1 Rare part', cost: '50 SPARK', inputs: '3 parts (same type, Common)' },
  { mode: 'fuse', label: 'Fusion', desc: '2 Rare parts -> 1 Epic part', cost: '200 SPARK', inputs: '2 parts (same type, Rare)' },
  { mode: 'retune', label: 'Re-tune', desc: 'Reroll 1 stat on a part', cost: '75 SPARK', inputs: '1 part (any rarity)' },
];

export default function ForgePage() {
  const account = useCurrentAccount();
  const [activeMode, setActiveMode] = useState<ForgeMode>('evolve');

  if (!account) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">Connect your wallet to use the forge.</p>
      </div>
    );
  }

  const currentMode = FORGE_MODES.find((m) => m.mode === activeMode)!;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Forge</h1>
        <p className="text-sm text-gray-400">Evolve, fuse, and re-tune your parts</p>
      </motion.div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        {FORGE_MODES.map((fm) => (
          <button
            key={fm.mode}
            onClick={() => setActiveMode(fm.mode)}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-bold transition-all',
              activeMode === fm.mode
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                : 'bg-surface-overlay text-gray-400 hover:text-white'
            )}
          >
            {fm.label}
          </button>
        ))}
      </div>

      {/* Active mode panel */}
      <motion.div
        key={activeMode}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="card space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold text-white">{currentMode.label}</h2>
          <p className="text-sm text-gray-400">{currentMode.desc}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-surface p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Requirements</h3>
            <p className="text-sm text-gray-300">{currentMode.inputs}</p>
            <p className="mt-1 text-sm text-brand-orange">{currentMode.cost}</p>
          </div>

          <div className="rounded-lg bg-surface p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Input Parts</h3>
            <div className="flex gap-2">
              {Array.from({ length: activeMode === 'evolve' ? 3 : activeMode === 'fuse' ? 2 : 1 }, (_, i) => (
                <div
                  key={i}
                  className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-700 text-gray-600"
                >
                  +
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <button disabled className="btn-primary opacity-50">
            Select Parts to Forge
          </button>
        </div>
      </motion.div>

      {/* Forge info */}
      <div className="card">
        <h3 className="mb-2 text-sm font-bold text-gray-400">Forge Rules</h3>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>- Evolution: burn 3 Common parts of the same type to get 1 Rare</li>
          <li>- Fusion: burn 2 Rare parts of the same type to get 1 Epic</li>
          <li>- Re-tune: reroll 1 stat randomly (costs 75 SPARK)</li>
          <li>- Burned parts are permanently destroyed</li>
          <li>- Legendary parts can only be obtained from Diamond rank milestones</li>
        </ul>
      </div>
    </div>
  );
}
