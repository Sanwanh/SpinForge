'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useInventory } from '@/hooks/useInventory';
import { usePhysicsCalc } from '@/hooks/usePhysicsCalc';
import { PartSlot } from '@/components/workshop/PartSlot';
import { AssemblyPreview } from '@/components/workshop/AssemblyPreview';
import { StatsPanel } from '@/components/workshop/StatsPanel';
import { PartGrid } from '@/components/collection/PartGrid';
import type { PartCardData } from '@/components/collection/PartCard';
import type { BladeStats, RatchetStats, BitStats } from '@/lib/physics-sim';
import { assembleBey } from '@/lib/move-calls';
import { useT } from '@/lib/i18n';

type SlotType = 'blade' | 'ratchet' | 'bit';

function toBladeStats(fields: Record<string, unknown>): BladeStats {
  return {
    attack: Number(fields.attack ?? 0),
    recoilFactor: Number(fields.recoil_factor ?? 0),
    spinDirection: Number(fields.spin_direction ?? 0),
    beyType: Number(fields.bey_type ?? 0),
    element: Number(fields.element ?? 0),
  };
}

function toRatchetStats(fields: Record<string, unknown>): RatchetStats {
  return {
    prongs: Number(fields.prongs ?? 0),
    height: Number(fields.height ?? 60),
    weight: Number(fields.weight ?? 0),
    burstResistance: Number(fields.burst_resistance ?? 0),
  };
}

function toBitStats(fields: Record<string, unknown>): BitStats {
  return {
    category: Number(fields.category ?? 0),
    friction: Number(fields.friction ?? 0),
    mobility: Number(fields.mobility ?? 1),
    gearDiameter: Number(fields.gear_diameter ?? 0),
    hasLifeAfterDeath: Boolean(fields.has_life_after_death),
  };
}

export default function WorkshopPage() {
  const account = useCurrentAccount();
  const { blades, ratchets, bits, refetch } = useInventory();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const t = useT();

  const [selectedBlade, setSelectedBlade] = useState<PartCardData | null>(null);
  const [selectedRatchet, setSelectedRatchet] = useState<PartCardData | null>(null);
  const [selectedBit, setSelectedBit] = useState<PartCardData | null>(null);
  const [activeSlot, setActiveSlot] = useState<SlotType | null>(null);
  const [beyName, setBeyName] = useState('');

  const bladeStats = selectedBlade ? toBladeStats(selectedBlade.fields) : null;
  const ratchetStats = selectedRatchet ? toRatchetStats(selectedRatchet.fields) : null;
  const bitStats = selectedBit ? toBitStats(selectedBit.fields) : null;
  const physics = usePhysicsCalc(bladeStats, ratchetStats, bitStats);

  const canAssemble = selectedBlade && selectedRatchet && selectedBit && beyName.trim();

  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [assembleSuccess, setAssembleSuccess] = useState(false);

  const handleAssemble = useCallback(async () => {
    if (!selectedBlade || !selectedRatchet || !selectedBit || !beyName.trim() || !account?.address) return;
    setAssembleError(null);
    setAssembleSuccess(false);
    try {
      const tx = assembleBey(selectedBlade.objectId, selectedRatchet.objectId, selectedBit.objectId, beyName.trim(), account.address);
      await signAndExecute({ transaction: tx });
      setSelectedBlade(null);
      setSelectedRatchet(null);
      setSelectedBit(null);
      setBeyName('');
      setAssembleSuccess(true);
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Assembly failed';
      setAssembleError(message);
    }
  }, [selectedBlade, selectedRatchet, selectedBit, beyName, account, signAndExecute, refetch]);

  const filteredParts = activeSlot ? (
    activeSlot === 'blade' ? blades : activeSlot === 'ratchet' ? ratchets : bits
  ).map((p) => ({
    objectId: p.objectId,
    type: activeSlot,
    name: String(p.fields.name ?? (activeSlot === 'ratchet' ? `${p.fields.prongs}-${p.fields.height}` : '')),
    rarity: Number(p.fields.rarity ?? 0),
    fields: p.fields,
  })) : [];

  if (!account) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">{t.workshop.connectPrompt}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{t.workshop.title}</h1>
        <p className="text-sm text-gray-400">{t.workshop.subtitle}</p>
      </motion.div>

      {assembleError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {assembleError}
        </div>
      )}
      {assembleSuccess && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
          Beyblade assembled successfully! Check your collection.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Assembly area */}
        <div className="card space-y-6 lg:col-span-2">
          <div className="flex items-center justify-center gap-8">
            <PartSlot label={t.workshop.blade} partType="blade" part={selectedBlade} onSelect={() => setActiveSlot('blade')} onRemove={() => setSelectedBlade(null)} />
            <span className="text-2xl text-gray-600">+</span>
            <PartSlot label={t.workshop.ratchet} partType="ratchet" part={selectedRatchet} onSelect={() => setActiveSlot('ratchet')} onRemove={() => setSelectedRatchet(null)} />
            <span className="text-2xl text-gray-600">+</span>
            <PartSlot label={t.workshop.bit} partType="bit" part={selectedBit} onSelect={() => setActiveSlot('bit')} onRemove={() => setSelectedBit(null)} />
          </div>

          <AssemblyPreview blade={selectedBlade} ratchet={selectedRatchet} bit={selectedBit} />

          {canAssemble && (
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Name your Beyblade..."
                value={beyName}
                onChange={(e) => setBeyName(e.target.value)}
                className="flex-1 rounded-lg border border-gray-700 bg-surface-overlay px-4 py-2 text-white placeholder-gray-500 focus:border-brand-blue focus:outline-none"
              />
              <button onClick={handleAssemble} disabled={isPending} className="btn-primary">
                {isPending ? `${t.workshop.assemble}...` : t.workshop.assemble}
              </button>
            </div>
          )}
        </div>

        {/* Stats panel */}
        <div>
          <StatsPanel physics={physics} />
        </div>
      </div>

      {/* Part picker */}
      {activeSlot && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Select {activeSlot}</h2>
            <button onClick={() => setActiveSlot(null)} className="text-sm text-gray-400 hover:text-white">
              Close
            </button>
          </div>
          <PartGrid
            parts={filteredParts}
            onSelect={(part) => {
              if (activeSlot === 'blade') setSelectedBlade(part);
              else if (activeSlot === 'ratchet') setSelectedRatchet(part);
              else setSelectedBit(part);
              setActiveSlot(null);
            }}
          />
        </motion.div>
      )}
    </div>
  );
}
