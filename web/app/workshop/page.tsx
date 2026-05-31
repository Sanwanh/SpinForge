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
import { PageHeader, Section, Eyebrow, Corners } from '@/components/design/atoms';
import { useGuest } from '@/lib/guest';
import { GuestEntry } from '@/components/shared/Guest';

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
  const { isGuest } = useGuest();
  const { blades, ratchets, bits, refetch } = useInventory();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const t = useT();
  const isZh = t.nav.home === '首頁';

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

  if (!account && !isGuest) {
    return (
      <>
        <PageHeader
          eyebrow="WORKSHOP · 工坊"
          title={<>Assemble your <span style={{ color: 'var(--gold)' }}>Beyblade.</span></>}
          sub={t.workshop.subtitle}
          kanjiBg="鍛"
        />
        <Section>
          <div className="panel" style={{ padding: 64, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
            <p className="muted" style={{ fontSize: 16, lineHeight: 1.6, marginTop: 0, marginBottom: 24 }}>
              {t.workshop.connectPrompt}
            </p>
            <GuestEntry />
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="WORKSHOP · 工坊"
        title={<>Assemble your <span style={{ color: 'var(--gold)' }}>Beyblade.</span></>}
        sub={t.workshop.subtitle}
        kanjiBg="鍛"
      />

      <Section style={{ paddingTop: 64, paddingBottom: 64 }}>

      {assembleError && (
        <div className="panel" style={{ padding: 16, marginBottom: 20, position: 'relative', borderColor: 'var(--blood)' }}>
          <Corners color="var(--blood)" />
          <p className="t-mono" style={{ color: 'var(--blood)', fontSize: 12, margin: 0 }}>{assembleError}</p>
        </div>
      )}
      {assembleSuccess && (
        <div className="panel" style={{ padding: 16, marginBottom: 20, position: 'relative', borderColor: 'var(--wood)' }}>
          <Corners color="var(--wood)" />
          <p className="t-mono" style={{ color: 'var(--wood)', fontSize: 12, margin: 0 }}>✓ {isZh ? '組裝完成 — 去收藏看看你的陀螺。' : 'Bey assembled — check your Collection.'}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Assembly area */}
        <div className="panel lg:col-span-2" style={{ padding: 28, position: 'relative' }}>
          <Corners />
          <Eyebrow color="var(--gold)">ASSEMBLE · 組裝</Eyebrow>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
            <PartSlot label={t.workshop.blade} partType="blade" part={selectedBlade} onSelect={() => setActiveSlot('blade')} onRemove={() => setSelectedBlade(null)} />
            <span className="sf-plus">+</span>
            <PartSlot label={t.workshop.ratchet} partType="ratchet" part={selectedRatchet} onSelect={() => setActiveSlot('ratchet')} onRemove={() => setSelectedRatchet(null)} />
            <span className="sf-plus">+</span>
            <PartSlot label={t.workshop.bit} partType="bit" part={selectedBit} onSelect={() => setActiveSlot('bit')} onRemove={() => setSelectedBit(null)} />
          </div>

          <div style={{ borderTop: '1px solid var(--border-soft)', margin: '22px 0' }} />

          <AssemblyPreview blade={selectedBlade} ratchet={selectedRatchet} bit={selectedBit} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
            <input
              type="text"
              placeholder={isZh ? '為你的陀螺命名…' : 'Name your Bey…'}
              value={beyName}
              onChange={(e) => setBeyName(e.target.value)}
              disabled={!(selectedBlade && selectedRatchet && selectedBit)}
              style={{
                flex: 1,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--void)',
                color: 'var(--text)',
                padding: '12px 16px',
                fontFamily: 'var(--f-body)',
                fontSize: 14,
                outline: 'none',
                opacity: selectedBlade && selectedRatchet && selectedBit ? 1 : 0.5,
              }}
            />
            <button onClick={handleAssemble} disabled={!canAssemble || isPending} className="btn btn-primary" style={{ flexShrink: 0 }}>
              {isPending ? `${t.workshop.assemble}…` : t.workshop.assemble}
            </button>
          </div>
        </div>

        {/* Stats panel */}
        <div className="lg:col-span-1">
          <StatsPanel physics={physics} />
        </div>
      </div>

      {/* Part picker */}
      {activeSlot && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 32 }}>
          <div className="sf-flex sf-justify-between sf-items-center" style={{ marginBottom: 16 }}>
            <Eyebrow>Select {activeSlot}</Eyebrow>
            <button onClick={() => setActiveSlot(null)} className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 14px' }}>
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
      </Section>
    </>
  );
}
