'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import {
  Eyebrow,
  PageHeader,
  Section,
  Stat,
  Corners,
  Tag,
} from '@/components/design/atoms';
import { Beyblade } from '@/components/design/Beyblade';
import { BeyCard, type BeyCardData, elementForBey } from '@/components/design/BeyCard';
import { ELEMENT_MAP } from '@/components/design/tokens';
import { ORIGINAL_PACKAGE_ID } from '@/lib/constants';
import { useT } from '@/lib/i18n';

const FRESH = { refetchOnMount: 'always' as const, staleTime: 0 };

// ─── On-chain Bey → BeyCardData helpers ─────────────────────────────────

function beyToCard(b: { data?: unknown } | null | undefined): BeyCardData | null {
  if (!b || typeof b !== 'object') return null;
  const data = (b as { data?: { objectId?: string; content?: unknown } | null }).data;
  if (!data?.objectId) return null;
  const content = data.content as
    | { dataType?: string; fields?: Record<string, unknown> | unknown[] }
    | null
    | undefined;
  if (!content || content.dataType !== 'moveObject') return null;
  // Sui's MoveStruct can be either an object or an array — we only care when it's an object
  const fieldsRaw = content.fields;
  const fields: Record<string, unknown> = Array.isArray(fieldsRaw)
    ? {}
    : (fieldsRaw ?? {});
  return {
    objectId: data.objectId,
    name: String(fields.name ?? 'Unnamed Rotor'),
    wins: Number(fields.wins ?? 0),
    losses: Number(fields.losses ?? 0),
    burstFinishes: Number(fields.burst_finishes ?? 0),
    xtremeFinishes: Number(fields.xtreme_finishes ?? 0),
  };
}

// ─── Name parser ────────────────────────────────────────────────────────

interface RotorConfig {
  blade: string;
  ratchet: string; // "N-N"
  prong: number;
  height: number;
  bit: string;
}

function parseRotorName(name: string): RotorConfig | null {
  // Format: "<blade> <prong>-<height> <bit>" e.g. "Wizard Rod 3-60 Flat"
  const m = name.match(/^(.+?)\s+(\d+)-(\d+)\s+(.+)$/);
  if (!m) return null;
  return {
    blade: m[1].trim(),
    ratchet: `${m[2]}-${m[3]}`,
    prong: parseInt(m[2], 10),
    height: parseInt(m[3], 10),
    bit: m[4].trim(),
  };
}

function winRate(c: BeyCardData): number | null {
  const total = c.wins + c.losses;
  return total > 0 ? c.wins / total : null;
}

// ─── Build analysis ─────────────────────────────────────────────────────

interface FeatureStat {
  key: string;
  uses: number;
  avgWinRate: number;
  totalBattles: number;
}

function analyzeFeature(
  rotors: BeyCardData[],
  picker: (cfg: RotorConfig) => string,
): FeatureStat[] {
  const groups = new Map<string, BeyCardData[]>();
  for (const r of rotors) {
    const cfg = parseRotorName(r.name);
    if (!cfg) continue;
    const key = picker(cfg);
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  const out: FeatureStat[] = [];
  for (const [key, arr] of groups) {
    const battles = arr.reduce((s, r) => s + r.wins + r.losses, 0);
    if (battles === 0) continue;
    const wins = arr.reduce((s, r) => s + r.wins, 0);
    out.push({
      key,
      uses: arr.length,
      avgWinRate: wins / battles,
      totalBattles: battles,
    });
  }
  out.sort((a, b) => b.avgWinRate - a.avgWinRate);
  return out;
}

// ─── Detail page ─────────────────────────────────────────────────────────

export default function RotorDetailPage() {
  const params = useParams<{ id: string }>();
  const rotorId = params?.id ?? '';
  const account = useCurrentAccount();
  const t = useT();
  const isZh = t.nav.home === '首頁';

  // The rotor being viewed (works even for someone else's rotor for sharing)
  const { data: rotorObj, isLoading: loadingRotor } = useSuiClientQuery(
    'getObject',
    { id: rotorId, options: { showContent: true, showType: true } },
    { enabled: !!rotorId, ...FRESH },
  );

  // The current user's full bey collection — for ranking + build analysis
  const { data: ownedObjects } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address ?? '',
      filter: { Package: ORIGINAL_PACKAGE_ID },
      options: { showType: true, showContent: true },
    },
    { enabled: !!account?.address, ...FRESH },
  );

  const allRotors: BeyCardData[] = React.useMemo(() => {
    const items = ownedObjects?.data ?? [];
    const beys = items.filter((i) => i.data?.type?.includes('::bey::'));
    return beys.map(beyToCard).filter((c): c is BeyCardData => c !== null);
  }, [ownedObjects]);

  const rotor: BeyCardData | null = React.useMemo(() => {
    if (!rotorObj?.data) return null;
    return beyToCard({ data: rotorObj.data });
  }, [rotorObj]);

  if (loadingRotor) {
    return (
      <PageHeader
        eyebrow={t.passport.detailEyebrow}
        title={isZh ? '載入中…' : 'Loading…'}
        sub=""
        kanjiBg="證"
      />
    );
  }

  if (!rotor) {
    return (
      <>
        <PageHeader
          eyebrow={t.passport.detailEyebrow}
          title={t.passport.detailNotFound}
          sub={t.passport.detailNotFoundDesc}
          kanjiBg="?"
        />
        <Section>
          <div style={{ textAlign: 'center' }}>
            <Link href="/passport" className="btn btn-ghost">
              {t.passport.detailBack}
            </Link>
          </div>
        </Section>
      </>
    );
  }

  const cfg = parseRotorName(rotor.name);
  const el = elementForBey(rotor.objectId);
  const meta = ELEMENT_MAP[el];
  const myRate = winRate(rotor);
  const myRatePct = myRate != null ? Math.round(myRate * 100) : null;

  // Ranking: sort own rotors by win rate (rotors with no battles fall to bottom)
  const ranked = [...allRotors].sort((a, b) => {
    const ra = winRate(a) ?? -1;
    const rb = winRate(b) ?? -1;
    return rb - ra;
  });
  const rankIndex = ranked.findIndex((r) => r.objectId === rotor.objectId);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const isBest = rank === 1 && myRate != null && allRotors.length > 1;

  // Average win rate across user's rotors that have at least one battle
  const rated = allRotors.filter((r) => r.wins + r.losses > 0);
  const avgWinRate = rated.length
    ? rated.reduce((s, r) => s + (winRate(r) ?? 0), 0) / rated.length
    : null;

  // Build analysis
  const enoughForAnalysis = allRotors.length >= 3 && rated.length >= 1;
  const bladeStats = enoughForAnalysis ? analyzeFeature(allRotors, (c) => c.blade) : [];
  const ratchetStats = enoughForAnalysis ? analyzeFeature(allRotors, (c) => c.ratchet) : [];
  const bitStats = enoughForAnalysis ? analyzeFeature(allRotors, (c) => c.bit) : [];
  const suggested = enoughForAnalysis && bladeStats[0] && ratchetStats[0] && bitStats[0]
    ? { blade: bladeStats[0].key, ratchet: ratchetStats[0].key, bit: bitStats[0].key }
    : null;

  const isOwner = account?.address && rotorObj?.data && (() => {
    // Check ownership for "Take to battle" CTA — if owner field exists
    const fields = (rotorObj.data.content as { fields?: Record<string, unknown> } | undefined)?.fields;
    void fields;
    // Heuristic: if this rotor is in user's owned list
    return allRotors.some((r) => r.objectId === rotor.objectId);
  })();

  return (
    <>
      <PageHeader
        eyebrow={t.passport.detailEyebrow}
        title={
          <>
            {rotor.name}
            {isBest && (
              <span style={{ color: 'var(--gold)', fontSize: '0.4em', verticalAlign: 'middle', marginLeft: 16 }}>
                {t.passport.detailRankBest}
              </span>
            )}
          </>
        }
        sub={
          rank
            ? t.passport.detailRanking + ': ' +
              t.passport.detailRankN
                .replace('{n}', String(rank))
                .replace('{total}', String(allRotors.length))
            : ''
        }
        accent={meta.color}
        kanjiBg={meta.beast}
      />

      <Section>
        <div style={{ marginBottom: 18 }}>
          <Link
            href="/passport"
            className="t-mono"
            style={{
              color: 'var(--text-mute)',
              fontSize: 12,
              textDecoration: 'none',
              letterSpacing: '0.1em',
            }}
          >
            {t.passport.detailBack}
          </Link>
        </div>

        {/* HERO: visual + key stats */}
        <div
          className="panel"
          style={{
            padding: 32,
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 32,
            alignItems: 'center',
            border: `1px solid ${meta.color}55`,
            background: `linear-gradient(140deg, ${meta.color}10, var(--void) 60%, var(--abyss))`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Corners color={meta.color} />
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <Beyblade size={200} element={el} spinSpeed={1.0} />
          </div>
          <div>
            <div
              className="t-mono"
              style={{ fontSize: 11, color: meta.color, letterSpacing: '0.16em', fontWeight: 700 }}
            >
              {meta.k} · {meta.beastNameZh} · {meta.beastName}
            </div>
            <div
              style={{
                fontFamily: 'var(--f-display)',
                fontWeight: 700,
                fontSize: 36,
                lineHeight: 1.1,
                marginTop: 8,
                marginBottom: 6,
              }}
            >
              {rotor.name}
            </div>
            <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 14 }}>
              {t.passport.detailObjectId}: {rotor.objectId.slice(0, 10)}…{rotor.objectId.slice(-6)}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
                paddingTop: 14,
                borderTop: '1px solid var(--border-soft)',
              }}
            >
              <Stat label={t.passport.detailStatBattles} value={rotor.wins + rotor.losses} />
              <Stat label={t.passport.detailStatWins}    value={rotor.wins}             color="var(--wood)" />
              <Stat label={t.passport.detailStatLosses}  value={rotor.losses}           color="var(--text-mute)" />
              <Stat label={t.passport.detailStatWinRate} value={myRatePct != null ? `${myRatePct}%` : '—'} color="var(--gold)" />
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="sf-flex sf-gap-3" style={{ marginTop: 18, flexWrap: 'wrap' }}>
          {isOwner && (
            <Link href="/battle" className="btn btn-primary">
              {t.passport.detailTakeToBattle}
            </Link>
          )}
          {suggested && (
            <Link
              href={`/register?blade=${encodeURIComponent(suggested.blade)}&ratchet=${encodeURIComponent(suggested.ratchet)}&bit=${encodeURIComponent(suggested.bit)}`}
              className="btn btn-ghost"
            >
              {t.passport.detailMintSimilar}
            </Link>
          )}
          <a
            href={`https://suiscan.xyz/testnet/object/${rotor.objectId}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            {t.passport.detailViewOnExplorer}
          </a>
        </div>

        {/* CONFIG BREAKDOWN */}
        <div style={{ marginTop: 48 }}>
          <Eyebrow color={meta.color}>{t.passport.detailConfigTitle}</Eyebrow>
          {cfg ? (
            <div
              className="sf-grid"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14,
                marginTop: 14,
              }}
            >
              <ConfigCard
                accent="var(--fire)"
                label={t.passport.detailConfigBlade}
                value={cfg.blade}
              />
              <ConfigCard
                accent="var(--water)"
                label={t.passport.detailConfigRatchet}
                value={cfg.ratchet}
                hint={`${cfg.prong} prongs · ${cfg.height} mm`}
              />
              <ConfigCard
                accent="var(--wood)"
                label={t.passport.detailConfigBit}
                value={cfg.bit}
              />
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
              {isZh ? '（無法解析名稱）' : '(could not parse name)'}
            </p>
          )}
        </div>

        {/* COMPARISON vs other rotors */}
        {avgWinRate != null && myRate != null && allRotors.length > 1 && (
          <div
            className="panel"
            style={{
              marginTop: 32,
              padding: 22,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 18,
              alignItems: 'center',
            }}
          >
            <div>
              <Eyebrow>{t.passport.detailComparisonTitle}</Eyebrow>
              <div className="t-mono" style={{ marginTop: 10, fontSize: 13, color: 'var(--text-mute)' }}>
                {t.passport.detailComparisonAvg}:{' '}
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>
                  {Math.round(avgWinRate * 100)}%
                </span>
                {' · '}
                {t.passport.detailComparisonThis}:{' '}
                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{myRatePct}%</span>
              </div>
            </div>
            <ComparisonBadge
              avgPct={Math.round(avgWinRate * 100)}
              thisPct={myRatePct ?? 0}
              t={t}
            />
          </div>
        )}

        {/* BUILD ANALYSIS */}
        <div style={{ marginTop: 64 }}>
          <Eyebrow color="var(--gold)">{t.passport.detailAnalyticsTitle}</Eyebrow>
          <p className="muted" style={{ marginTop: 8, fontSize: 14, maxWidth: 720 }}>
            {t.passport.detailAnalyticsSub}
          </p>

          {!enoughForAnalysis ? (
            <div
              className="panel"
              style={{
                marginTop: 14,
                padding: 24,
                borderStyle: 'dashed',
                textAlign: 'center',
              }}
            >
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                {allRotors.length < 3
                  ? t.passport.detailNeedMoreRotors
                  : t.passport.detailNotEnoughData}
              </p>
            </div>
          ) : (
            <>
              <div
                className="sf-grid"
                style={{
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 14,
                  marginTop: 16,
                }}
              >
                <FeatureRanking
                  title={t.passport.detailBestBlade}
                  accent="var(--fire)"
                  stats={bladeStats}
                  t={t}
                />
                <FeatureRanking
                  title={t.passport.detailBestRatchet}
                  accent="var(--water)"
                  stats={ratchetStats}
                  t={t}
                />
                <FeatureRanking
                  title={t.passport.detailBestBit}
                  accent="var(--wood)"
                  stats={bitStats}
                  t={t}
                />
              </div>

              {suggested && (
                <div
                  className="panel"
                  style={{
                    marginTop: 22,
                    padding: 24,
                    border: '1px solid var(--gold)',
                    background: 'linear-gradient(160deg, rgba(212,175,55,0.08), var(--void))',
                  }}
                >
                  <Eyebrow color="var(--gold)">{t.passport.detailRecommendBuild}</Eyebrow>
                  <div
                    className="t-h3"
                    style={{ marginTop: 10, marginBottom: 6, wordBreak: 'break-word' }}
                  >
                    {suggested.blade}{' '}
                    <span style={{ color: 'var(--gold)' }}>{suggested.ratchet}</span>{' '}
                    {suggested.bit}
                  </div>
                  <p className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 14 }}>
                    {t.passport.detailRecommendBuildDesc}
                  </p>
                  <Link
                    href={`/register?blade=${encodeURIComponent(suggested.blade)}&ratchet=${encodeURIComponent(suggested.ratchet)}&bit=${encodeURIComponent(suggested.bit)}`}
                    className="btn btn-primary"
                  >
                    {t.passport.detailMintSimilar}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* OTHER ROTORS */}
        {allRotors.length > 1 && (
          <div style={{ marginTop: 64 }}>
            <Eyebrow>{isZh ? '你的其他陀螺' : 'Your other rotors'}</Eyebrow>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 14,
                marginTop: 14,
              }}
            >
              {allRotors
                .filter((r) => r.objectId !== rotor.objectId)
                .map((r) => (
                  <BeyCard key={r.objectId} bey={r} href={`/passport/${r.objectId}`} compact />
                ))}
            </div>
          </div>
        )}
      </Section>
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function ConfigCard({
  accent,
  label,
  value,
  hint,
}: {
  accent: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className="panel"
      style={{ padding: 18, borderColor: `${accent}55` }}
    >
      <div
        className="t-mono"
        style={{ fontSize: 10, letterSpacing: '0.14em', color: accent, fontWeight: 700 }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-display)',
          fontWeight: 700,
          fontSize: 22,
          marginTop: 8,
          lineHeight: 1.15,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
      {hint && (
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function FeatureRanking({
  title,
  accent,
  stats,
  t,
}: {
  title: string;
  accent: string;
  stats: FeatureStat[];
  t: ReturnType<typeof useT>;
}) {
  if (stats.length === 0) {
    return (
      <div className="panel" style={{ padding: 18 }}>
        <div
          className="t-mono"
          style={{ fontSize: 10, color: accent, letterSpacing: '0.14em', fontWeight: 700 }}
        >
          {title}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 14, margin: 0 }}>
          {t.passport.detailNoSamples}
        </p>
      </div>
    );
  }
  const top = stats[0];
  return (
    <div className="panel" style={{ padding: 18, borderColor: `${accent}55` }}>
      <div
        className="t-mono"
        style={{ fontSize: 10, color: accent, letterSpacing: '0.14em', fontWeight: 700 }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-display)',
          fontWeight: 700,
          fontSize: 20,
          marginTop: 8,
          lineHeight: 1.15,
          wordBreak: 'break-word',
        }}
      >
        {top.key}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Tag color={accent}>
          {t.passport.detailWinRateLabel} {Math.round(top.avgWinRate * 100)}%
        </Tag>
        <Tag color="var(--text-mute)">
          {t.passport.detailUsageLabel} ×{top.uses}
        </Tag>
      </div>
      {stats.length > 1 && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '14px 0 0',
            borderTop: '1px dashed var(--border-soft)',
            paddingTop: 10,
          }}
        >
          {stats.slice(1, 4).map((s) => (
            <li
              key={s.key}
              style={{
                fontSize: 12,
                color: 'var(--text-mute)',
                padding: '4px 0',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.key}
              </span>
              <span className="t-mono" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                {Math.round(s.avgWinRate * 100)}% · ×{s.uses}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ComparisonBadge({
  avgPct,
  thisPct,
  t,
}: {
  avgPct: number;
  thisPct: number;
  t: ReturnType<typeof useT>;
}) {
  const delta = thisPct - avgPct;
  let color: string;
  let label: string;
  let symbol: string;
  if (delta > 0) {
    color = 'var(--wood)';
    label = t.passport.detailComparisonBetter;
    symbol = '↑';
  } else if (delta < 0) {
    color = 'var(--blood)';
    label = t.passport.detailComparisonWorse;
    symbol = '↓';
  } else {
    color = 'var(--text-mute)';
    label = t.passport.detailComparisonEqual;
    symbol = '=';
  }
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '12px 18px',
        borderRadius: 12,
        border: `1px solid ${color}`,
        background: `radial-gradient(circle, ${color}22, transparent)`,
      }}
    >
      <div
        className="t-display"
        style={{ fontSize: 32, color, lineHeight: 1, fontWeight: 700 }}
      >
        {symbol} {Math.abs(delta)}%
      </div>
      <div
        className="t-mono"
        style={{
          fontSize: 10,
          color,
          letterSpacing: '0.12em',
          marginTop: 4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}
