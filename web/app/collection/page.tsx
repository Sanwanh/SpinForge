'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { PartGrid } from '@/components/collection/PartGrid';
import type { PartCardData } from '@/components/collection/PartCard';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useT } from '@/lib/i18n';
import { PageHeader, Section, Stat } from '@/components/design/atoms';
import { disassembleBey, discardPart } from '@/lib/move-calls';
import { useGuest } from '@/lib/guest';
import { GuestEntry } from '@/components/shared/Guest';

export default function CollectionPage() {
  const account = useCurrentAccount();
  const { isGuest } = useGuest();
  const { blades, ratchets, bits, beys, isLoading, refetch } = useInventory();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const t = useT();
  const isZh = t.nav.home === '首頁';
  const canAssemble = blades.length > 0 && ratchets.length > 0 && bits.length > 0;

  const [manage, setManage] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDisassemble = useCallback(async (beyId: string) => {
    if (!account) { setActionError(isZh ? '請先連接錢包才能操作。' : 'Connect a wallet to do this.'); return; }
    if (!window.confirm(isZh ? '拆解這台陀螺?會變回刀刃、棘輪、軸尖三個零件。' : 'Disassemble this Bey back into its three parts?')) return;
    setActionError(null);
    setBusyId(beyId);
    try {
      await signAndExecute({ transaction: disassembleBey(beyId, account.address) });
      await refetch();
    } catch {
      setActionError(isZh ? '拆解失敗或已取消。' : 'Disassemble failed or cancelled.');
    } finally {
      setBusyId(null);
    }
  }, [account, isZh, signAndExecute, refetch]);

  const handleDiscard = useCallback(async (partId: string, type: 'blade' | 'ratchet' | 'bit') => {
    if (!account) { setActionError(isZh ? '請先連接錢包才能操作。' : 'Connect a wallet to do this.'); return; }
    if (!window.confirm(isZh ? '永久銷毀這個零件?此動作無法復原。' : 'Permanently destroy this part? This cannot be undone.')) return;
    setActionError(null);
    setBusyId(partId);
    try {
      await signAndExecute({ transaction: discardPart(partId, type) });
      await refetch();
    } catch {
      setActionError(isZh ? '銷毀失敗或已取消。' : 'Discard failed or cancelled.');
    } finally {
      setBusyId(null);
    }
  }, [account, isZh, signAndExecute, refetch]);

  const allParts: PartCardData[] = [
    ...blades.map((b) => ({
      objectId: b.objectId,
      type: 'blade' as const,
      name: String(b.fields.name ?? ''),
      rarity: Number(b.fields.rarity ?? 0),
      fields: b.fields,
    })),
    ...ratchets.map((r) => ({
      objectId: r.objectId,
      type: 'ratchet' as const,
      name: `${r.fields.prongs}-${r.fields.height}`,
      rarity: Number(r.fields.rarity ?? 0),
      fields: r.fields,
    })),
    ...bits.map((b) => ({
      objectId: b.objectId,
      type: 'bit' as const,
      name: String(b.fields.name ?? ''),
      rarity: Number(b.fields.rarity ?? 0),
      fields: b.fields,
    })),
  ];

  if (!account && !isGuest) {
    return (
      <>
        <PageHeader
          eyebrow={t.collection.pageEyebrowEmpty}
          title={
            <>
              {t.collection.pageTitleEmpty}
              <br />
              {t.collection.pageTitleEmptyAccent}
            </>
          }
          sub={t.collection.pageSubEmpty}
          kanjiBg="卡"
          accent="var(--epic)"
        />
        <Section>
          <div
            className="panel"
            style={{
              padding: 64,
              textAlign: 'center',
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            <p
              className="muted"
              style={{ fontSize: 16, lineHeight: 1.6, marginTop: 0, marginBottom: 24 }}
            >
              {t.collection.connectPrompt}
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
        eyebrow={t.collection.pageEyebrowOwned}
        title={
          <span style={{ color: 'var(--epic)' }}>
            {t.collection.partsForged.replace('{n}', String(allParts.length))}
          </span>
        }
        sub={t.collection.pageSubOwned}
        kanjiBg="卡"
        accent="var(--epic)"
      />

      <Section>
        <div
          className="sf-grid"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}
        >
          {[
            { label: t.collection.totalParts, value: String(allParts.length), color: 'var(--gold)' },
            { label: t.workshop.blade,        value: String(blades.length),   color: 'var(--fire)' },
            { label: t.workshop.ratchet,      value: String(ratchets.length), color: 'var(--rare)' },
            { label: t.workshop.bit,          value: String(bits.length),     color: 'var(--wood)' },
          ].map((s) => (
            <div key={s.label} className="panel" style={{ padding: 18 }}>
              <Stat label={s.label} value={s.value} color={s.color} />
            </div>
          ))}
        </div>

        {/* Next-step CTA: assemble parts into a battle-ready Bey */}
        <div
          className="panel"
          style={{
            padding: 20,
            marginBottom: 28,
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            border: canAssemble ? '1px solid var(--gold)' : '1px solid var(--border)',
          }}
        >
          <div style={{ minWidth: 220, flex: 1 }}>
            <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 6 }}>
              {isZh ? '下一步 · 組裝' : 'Next step · Assemble'}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              {isZh
                ? `把刀刃 + 棘輪 + 軸尖組裝成一台陀螺才能出戰。${beys.length > 0 ? `你已組裝 ${beys.length} 台。` : ''}`
                : `Combine a Blade + Ratchet + Bit into a Bey to battle. ${beys.length > 0 ? `You have ${beys.length} assembled.` : ''}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/workshop" className="btn btn-primary">
              {isZh ? '前往工坊組裝' : 'Assemble in Workshop'}
            </Link>
            {beys.length > 0 && (
              <Link href="/battle" className="btn btn-ghost">
                {isZh ? '出戰' : 'Battle'}
              </Link>
            )}
          </div>
        </div>

        {actionError && (
          <div className="panel" style={{ padding: 12, marginBottom: 20, borderColor: 'var(--blood)', color: 'var(--blood)', fontSize: 13 }}>
            {actionError}
          </div>
        )}

        {/* My Beys — assembled rotors you can take into battle or take apart */}
        {beys.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 12 }}>
              {isZh ? '我的陀螺' : 'My Beys'} · {beys.length}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {beys.map((b) => {
                const name = String(b.fields.name ?? 'Rotor');
                const wins = Number(b.fields.wins ?? 0);
                const losses = Number(b.fields.losses ?? 0);
                return (
                  <div key={b.objectId} className="panel" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: '1px solid var(--gold)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                      <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>
                        {wins}{isZh ? '勝' : 'W'} · {losses}{isZh ? '負' : 'L'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisassemble(b.objectId)}
                      disabled={busyId === b.objectId}
                      className="btn btn-ghost"
                      style={{ fontSize: 11, padding: '6px 12px', flexShrink: 0, color: 'var(--text-dim)' }}
                    >
                      {busyId === b.objectId ? '…' : (isZh ? '拆解' : 'Disassemble')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Parts header + manage/discard toggle */}
        <div className="sf-flex sf-justify-between sf-items-center" style={{ marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
          <div className="t-eyebrow" style={{ color: 'var(--epic)' }}>
            {isZh ? '我的零件' : 'My Parts'} · {allParts.length}
          </div>
          {allParts.length > 0 && (
            <button onClick={() => setManage((v) => !v)} className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 14px' }}>
              {manage ? (isZh ? '完成' : 'Done') : (isZh ? '整理 / 丟棄' : 'Manage / Discard')}
            </button>
          )}
        </div>

        {isLoading ? (
          <div
            className="sf-flex sf-items-center"
            style={{ justifyContent: 'center', padding: '64px 0' }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '2px solid var(--gold)',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        ) : manage ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {allParts.length === 0 && (
              <p className="muted" style={{ fontSize: 13 }}>{isZh ? '沒有零件可整理。' : 'No parts to manage.'}</p>
            )}
            {allParts.map((p) => (
              <div key={p.objectId} className="panel" style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="t-mono" style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', flexShrink: 0 }}>{p.type}</span>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || `#${p.objectId.slice(-4)}`}</span>
                </div>
                <button
                  onClick={() => handleDiscard(p.objectId, p.type)}
                  disabled={busyId === p.objectId}
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '6px 12px', color: 'var(--blood)', borderColor: 'rgba(255,51,51,0.3)', flexShrink: 0 }}
                >
                  {busyId === p.objectId ? '…' : (isZh ? '丟棄' : 'Discard')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <PartGrid parts={allParts} />
          </motion.div>
        )}
      </Section>
    </>
  );
}
