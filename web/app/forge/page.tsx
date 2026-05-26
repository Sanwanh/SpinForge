'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useForge, type ForgeMode } from '@/hooks/useForge';
import { useInventory, type PartObject } from '@/hooks/useInventory';
import { useSparkBalance, useSparkCoins } from '@/hooks/useSparkBalance';
import { RARITY_LABELS } from '@/lib/constants';
import { useT } from '@/lib/i18n';

type PartType = 'blade' | 'ratchet' | 'bit';

export default function ForgePage() {
  const account = useCurrentAccount();
  const t = useT();
  const { doEvolve, doFuse, doRetune, isPending } = useForge();
  const { blades, ratchets, bits, refetch: refetchInventory } = useInventory();
  const { formatted: sparkBalance, refetch: refetchSpark } = useSparkBalance();
  const { primaryCoinId } = useSparkCoins();

  const [activeMode, setActiveMode] = useState<ForgeMode>('evolve');
  const [selectedPartType, setSelectedPartType] = useState<PartType>('blade');
  const [selectedParts, setSelectedParts] = useState<PartObject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const FORGE_MODES: { mode: ForgeMode; label: string; desc: string; cost: string; inputs: string; requiredCount: number }[] = [
    { mode: 'evolve', label: t.forge.evolution, desc: t.forge.evolutionDesc, cost: '50 SPARK', inputs: '3 parts (same type, Common)', requiredCount: 3 },
    { mode: 'fuse', label: t.forge.fusion, desc: t.forge.fusionDesc, cost: '200 SPARK', inputs: '2 parts (same type, Rare)', requiredCount: 2 },
    { mode: 'retune', label: t.forge.retune, desc: t.forge.retuneDesc, cost: '75 SPARK', inputs: '1 part (any rarity)', requiredCount: 1 },
  ];

  const currentMode = FORGE_MODES.find((m) => m.mode === activeMode)!;

  // Get eligible parts based on mode and selected type
  const getEligibleParts = (): PartObject[] => {
    const partsMap: Record<PartType, PartObject[]> = { blade: blades, ratchet: ratchets, bit: bits };
    const pool = partsMap[selectedPartType];

    if (activeMode === 'evolve') {
      return pool.filter((p) => RARITY_LABELS[Number(p.fields.rarity ?? 0)] === 'Common');
    }
    if (activeMode === 'fuse') {
      return pool.filter((p) => RARITY_LABELS[Number(p.fields.rarity ?? 0)] === 'Rare');
    }
    // retune: any rarity
    return pool;
  };

  const eligibleParts = getEligibleParts();

  const togglePart = (part: PartObject) => {
    setError(null);
    setSuccess(null);
    const isSelected = selectedParts.some((p) => p.objectId === part.objectId);
    if (isSelected) {
      setSelectedParts((prev) => prev.filter((p) => p.objectId !== part.objectId));
    } else if (selectedParts.length < currentMode.requiredCount) {
      setSelectedParts((prev) => [...prev, part]);
    }
  };

  const handleForge = useCallback(async () => {
    if (!primaryCoinId) {
      setError('No SPARK coins found. Use the faucet first!');
      return;
    }
    setError(null);
    setSuccess(null);

    try {
      if (activeMode === 'evolve' && selectedParts.length === 3) {
        await doEvolve(
          [selectedParts[0].objectId, selectedParts[1].objectId, selectedParts[2].objectId],
          primaryCoinId,
        );
        setSuccess('Evolution complete! Check your collection for the new Rare part.');
      } else if (activeMode === 'fuse' && selectedParts.length === 2) {
        await doFuse(
          [selectedParts[0].objectId, selectedParts[1].objectId],
          primaryCoinId,
        );
        setSuccess('Fusion complete! Check your collection for the new Epic part.');
      } else if (activeMode === 'retune' && selectedParts.length === 1) {
        const currentAttack = Number(selectedParts[0].fields.attack ?? 50);
        const newAttack = Math.floor(Math.random() * 80) + 20;
        await doRetune(selectedParts[0].objectId, newAttack, primaryCoinId);
        setSuccess(`Re-tune complete! Attack changed from ${currentAttack} to ${newAttack}.`);
      }

      setSelectedParts([]);
      refetchInventory();
      refetchSpark();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setError(message);
    }
  }, [activeMode, selectedParts, primaryCoinId, doEvolve, doFuse, doRetune, refetchInventory, refetchSpark]);

  const handleModeChange = (mode: ForgeMode) => {
    setActiveMode(mode);
    setSelectedParts([]);
    setError(null);
    setSuccess(null);
  };

  if (!account) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">{t.forge.connectPrompt}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{t.forge.title}</h1>
        <p className="text-sm text-gray-400">{t.forge.evolution}, {t.forge.fusion}, {t.forge.retune}</p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1">
          <span className="text-xs text-gray-400">SPARK</span>
          <span className="text-sm font-bold text-brand-orange">{sparkBalance}</span>
        </div>
      </motion.div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        {FORGE_MODES.map((fm) => (
          <button
            key={fm.mode}
            onClick={() => handleModeChange(fm.mode)}
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

      {/* Error / Success messages */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
          {success}
        </div>
      )}

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
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              Selected ({selectedParts.length}/{currentMode.requiredCount})
            </h3>
            <div className="flex gap-2">
              {Array.from({ length: currentMode.requiredCount }, (_, i) => {
                const part = selectedParts[i];
                return (
                  <div
                    key={i}
                    className={clsx(
                      'flex h-16 w-16 items-center justify-center rounded-lg border-2 text-xs',
                      part
                        ? 'border-brand-blue/50 bg-brand-blue/10 text-white'
                        : 'border-dashed border-gray-700 text-gray-600'
                    )}
                  >
                    {part ? part.fields.name as string || part.objectId.slice(-4) : '+'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Part type selector (for evolve/fuse) */}
        {activeMode !== 'retune' && (
          <div className="flex gap-2">
            {(['blade', 'ratchet', 'bit'] as const).map((pt) => (
              <button
                key={pt}
                onClick={() => { setSelectedPartType(pt); setSelectedParts([]); }}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  selectedPartType === pt ? 'bg-brand-blue text-white' : 'bg-surface-overlay text-gray-400 hover:text-white'
                )}
              >
                {t.workshop[pt]}
              </button>
            ))}
          </div>
        )}

        {/* Eligible parts grid */}
        {eligibleParts.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            {t.forge.noParts}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {eligibleParts.map((part) => {
              const isSelected = selectedParts.some((p) => p.objectId === part.objectId);
              const rarity = RARITY_LABELS[Number(part.fields.rarity ?? 0)] ?? 'Common';
              return (
                <button
                  key={part.objectId}
                  onClick={() => togglePart(part)}
                  className={clsx(
                    'rounded-lg border p-3 text-left text-xs transition-all',
                    isSelected
                      ? 'border-brand-blue bg-brand-blue/10 text-white'
                      : 'border-gray-700 bg-surface-overlay text-gray-300 hover:border-gray-500'
                  )}
                >
                  <p className="font-bold">{String(part.fields.name ?? `${part.type} #${part.objectId.slice(-4)}`)}</p>
                  <p className="text-gray-500">{rarity}</p>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            onClick={handleForge}
            disabled={isPending || selectedParts.length < currentMode.requiredCount || !primaryCoinId}
            className={clsx(
              'btn-primary',
              (isPending || selectedParts.length < currentMode.requiredCount) && 'opacity-50'
            )}
          >
            {isPending ? `${t.forge.forging}...` : selectedParts.length < currentMode.requiredCount ? t.forge.selectParts : t.forge.forgeNow}
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
