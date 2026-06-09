'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Beyblade } from '@/components/design/Beyblade';
import {
  Corners,
  Eyebrow,
  PageHeader,
  Section,
  SectionHead,
  Stat,
  Tag,
} from '@/components/design/atoms';
import { BeyCard, type BeyCardData } from '@/components/design/BeyCard';
import { useT } from '@/lib/i18n';
import { useGuest } from '@/lib/guest';
import { GuestEntry } from '@/components/shared/Guest';
import { useGameUser } from '@/hooks/useGameUser';
import { useInventory } from '@/hooks/useInventory';
import { useSpark } from '@/hooks/useSpark';
import { usePassport } from '@/hooks/usePassport';
import { api } from '@/lib/api-fetch';
import type { PartObject } from '@/lib/inventory-types';

/**
 * Aggregate the session player view: profile stats (DB), parts/Beys (DB
 * inventory join) and SPARK (DB ledger). Replaces the old wallet-owned-object
 * queries; same shape so the presentational cards below stay unchanged.
 */
function usePlayerData() {
  const { blades, ratchets, bits, beys, isLoading: loadingInv, refetch: refetchInv } = useInventory();
  const { profile, profileId, isLoading: loadingProfile, refetch: refetchProfile } = usePassport();
  const { balance: spark, refetch: refetchSpark } = useSpark();

  const refetch = useCallback(() => {
    void refetchInv();
    void refetchProfile();
    void refetchSpark();
  }, [refetchInv, refetchProfile, refetchSpark]);

  return {
    blades,
    ratchets,
    bits,
    beys,
    profile,
    profileId,
    profileCount: profile ? 1 : 0,
    spark,
    loadingParts: loadingInv || loadingProfile,
    refetch,
  };
}

function PassportCard({ data, handle }: { data: ReturnType<typeof usePlayerData>; handle: string }) {
  const { blades, ratchets, bits, beys, profile, profileId, spark } = data;
  const wins = Number(profile?.wins ?? 0);
  const losses = Number(profile?.losses ?? 0);
  const elo = Number(profile?.elo ?? 1000);
  const totalBattles = Number(profile?.total_battles ?? 0);
  const burstFinishes = Number(profile?.burst_finishes ?? 0);
  const displayName = String(profile?.display_name ?? handle ?? 'Unnamed');
  const shortAddr = handle ? `@${handle}` : '—';

  return (
    <div
      className="r-legendary"
      style={{
        width: '100%',
        maxWidth: 480,
        background: 'linear-gradient(160deg, #1a1408 0%, #0a0e17 50%, #0a0805 100%)',
        borderRadius: 18,
        padding: 28,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Corners color="var(--gold)" />
      <div
        className="kanji-watermark"
        style={{ fontSize: 360, top: '-60px', right: '-60px', opacity: 0.06, color: 'var(--gold)' }}
      >
        龍
      </div>

      <div
        className="sf-flex sf-justify-between sf-items-center"
        style={{ position: 'relative' }}
      >
        <div>
          <div className="t-eyebrow" style={{ color: 'var(--gold)' }}>
            Spin Passport · 陀螺護照
          </div>
          <div
            className="t-mono"
            style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}
          >
            {profileId ? `Sui Object · ${profileId.slice(0, 8)}...${profileId.slice(-4)}` : 'No Profile Yet'}
          </div>
        </div>
        <div
          style={{
            padding: '4px 9px',
            borderRadius: 4,
            background: profile ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
            border: profile ? '1px solid var(--gold)' : '1px solid var(--border)',
            color: profile ? 'var(--gold)' : 'var(--text-dim)',
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
          }}
        >
          {profile ? 'VERIFIED' : 'UNREGISTERED'}
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'relative',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <Beyblade size={160} element="fire" spinSpeed={0.9} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="t-eyebrow" style={{ fontSize: 9 }}>Player</div>
          <div
            style={{
              fontFamily: 'var(--f-display)',
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: '-0.01em',
              lineHeight: 1.05,
              marginTop: 4,
            }}
          >
            {displayName.toUpperCase()}
          </div>
          <div className="t-mono" style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
            ELO {elo}
          </div>
          <div className="sf-flex sf-gap-2" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <Tag color="var(--gold)" style={{ fontSize: 9 }}>{spark.toFixed(0)} SPARK</Tag>
            <Tag color="var(--rare)" style={{ fontSize: 9 }}>{blades.length + ratchets.length + bits.length} PARTS</Tag>
            {beys.length > 0 && <Tag color="var(--wood)" style={{ fontSize: 9 }}>{beys.length} ROTORS</Tag>}
          </div>
        </div>
      </div>

      <div
        className="sf-grid"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid var(--border-soft)',
          position: 'relative',
        }}
      >
        <Stat label="Battles" value={String(totalBattles)} />
        <Stat label="Wins" value={String(wins)} color="var(--wood)" />
        <Stat label="Losses" value={String(losses)} color="var(--text-mute)" />
        <Stat label="Burst" value={String(burstFinishes)} color="var(--fire)" />
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 18,
          borderTop: '1px solid var(--border-soft)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div>
          <div className="t-eyebrow" style={{ fontSize: 9 }}>Holder</div>
          <div className="t-mono" style={{ fontSize: 13, marginTop: 4 }}>
            <span style={{ color: 'var(--gold)' }}>{shortAddr}</span>
          </div>
        </div>
        <div className="sf-flex sf-gap-2">
          {[
            { k: '刃', c: 'var(--rare)', n: blades.length },
            { k: '歯', c: 'var(--fire)', n: ratchets.length },
            { k: '軸', c: 'var(--gold)', n: bits.length },
          ].map((b) => (
            <div
              key={b.k}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: `1px solid ${b.c}`,
                background: `radial-gradient(circle, ${b.c}22, transparent)`,
                display: 'grid',
                placeItems: 'center',
                position: 'relative',
              }}
            >
              <span style={{ fontFamily: 'var(--f-han)', fontWeight: 900, fontSize: 14, color: b.c }}>
                {b.k}
              </span>
              {b.n > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 14, height: 14, borderRadius: '50%',
                  background: b.c, color: 'var(--abyss)',
                  fontSize: 8, fontWeight: 900, display: 'grid', placeItems: 'center',
                }}>
                  {b.n}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function beyToCard(b: PartObject): BeyCardData | null {
  if (!b.objectId) return null;
  const fields = b.fields ?? {};
  return {
    objectId: b.objectId,
    name: String(fields.name ?? 'Unnamed Rotor'),
    wins: Number(fields.wins ?? 0),
    losses: Number(fields.losses ?? 0),
    burstFinishes: Number(fields.burst_finishes ?? 0),
    xtremeFinishes: Number(fields.xtreme_finishes ?? 0),
  };
}

function MyRotors({
  beys,
}: {
  beys: ReturnType<typeof usePlayerData>['beys'];
}) {
  const t = useT();
  const cards: BeyCardData[] = (beys ?? [])
    .map(beyToCard)
    .filter((c): c is BeyCardData => c !== null);

  return (
    <div style={{ marginTop: 96 }}>
      <SectionHead
        eyebrow={t.passport.myRotorsEyebrow}
        title={t.passport.myRotorsTitle}
        sub={t.passport.myRotorsSub}
        align="center"
      />

      {cards.length === 0 ? (
        <div
          className="panel"
          style={{
            padding: '64px 32px',
            textAlign: 'center',
            maxWidth: 560,
            margin: '0 auto',
            borderStyle: 'dashed',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🎯</div>
          <p
            className="muted"
            style={{ fontSize: 15, lineHeight: 1.55, margin: '0 0 24px' }}
          >
            {t.passport.myRotorsEmpty}
          </p>
          <Link href="/register" className="btn btn-primary">
            {t.passport.myRotorsRegisterCta}
          </Link>
        </div>
      ) : (
        <>
          <div
            className="sf-flex sf-justify-between sf-items-center"
            style={{ marginBottom: 18, flexWrap: 'wrap', gap: 8 }}
          >
            <Eyebrow color="var(--gold)">
              {t.passport.myRotorsCount
                .replace('{n}', String(cards.length))
                .replace('{s}', cards.length === 1 ? '' : 's')}
            </Eyebrow>
            <div className="sf-flex sf-gap-3">
              <Link href="/register" className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>
                + {t.passport.registerMyTop}
              </Link>
              <Link href="/battle" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                {t.passport.myRotorsBattleCta}
              </Link>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {cards.map((c) => (
              <BeyCard key={c.objectId} bey={c} href={`/passport/${c.objectId}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OnboardingBanner({ onDone }: { onDone: () => void }) {
  const t = useT();
  const { user } = useGameUser();
  const [step, setStep] = useState<'idle' | 'creating' | 'claiming' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleOnboard = useCallback(async () => {
    setStep('creating');
    setError(null);
    try {
      // Session-authenticated: identity comes from the session. Seed the display
      // name from the auto-generated handle; the starter grant is server-side.
      const pRes = await api('/api/create-profile', { displayName: user?.handle ?? 'Player' });
      const pData = await pRes.json().catch(() => ({}));
      if (!pRes.ok) throw new Error(pData.error ?? 'Failed');

      setStep('claiming');
      const cRes = await api('/api/claim-starter', {});
      const cData = await cRes.json().catch(() => ({}));
      if (!cRes.ok) throw new Error(cData.error ?? 'Failed');

      setStep('done');
      setTimeout(onDone, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setStep('idle');
    }
  }, [onDone, user]);

  return (
    <div className="panel" style={{ padding: 28, textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎁</div>
      <h3 className="t-h3" style={{ marginBottom: 8 }}>
        {step === 'done' ? t.passport.onboardTitleDone : t.passport.onboardTitle}
      </h3>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        {step === 'done' ? t.passport.onboardSubDone : t.passport.onboardSub}
      </p>
      {error && <p style={{ color: 'var(--blood)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {step !== 'done' && (
        <button
          onClick={handleOnboard}
          disabled={step !== 'idle'}
          className="btn btn-primary"
          style={{ padding: '12px 32px', fontSize: 14 }}
        >
          {step === 'idle' && t.passport.onboardClaim}
          {step === 'creating' && t.passport.onboardCreating}
          {step === 'claiming' && t.passport.onboardClaiming}
        </button>
      )}
      {step === 'done' && (
        <div style={{ color: 'var(--gold)', fontFamily: 'var(--f-mono)', fontSize: 13 }}>{t.passport.onboardDone}</div>
      )}
    </div>
  );
}

function RegistrationFlow() {
  const t = useT();
  const steps = [
    { n: 1, k: t.passport.step1Title, en: t.passport.step1Sub, icon: '▣' },
    { n: 2, k: t.passport.step2Title, en: t.passport.step2Sub, icon: '◈' },
    { n: 3, k: t.passport.step3Title, en: t.passport.step3Sub, icon: '✦' },
    { n: 4, k: t.passport.step4Title, en: t.passport.step4Sub, icon: '⚡' },
  ];
  return (
    <div
      className="sf-grid"
      style={{
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        marginTop: 64,
        borderTop: '1px solid var(--border-soft)',
        borderBottom: '1px solid var(--border-soft)',
      }}
    >
      {steps.map((s, i) => (
        <div
          key={i}
          style={{
            padding: '32px 24px',
            borderRight: i < 3 ? '1px solid var(--border-soft)' : undefined,
            position: 'relative',
          }}
        >
          <div
            className="t-mono"
            style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em' }}
          >
            {t.passport.stepLabel} {String(s.n).padStart(2, '0')}
          </div>
          <div
            style={{
              marginTop: 16,
              marginBottom: 18,
              fontSize: 28,
              color: 'var(--gold)',
              opacity: 0.5,
            }}
          >
            {s.icon}
          </div>
          <div
            style={{
              fontFamily: 'var(--f-ui)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--text)',
              marginBottom: 6,
            }}
          >
            {s.k}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {s.en}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ModeCardProps {
  tag: string;
  kanji: string;
  title: string;
  sub: string;
  body: string[];
  accent: string;
  recommended?: boolean;
}

function ModeCard({ tag, kanji, title, sub, body, accent, recommended }: ModeCardProps) {
  const t = useT();
  return (
    <div
      className="panel"
      style={{
        padding: 28,
        position: 'relative',
        overflow: 'hidden',
        border: recommended ? `1px solid ${accent}` : '1px solid var(--border-soft)',
        boxShadow: recommended
          ? `0 0 0 1px ${accent}22, 0 12px 40px ${accent}22`
          : undefined,
      }}
    >
      {/* Faint kanji watermark — clipped inside the card, behind the content */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -18,
          right: -6,
          fontFamily: 'var(--f-han)',
          fontWeight: 900,
          fontSize: 110,
          color: accent,
          opacity: 0.06,
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        {kanji}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {recommended && (
          <div
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 4,
              background: accent,
              color: 'var(--abyss)',
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.15em',
              marginBottom: 14,
            }}
          >
            {t.passport.recommended}
          </div>
        )}
        <div className="t-eyebrow" style={{ color: accent }}>
          {tag}
        </div>
        <h3 className="t-h3" style={{ marginTop: 12, marginBottom: 6 }}>
          {title}
        </h3>
        <div className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
          {sub}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {body.map((line, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                color: 'var(--text)',
                padding: '8px 0',
                borderTop: i === 0 ? undefined : '1px dashed var(--border-soft)',
                display: 'flex',
                gap: 10,
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  color: accent,
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                ›
              </span>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function PassportPage() {
  const { user, isPending } = useGameUser();
  const [refreshKey, setRefreshKey] = useState(0);
  const { isGuest } = useGuest();
  const playerData = usePlayerData();
  const { profile, beys, loadingParts, refetch } = playerData;
  const t = useT();

  const isZh = t.nav.home === '首頁';

  if (isPending) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <div className="t-mono" style={{ color: 'var(--text-dim)', letterSpacing: '0.14em' }}>
          {isZh ? '載入中…' : 'Loading…'}
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <>
        <PageHeader
          eyebrow={t.passport.pageEyebrow}
          title={
            isZh ? (
              <>登入以查看你的<span style={{ color: 'var(--gold)' }}>陀螺護照</span></>
            ) : (
              <>Sign in to view your <span style={{ color: 'var(--gold)' }}>Passport.</span></>
            )
          }
          sub={t.collection.connectPrompt}
          kanjiBg="證"
        />
        <Section>
          <div className="panel" style={{ padding: 48, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
            <GuestEntry />
          </div>
        </Section>
      </>
    );
  }

  if (user && !loadingParts && !profile) {
    return (
      <>
        <PageHeader
          eyebrow={t.passport.pageEyebrow}
          title={
            isZh ? (
              <>歡迎來到 <span style={{ color: 'var(--gold)' }}>SpinForge</span></>
            ) : (
              <>Welcome to <span style={{ color: 'var(--gold)' }}>SpinForge.</span></>
            )
          }
          sub={t.home.connectPrompt}
          kanjiBg="證"
        />
        <Section>
          <OnboardingBanner
            onDone={() => {
              setRefreshKey((k) => k + 1);
              refetch();
            }}
          />
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t.passport.pageEyebrow}
        title={
          <>
            {t.passport.pageTitleA}
            <br />
            {t.passport.pageTitleB} <span style={{ color: 'var(--gold)' }}>{t.passport.pageTitleAccent}</span>
          </>
        }
        sub={t.passport.pageSub}
        kanjiBg="證"
      />

      <Section>
        <div
          className="passport-grid sf-grid"
          style={{
            gridTemplateColumns: '1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'grid', placeItems: 'center' }}>
            {user ? (
              <PassportCard data={playerData} handle={user.handle} key={refreshKey} />
            ) : (
              <div className="panel" style={{ padding: 40, textAlign: 'center', maxWidth: 320 }}>
                <Corners color="var(--gold)" />
                <div style={{ fontSize: 40, marginBottom: 12 }}>證</div>
                <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  {isZh ? '登入後,這裡會顯示你的陀螺護照(戰績、ELO、終結技)。' : 'Sign in to see your passport here (record, ELO, finishes).'}
                </p>
              </div>
            )}
          </div>
          <div>
            <Eyebrow color="var(--gold)">{t.passport.livesEyebrow}</Eyebrow>
            <h2 className="t-h3" style={{ marginTop: 14, marginBottom: 24, fontSize: 36 }}>
              {t.passport.livesTitle1}
              <br />
              {t.passport.livesTitle2}
              <br />
              {t.passport.livesTitle3}
            </h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {[
                { k: t.passport.fieldRotorObjectId, v: t.passport.fieldRotorObjectIdDesc },
                { k: t.passport.fieldBattleHistory, v: t.passport.fieldBattleHistoryDesc },
                { k: t.passport.fieldSeason,        v: t.passport.fieldSeasonDesc },
                { k: t.passport.fieldProvenance,    v: t.passport.fieldProvenanceDesc },
                { k: t.passport.fieldOwnerTrail,    v: t.passport.fieldOwnerTrailDesc },
              ].map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: 16,
                    alignItems: 'baseline',
                  }}
                >
                  <div
                    className="t-mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--gold)',
                      letterSpacing: '0.1em',
                      minWidth: 140,
                      fontWeight: 700,
                    }}
                  >
                    {d.k}
                  </div>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {d.v}
                  </div>
                </div>
              ))}
            </div>
            <div className="sf-flex sf-gap-3" style={{ marginTop: 32 }}>
              <Link href="/register" className="btn btn-primary">
                {t.passport.registerMyTop}
              </Link>
              <a
                href="https://suiexplorer.com/"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
              >
                {t.passport.viewOnSui}
              </a>
            </div>
          </div>
        </div>

        {user && <MyRotors beys={beys} />}

        <RegistrationFlow />

        <div style={{ marginTop: 96 }}>
          <SectionHead
            eyebrow={t.passport.threeWaysEyebrow}
            title={t.passport.threeWaysTitle}
            sub={t.passport.threeWaysSub}
            align="center"
          />
          <div
            className="mode-grid sf-grid"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}
          >
            <ModeCard
              tag={t.passport.mode1Tag}
              kanji="戰"
              title={t.passport.mode1Title}
              sub={t.passport.mode1Sub}
              accent="var(--gold)"
              recommended
              body={[
                t.passport.mode1Body1,
                t.passport.mode1Body2,
                t.passport.mode1Body3,
                t.passport.mode1Body4,
              ]}
            />
            <ModeCard
              tag={t.passport.mode2Tag}
              kanji="策"
              title={t.passport.mode2Title}
              sub={t.passport.mode2Sub}
              accent="var(--rare)"
              body={[
                t.passport.mode2Body1,
                t.passport.mode2Body2,
                t.passport.mode2Body3,
                t.passport.mode2Body4,
              ]}
            />
            <ModeCard
              tag={t.passport.mode3Tag}
              kanji="模"
              title={t.passport.mode3Title}
              sub={t.passport.mode3Sub}
              accent="var(--epic)"
              body={[
                t.passport.mode3Body1,
                t.passport.mode3Body2,
                t.passport.mode3Body3,
                t.passport.mode3Body4,
              ]}
            />
          </div>
        </div>

        <div style={{ marginTop: 96 }}>
          <SectionHead
            eyebrow={t.passport.methodsEyebrow}
            title={t.passport.methodsTitle}
            sub={t.passport.methodsSub}
            align="center"
          />
          <div
            className="mode-grid sf-grid"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}
          >
            {[
              { k: 'QR', n: t.passport.methodQrName,  desc: t.passport.methodQrDesc,  price: t.passport.methodQrPrice,  tier: t.passport.methodQrTier,  color: 'var(--gold)' },
              { k: 'NFC', n: t.passport.methodNfcName, desc: t.passport.methodNfcDesc, price: t.passport.methodNfcPrice, tier: t.passport.methodNfcTier, color: 'var(--rare)' },
              { k: 'DIY', n: t.passport.methodDiyName, desc: t.passport.methodDiyDesc, price: t.passport.methodDiyPrice, tier: t.passport.methodDiyTier, color: 'var(--epic)' },
            ].map((r, i) => (
              <div
                key={i}
                className="panel"
                style={{ padding: 28, position: 'relative', overflow: 'hidden' }}
              >
                <div
                  className="kanji-watermark"
                  style={{
                    fontSize: 200,
                    top: -40,
                    right: -30,
                    color: r.color,
                    opacity: 0.06,
                  }}
                >
                  {r.k}
                </div>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    border: `1px solid ${r.color}`,
                    background: `radial-gradient(circle, ${r.color}22, transparent)`,
                    display: 'grid',
                    placeItems: 'center',
                    color: r.color,
                    fontFamily: 'var(--f-mono)',
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  {r.k}
                </div>
                <div
                  className="t-eyebrow"
                  style={{ color: r.color, marginTop: 18 }}
                >
                  {r.tier}
                </div>
                <div className="t-h3" style={{ marginTop: 8, marginBottom: 10 }}>
                  {r.n}
                </div>
                <p
                  className="muted"
                  style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}
                >
                  {r.desc}
                </p>
                <div
                  className="t-mono"
                  style={{
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-soft)',
                    fontSize: 11,
                    color: r.color,
                    letterSpacing: '0.05em',
                  }}
                >
                  {r.price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

    </>
  );
}
