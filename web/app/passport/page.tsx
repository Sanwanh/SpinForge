'use client';

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
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
import { PACKAGE_ID, ORIGINAL_PACKAGE_ID, PROFILE_PACKAGE_ID } from '@/lib/constants';
import { useT } from '@/lib/i18n';

function usePlayerData(address: string | undefined) {
  // Parts/SPARK live under ORIGINAL_PACKAGE_ID (0xcb4ae0...)
  const {
    data: ownedObjects,
    isLoading: loadingParts,
    refetch: refetchParts,
  } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: address ?? '',
      filter: { Package: ORIGINAL_PACKAGE_ID },
      options: { showType: true, showContent: true },
    },
    { enabled: !!address },
  );

  // PlayerProfile lives under its own package (0x336b41...)
  const {
    data: profileObjects,
    isLoading: loadingProfile,
    refetch: refetchProfile,
  } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: address ?? '',
      filter: { Package: PROFILE_PACKAGE_ID },
      options: { showType: true, showContent: true },
    },
    { enabled: !!address },
  );

  const { data: sparkData, refetch: refetchSpark } = useSuiClientQuery(
    'getBalance',
    { owner: address ?? '', coinType: `${ORIGINAL_PACKAGE_ID}::spark_token::SPARK_TOKEN` },
    { enabled: !!address },
  );

  const items = ownedObjects?.data ?? [];
  const blades = items.filter((i) => i.data?.type?.includes('::blade::'));
  const ratchets = items.filter((i) => i.data?.type?.includes('::ratchet::'));
  const bits = items.filter((i) => i.data?.type?.includes('::bit::'));
  const beys = items.filter((i) => i.data?.type?.includes('::bey::'));
  const profiles = (profileObjects?.data ?? []).filter((i) =>
    i.data?.type?.includes('::player_profile::PlayerProfile'),
  );
  const spark = Number(BigInt(sparkData?.totalBalance ?? '0')) / 1e9;

  let profile: Record<string, unknown> | null = null;
  let profileId = '';
  if (profiles.length > 0) {
    const content = profiles[0].data?.content;
    if (content?.dataType === 'moveObject') {
      profile = content.fields as Record<string, unknown>;
      profileId = profiles[0].data?.objectId ?? '';
    }
  }

  const refetchAll = () => {
    refetchParts();
    refetchProfile();
    refetchSpark();
  };

  return {
    blades,
    ratchets,
    bits,
    beys,
    profile,
    profileId,
    profileCount: profiles.length,
    spark,
    loadingParts: loadingParts || loadingProfile,
    refetch: refetchAll,
  };
}

function PassportCard({ address }: { address: string }) {
  const { blades, ratchets, bits, beys, profile, profileId, spark } = usePlayerData(address);
  const wins = Number(profile?.wins ?? 0);
  const losses = Number(profile?.losses ?? 0);
  const elo = Number(profile?.elo ?? 1000);
  const totalBattles = Number(profile?.total_battles ?? 0);
  const burstFinishes = Number(profile?.burst_finishes ?? 0);
  const displayName = String(profile?.display_name ?? 'Unnamed');
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

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

function OnboardingBanner({ address, onDone }: { address: string; onDone: () => void }) {
  const [step, setStep] = useState<'idle' | 'creating' | 'claiming' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleOnboard = useCallback(async () => {
    setStep('creating');
    setError(null);
    try {
      const pRes = await fetch('/api/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, displayName: `Player_${address.slice(2, 8)}` }),
      });
      const pData = await pRes.json();
      if (!pRes.ok) throw new Error(pData.error);

      setStep('claiming');
      const cRes = await fetch('/api/claim-starter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const cData = await cRes.json();
      if (!cRes.ok) throw new Error(cData.error);

      setStep('done');
      setTimeout(onDone, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setStep('idle');
    }
  }, [address, onDone]);

  return (
    <div className="panel" style={{ padding: 28, textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎁</div>
      <h3 className="t-h3" style={{ marginBottom: 8 }}>
        {step === 'done' ? '歡迎加入！' : '領取新手禮包'}
      </h3>
      <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
        {step === 'done'
          ? '你的玩家檔案已建立，500 SPARK + 5 個零件已送達！'
          : '建立玩家檔案 + 領取 500 SPARK + 5 個免費零件'}
      </p>
      {error && <p style={{ color: 'var(--blood)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {step !== 'done' && (
        <button
          onClick={handleOnboard}
          disabled={step !== 'idle'}
          className="btn btn-primary"
          style={{ padding: '12px 32px', fontSize: 14 }}
        >
          {step === 'idle' && '立即領取'}
          {step === 'creating' && '建立檔案中...'}
          {step === 'claiming' && '發送零件中...'}
        </button>
      )}
      {step === 'done' && (
        <div style={{ color: 'var(--gold)', fontFamily: 'var(--f-mono)', fontSize: 13 }}>✓ 完成</div>
      )}
    </div>
  );
}

function RegistrationFlow() {
  const steps = [
    { n: 1, k: '拿出實體陀螺', en: 'Grab your real-world top', icon: '▣' },
    { n: 2, k: '掃描 QR / NFC', en: 'Scan QR · tap NFC · or manual', icon: '◈' },
    { n: 3, k: '鑄造 Rotor Object', en: 'Mint on-chain Rotor', icon: '✦' },
    { n: 4, k: '戰績開始累積', en: 'Battle history begins', icon: '⚡' },
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
            STEP {String(s.n).padStart(2, '0')}
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
  return (
    <div
      className="panel"
      style={{
        padding: 28,
        position: 'relative',
        border: recommended ? `1px solid ${accent}` : '1px solid var(--border-soft)',
        boxShadow: recommended
          ? `0 0 0 1px ${accent}22, 0 12px 40px ${accent}22`
          : undefined,
      }}
    >
      {recommended && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: 20,
            padding: '4px 10px',
            borderRadius: 4,
            background: accent,
            color: 'var(--abyss)',
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.15em',
            whiteSpace: 'nowrap',
          }}
        >
          RECOMMENDED MVP
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          fontFamily: 'var(--f-han)',
          fontWeight: 900,
          fontSize: 80,
          color: accent,
          opacity: 0.08,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {kanji}
      </div>
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
              }}
            >
              ›
            </span>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

const PASSPORT_FIELDS = [
  { k: 'Rotor Object ID', v: "Permanent Sui Object — your top's unique signature" },
  { k: 'Battle History',  v: 'Every match, every result, every burst — immutable' },
  { k: 'Season Standing', v: 'Ranked points, tournament eligibility, badges' },
  { k: 'Part Provenance', v: 'Verified parts vs community-made, with full custody chain' },
  { k: 'Owner Trail',     v: 'Original minter + all transfers — like a car title' },
];

const REGISTRATION_METHODS = [
  { k: 'QR', n: 'QR Code Sticker', desc: '貼在陀螺盒或本體。掃描即領取鏈上 Rotor。', price: '成本最低 · MVP 首選', tier: 'OFFICIAL', color: 'var(--gold)' },
  { k: 'NFC', n: 'NFC Tag', desc: '手機靠近即驗證。實體收藏品質感、防偽性強。', price: '中高成本 · 賽級用', tier: 'PREMIUM', color: 'var(--rare)' },
  { k: 'DIY', n: 'Manual Register', desc: '上傳照片、輸入零件組合。任何陀螺都能成為社群 Rotor。', price: '免費 · 限友誼賽', tier: 'COMMUNITY', color: 'var(--epic)' },
];

export default function PassportPage() {
  const account = useCurrentAccount();
  const [refreshKey, setRefreshKey] = useState(0);
  const { profile, loadingParts, refetch } = usePlayerData(account?.address);
  const t = useT();

  if (!account) {
    return (
      <>
        <PageHeader
          eyebrow={t.passport.pageEyebrow}
          title={<>Connect wallet to view your <span style={{ color: 'var(--gold)' }}>Passport.</span></>}
          sub={t.collection.connectPrompt}
          kanjiBg="證"
        />
      </>
    );
  }

  if (!loadingParts && !profile) {
    return (
      <>
        <PageHeader
          eyebrow={t.passport.pageEyebrow}
          title={<>Welcome to <span style={{ color: 'var(--gold)' }}>SpinForge.</span></>}
          sub={t.home.connectPrompt}
          kanjiBg="證"
        />
        <Section>
          <OnboardingBanner
            address={account.address}
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
            <PassportCard address={account.address} key={refreshKey} />
          </div>
          <div>
            <Eyebrow color="var(--gold)">What lives in your Passport</Eyebrow>
            <h2 className="t-h3" style={{ marginTop: 14, marginBottom: 24, fontSize: 36 }}>
              A car license plate.
              <br />
              An athlete's ID.
              <br />
              A historical record.
            </h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {PASSPORT_FIELDS.map((d, i) => (
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
              <Link href="/packs" className="btn btn-primary">
                Register My Top
              </Link>
              <a
                href="https://suiexplorer.com/"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
              >
                View on Sui Explorer ↗
              </a>
            </div>
          </div>
        </div>

        <RegistrationFlow />

        <div style={{ marginTop: 96 }}>
          <SectionHead
            eyebrow="THREE WAYS TO BATTLE"
            title="實體陀螺，鏈上紀錄。"
            sub="從最簡單的雙方確認，到 AI 裁判全自動判定 —— 三種模式對應不同場景。"
            align="center"
          />
          <div
            className="mode-grid sf-grid"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}
          >
            <ModeCard
              tag="MODE · 01"
              kanji="戰"
              title="Physical Battle + Chain Record"
              sub="實體對戰 + 鏈上紀錄"
              accent="var(--gold)"
              recommended
              body={[
                '雙方掃描自己的陀螺，建立 Battle Room',
                '現實中發射，實體判定勝負',
                '賽後雙方點擊確認，結果寫入 Sui',
                '每場真實對戰 → 鏈上 BattleRecord',
              ]}
            />
            <ModeCard
              tag="MODE · 02"
              kanji="策"
              title="Physical + Card Strategy"
              sub="實體陀螺 + 卡牌輔助"
              accent="var(--rare)"
              body={[
                '賽前裝備 3 張任務型卡牌',
                '卡牌不改物理結果，只影響賽事獎勵',
                'Burst Hunter · Long Spin · Arena Boost',
                '讓不同陀螺類型都有上場空間',
              ]}
            />
            <ModeCard
              tag="MODE · 03"
              kanji="模"
              title="Pure Online Simulation"
              sub="純線上模擬對戰"
              accent="var(--epic)"
              body={[
                '沒有實體陀螺也能玩',
                '回合制 · 出牌影響系統判定',
                '適合早期 MVP 與遠距離 PvP',
                '戰績同樣寫入鏈上',
              ]}
            />
          </div>
        </div>

        <div style={{ marginTop: 96 }}>
          <SectionHead
            eyebrow="REGISTRATION METHODS"
            title="三種方式，把陀螺鑄上鏈。"
            sub="從便宜的 QR 貼紙，到高級的 NFC 認證，再到自帶陀螺的社群註冊 —— 任何人都不被擋在門外。"
            align="center"
          />
          <div
            className="mode-grid sf-grid"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}
          >
            {REGISTRATION_METHODS.map((r, i) => (
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
