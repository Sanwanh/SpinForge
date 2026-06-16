'use client';

import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { PageHeader, Section, Tag, Corners } from '@/components/design/atoms';
import { useT } from '@/lib/i18n';
import { useGameUser } from '@/hooks/useGameUser';
import { api } from '@/lib/api-fetch';
import { uploadBeyPhoto, MAX_BEY_PHOTO_BYTES } from '@/lib/bey-photo-client';
import { BeyPhotoUpload } from '@/components/shared/BeyPhotoUpload';

const REAL_BLADES = [
  'Wizard Rod', 'Phoenix Wing', 'Dran Sword', 'Shark Edge',
  'Hells Scythe', 'Knight Shield', 'Tyranno Beat', 'Leon Crest',
  'Viper Tail', 'Rhino Horn', 'Unicorn Sting', 'Cobra',
  'Dran Buster', 'Roar Knuckle', 'Chain Kerbeus',
];

const REAL_BITS = [
  { name: 'Rush', category: 0 },
  { name: 'Spike', category: 0 },
  { name: 'Accel', category: 0 },
  { name: 'Flat', category: 1 },
  { name: 'Ball', category: 1 },
  { name: 'Orb', category: 1 },
  { name: 'Unite', category: 1 },
  { name: 'Needle', category: 2 },
  { name: 'High Needle', category: 2 },
  { name: 'Cyclone', category: 2 },
  { name: 'Gear Flat', category: 3 },
  { name: 'Gear Ball', category: 3 },
  { name: 'Gear Needle', category: 3 },
];

const PRONGS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const HEIGHTS = [50, 55, 60, 70, 80, 85];

interface SpiritBeast {
  id: number;
  zh: string;
  en: string;
  kanji: string;
  color: string;
}

const SPIRIT_BEASTS: SpiritBeast[] = [
  { id: 0, zh: '青龍', en: 'Azure Dragon',   kanji: '龍', color: 'var(--wood)' },
  { id: 1, zh: '朱雀', en: 'Vermilion Bird', kanji: '鳳', color: 'var(--fire)' },
  { id: 2, zh: '白虎', en: 'White Tiger',    kanji: '虎', color: 'var(--metal)' },
  { id: 3, zh: '玄武', en: 'Black Tortoise', kanji: '龜', color: 'var(--water)' },
];

interface BeyTypeOpt {
  id: number;
  zh: string;
  en: string;
  short: string;
  color: string;
}

const BEY_TYPES: BeyTypeOpt[] = [
  { id: 0, zh: '攻擊', en: 'Attack',  short: 'ATK', color: 'var(--fire)'  },
  { id: 1, zh: '防禦', en: 'Defense', short: 'DEF', color: 'var(--water)' },
  { id: 2, zh: '持久', en: 'Stamina', short: 'STA', color: 'var(--wood)'  },
  { id: 3, zh: '平衡', en: 'Balance', short: 'BAL', color: 'var(--gold)'  },
];

/**
 * Single source-of-truth chip control. Bypasses the global `.btn` class
 * entirely so padding/letterspacing/text-transform don't fight us.
 */
function Chip({
  active,
  onClick,
  accent = 'var(--gold)',
  height = 40,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent?: string;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        height,
        padding: '0 10px',
        borderRadius: 8,
        background: active
          ? `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 80%, #000))`
          : 'var(--void)',
        border: active ? `1px solid ${accent}` : '1px solid var(--border)',
        color: active ? 'var(--abyss)' : 'var(--text)',
        fontFamily: 'var(--f-ui)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 0,
        textTransform: 'none',
        cursor: 'pointer',
        boxShadow: active ? `0 0 18px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.25)` : 'none',
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.2s, transform 0.1s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      onMouseOver={(e) => {
        if (!active) e.currentTarget.style.borderColor = accent;
      }}
      onMouseOut={(e) => {
        if (!active) e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {children}
    </button>
  );
}

/** Larger 2-line chip for Spirit Beast (kanji + name). */
function BeastChip({
  active,
  onClick,
  beast,
  isZh,
}: {
  active: boolean;
  onClick: () => void;
  beast: SpiritBeast;
  isZh: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '8px 6px',
        borderRadius: 10,
        background: active
          ? `linear-gradient(180deg, ${beast.color}28, var(--void))`
          : 'var(--void)',
        border: active ? `1px solid ${beast.color}` : '1px solid var(--border)',
        color: 'var(--text)',
        cursor: 'pointer',
        boxShadow: active ? `0 0 18px ${beast.color}55` : 'none',
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        height: 64,
      }}
      onMouseOver={(e) => {
        if (!active) e.currentTarget.style.borderColor = beast.color;
      }}
      onMouseOut={(e) => {
        if (!active) e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-han)',
          fontWeight: 900,
          fontSize: 22,
          color: beast.color,
          lineHeight: 1,
        }}
      >
        {beast.kanji}
      </span>
      <span
        style={{
          fontSize: 10,
          letterSpacing: '0.04em',
          color: active ? beast.color : 'var(--text-mute)',
          lineHeight: 1,
          fontWeight: 600,
        }}
      >
        {isZh ? beast.zh : beast.en}
      </span>
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="t-mono"
      style={{
        fontSize: 10,
        color: 'var(--text-dim)',
        letterSpacing: '0.1em',
        marginBottom: 8,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

function SectionEyebrow({
  step,
  color,
  zh,
  en,
  isZh,
}: {
  step: string;
  color: string;
  zh: string;
  en: string;
  isZh: boolean;
}) {
  return (
    <div
      className="t-mono"
      style={{
        color,
        marginBottom: 16,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      }}
    >
      {step} · {isZh ? `${zh} · ${en}` : `${en} · ${zh}`}
    </div>
  );
}

export default function RegisterPage() {
  const { user, isPending } = useGameUser();
  const t = useT();
  const isZh = t.nav.home === '首頁';

  const [blade, setBlade] = useState('');
  const [spirit, setSpirit] = useState(0);
  const [beyType, setBeyType] = useState(0);
  const [spin, setSpin] = useState(0);
  const [prong, setProng] = useState(3);
  const [height, setHeight] = useState(60);
  const [bit, setBit] = useState('Flat');
  const [bitCat, setBitCat] = useState(1);

  const [status, setStatus] = useState<'idle' | 'registering' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ beyId: string; name: string; digest: string } | null>(null);
  const [error, setError] = useState('');

  // Optional NFT-style photo, picked before minting and uploaded right after the
  // Bey object id exists (the photo is keyed by that id).
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoError, setPhotoError] = useState('');

  const onPickPhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    setPhotoError('');
    if (!file) return;
    if (file.size > MAX_BEY_PHOTO_BYTES) {
      setPhotoError(isZh ? '圖片需小於 5 MB' : 'Image must be 5 MB or smaller');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }, [isZh]);

  const handleRegister = useCallback(async () => {
    if (!user || !blade) return;
    setStatus('registering');
    setError('');

    try {
      const res = await api('/api/register-rotor', {
        bladeName: blade,
        spiritBeast: spirit,
        beyType,
        spinDirection: spin,
        ratchetProng: prong,
        ratchetHeight: height,
        bitName: bit,
        bitCategory: bitCat,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed');

      setResult({ beyId: data.beyId, name: data.name, digest: data.digest ?? '' });
      setStatus('done');

      // The Bey now exists on-chain; attach the photo if one was picked. A photo
      // failure must not undo a successful mint — surface it, keep the success.
      if (photoFile && data.beyId) {
        try {
          const url = await uploadBeyPhoto(data.beyId, photoFile);
          setPhotoUrl(url);
        } catch (err) {
          setPhotoError(err instanceof Error ? err.message : 'Photo upload failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setStatus('error');
    }
  }, [user, blade, spirit, beyType, spin, prong, height, bit, bitCat, photoFile]);

  // ─── Loading state ───
  if (isPending) {
    return (
      <PageHeader
        eyebrow={isZh ? '註冊陀螺 · REGISTER ROTOR' : 'REGISTER ROTOR · 註冊陀螺'}
        title={<>{isZh ? '載入中…' : 'Loading…'}</>}
        sub={isZh ? '正在確認你的登入狀態。' : 'Checking your session.'}
        kanjiBg="鑄"
      />
    );
  }

  // ─── Empty state ───
  if (!user) {
    return (
      <>
        <PageHeader
          eyebrow={isZh ? '註冊陀螺 · REGISTER ROTOR' : 'REGISTER ROTOR · 註冊陀螺'}
          title={<>{isZh ? '登入以註冊你的陀螺' : 'Sign in to register your top'}</>}
          sub={isZh ? '把你手上的實體陀螺鑄到 Sui 鏈上。' : 'Mint your physical Beyblade to Sui.'}
          kanjiBg="鑄"
        />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/login" style={{ color: 'var(--gold)', letterSpacing: '0.08em' }}>
            {isZh ? '前往登入 →' : 'Go to sign in →'}
          </Link>
        </div>
      </>
    );
  }

  // ─── Done state ───
  if (status === 'done' && result) {
    return (
      <>
        <PageHeader
          eyebrow={isZh ? '註冊完成 · REGISTERED' : 'REGISTERED · 註冊完成'}
          title={<>{isZh ? '你的陀螺已上鏈！' : 'Your top is on-chain!'}</>}
          sub={isZh ? '所有未來對戰紀錄都會永久綁定到這顆陀螺。' : 'All future battles permanently link to this rotor.'}
          kanjiBg="✓"
        />
        <Section>
          <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
            <div
              className="panel"
              style={{
                padding: 32,
                border: '1px solid var(--gold)',
                boxShadow: '0 0 40px rgba(212,175,55,0.15)',
                position: 'relative',
              }}
            >
              <Corners color="var(--gold)" />
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={result.name}
                  style={{
                    width: 180,
                    height: 180,
                    objectFit: 'cover',
                    borderRadius: 16,
                    border: '1px solid var(--gold)',
                    margin: '0 auto 16px',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              )}
              <div className="t-h3" style={{ marginBottom: 8 }}>{result.name}</div>
              <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
                {isZh ? '物件 ID' : 'Object ID'}: {result.beyId.slice(0, 12)}…{result.beyId.slice(-6)}
              </div>
              {result.digest && (
                <div className="t-mono" style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 24 }}>
                  {isZh ? '交易' : 'TX'}: {result.digest.slice(0, 16)}…
                </div>
              )}
              {!photoUrl && (
                <div style={{ marginBottom: 24 }}>
                  {photoError && (
                    <p className="t-mono" style={{ color: 'var(--blood)', fontSize: 12, marginBottom: 10 }}>
                      {photoError}
                    </p>
                  )}
                  <BeyPhotoUpload
                    beyId={result.beyId}
                    onUploaded={(url) => setPhotoUrl(url)}
                    labels={{
                      add: t.passport.photoAdd,
                      replace: t.passport.photoReplace,
                      uploading: t.passport.photoUploading,
                      hint: t.passport.photoHint,
                      tooLarge: t.passport.photoTooLarge,
                      failed: t.passport.photoFailed,
                    }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/passport" className="btn btn-primary">
                  {isZh ? '查看護照' : 'View Passport'}
                </a>
                <button
                  onClick={() => {
                    setStatus('idle');
                    setResult(null);
                    setPhotoFile(null);
                    setPhotoPreview('');
                    setPhotoUrl('');
                    setPhotoError('');
                  }}
                  className="btn btn-ghost"
                >
                  {isZh ? '再註冊一個' : 'Register Another'}
                </button>
              </div>
            </div>
          </div>
        </Section>
      </>
    );
  }

  // ─── Main form ───
  const selectedSpirit = SPIRIT_BEASTS[spirit];
  const selectedType = BEY_TYPES[beyType];
  const hasBlade = blade.length > 0;

  return (
    <>
      <PageHeader
        eyebrow={isZh ? '註冊陀螺 · REGISTER ROTOR' : 'REGISTER ROTOR · 註冊陀螺'}
        title={
          isZh ? (
            <>把你的<span style={{ color: 'var(--gold)' }}>實體陀螺</span>鑄到鏈上</>
          ) : (
            <>Register your <span style={{ color: 'var(--gold)' }}>real Beyblade</span> on-chain</>
          )
        }
        sub={isZh
          ? '輸入你手上的實體陀螺零件組合，系統會在 Sui 上鑄造對應的鏈上物件。從此這顆陀螺的所有對戰紀錄都會永久寫入。'
          : 'Enter your physical Beyblade parts. The system mints a matching on-chain object. All future battles are permanently recorded.'}
        kanjiBg="鑄"
      />

      <Section>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'grid', gap: 16 }}>
          {/* ─── BLADE ─── */}
          <div className="panel" style={{ padding: 24 }}>
            <SectionEyebrow
              step="01"
              color="var(--fire)"
              zh="刃片"
              en="BLADE"
              isZh={isZh}
            />

            <FieldLabel>{isZh ? '型號' : 'Model'}</FieldLabel>
            <select
              value={blade}
              onChange={(e) => setBlade(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--void)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontFamily: 'var(--f-ui)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                outline: 'none',
                marginBottom: 18,
              }}
            >
              <option value="">{isZh ? '── 選擇你的 Blade ──' : '── Select your Blade ──'}</option>
              {REAL_BLADES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <FieldLabel>{isZh ? '靈獸' : 'Spirit Beast'}</FieldLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {SPIRIT_BEASTS.map((s) => (
                <BeastChip
                  key={s.id}
                  beast={s}
                  active={spirit === s.id}
                  isZh={isZh}
                  onClick={() => setSpirit(s.id)}
                />
              ))}
            </div>

            <FieldLabel>{isZh ? '類型' : 'Type'}</FieldLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {BEY_TYPES.map((bt) => (
                <Chip
                  key={bt.id}
                  active={beyType === bt.id}
                  accent={bt.color}
                  onClick={() => setBeyType(bt.id)}
                >
                  {isZh ? bt.zh : bt.short}
                </Chip>
              ))}
            </div>

            <FieldLabel>{isZh ? '旋轉方向' : 'Spin Direction'}</FieldLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              <Chip active={spin === 0} onClick={() => setSpin(0)}>
                → {isZh ? '右旋' : 'Right'}
              </Chip>
              <Chip active={spin === 1} onClick={() => setSpin(1)}>
                ← {isZh ? '左旋' : 'Left'}
              </Chip>
            </div>
          </div>

          {/* ─── RATCHET ─── */}
          <div className="panel" style={{ padding: 24 }}>
            <SectionEyebrow
              step="02"
              color="var(--water)"
              zh="棘齒"
              en="RATCHET"
              isZh={isZh}
            />

            <FieldLabel>{isZh ? '齒數 Prongs' : 'Prongs'}</FieldLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: 6,
                marginBottom: 16,
              }}
            >
              {PRONGS.map((p) => (
                <Chip
                  key={p}
                  active={prong === p}
                  height={36}
                  onClick={() => setProng(p)}
                >
                  {p}
                </Chip>
              ))}
            </div>

            <FieldLabel>{isZh ? '高度 Height (mm)' : 'Height (mm)'}</FieldLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 6,
              }}
            >
              {HEIGHTS.map((h) => (
                <Chip
                  key={h}
                  active={height === h}
                  height={36}
                  onClick={() => setHeight(h)}
                >
                  {h}
                </Chip>
              ))}
            </div>

            <div
              className="t-mono"
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: '1px solid var(--border-soft)',
                fontSize: 22,
                color: 'var(--gold)',
                letterSpacing: '0.04em',
                fontWeight: 700,
              }}
            >
              {prong}-{height}
            </div>
          </div>

          {/* ─── BIT ─── */}
          <div className="panel" style={{ padding: 24 }}>
            <SectionEyebrow
              step="03"
              color="var(--wood)"
              zh="底軸"
              en="BIT"
              isZh={isZh}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: 8,
              }}
            >
              {REAL_BITS.map((b) => (
                <Chip
                  key={b.name}
                  active={bit === b.name}
                  onClick={() => { setBit(b.name); setBitCat(b.category); }}
                >
                  {b.name}
                </Chip>
              ))}
            </div>
          </div>

          {/* ─── PHOTO (optional) ─── */}
          <div className="panel" style={{ padding: 24 }}>
            <SectionEyebrow
              step="04"
              color="var(--gold)"
              zh="照片"
              en="PHOTO"
              isZh={isZh}
            />
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 12,
                  border: '1px dashed var(--border)',
                  background: 'var(--void)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                  padding: 0,
                }}
                aria-label={isZh ? '上傳陀螺照片' : 'Upload Bey photo'}
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 28, opacity: 0.5 }}>📷</span>
                )}
              </button>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>
                  {isZh ? '上傳你實體陀螺的照片（選填）' : 'Add a photo of your real Beyblade (optional)'}
                </div>
                <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {isZh
                    ? 'JPEG / PNG / WebP · 最大 5 MB · 鑄造後自動附上'
                    : 'JPEG / PNG / WebP · max 5 MB · attached right after minting'}
                </div>
                {photoError && (
                  <div className="t-mono" style={{ fontSize: 11, color: 'var(--blood)', marginTop: 6 }}>
                    {photoError}
                  </div>
                )}
                {photoFile && (
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(''); setPhotoError(''); }}
                    className="t-mono"
                    style={{
                      marginTop: 8,
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-mute)',
                      fontSize: 11,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    {isZh ? '移除' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPickPhoto}
              style={{ display: 'none' }}
            />
          </div>

          {/* ─── PREVIEW + REGISTER ─── */}
          <div
            className="panel"
            style={{
              padding: 24,
              border: hasBlade ? '1px solid var(--gold)' : '1px solid var(--border-soft)',
              boxShadow: hasBlade ? '0 0 32px rgba(212,175,55,0.1)' : undefined,
              transition: 'box-shadow 0.2s, border-color 0.2s',
            }}
          >
            <div
              className="t-mono"
              style={{
                color: 'var(--gold)',
                marginBottom: 14,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {isZh ? '你的陀螺 · YOUR ROTOR' : 'YOUR ROTOR · 你的陀螺'}
            </div>

            {hasBlade ? (
              <>
                <div
                  className="t-h3"
                  style={{ marginBottom: 8, wordBreak: 'break-word', lineHeight: 1.2 }}
                >
                  {blade} <span style={{ color: 'var(--gold)' }}>{prong}-{height}</span> {bit}
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
                  <Tag color={selectedSpirit.color}>
                    {selectedSpirit.kanji} {isZh ? selectedSpirit.zh : selectedSpirit.en}
                  </Tag>
                  <Tag color={selectedType.color}>
                    {isZh ? selectedType.zh : selectedType.en}
                  </Tag>
                  <Tag color="var(--text-mute)">
                    {spin === 0 ? `→ ${isZh ? '右旋' : 'Right'}` : `← ${isZh ? '左旋' : 'Left'}`}
                  </Tag>
                </div>
              </>
            ) : (
              <div
                className="muted"
                style={{
                  fontSize: 14,
                  padding: '20px 0',
                  marginBottom: 12,
                  textAlign: 'center',
                  borderRadius: 8,
                  border: '1px dashed var(--border-soft)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {isZh ? '請先在上方選擇一個 Blade' : 'Pick a Blade above to preview'}
              </div>
            )}

            {error && (
              <p
                className="t-mono"
                style={{
                  color: 'var(--blood)',
                  fontSize: 12,
                  marginBottom: 12,
                  padding: 10,
                  border: '1px solid rgba(255,51,51,0.3)',
                  borderRadius: 6,
                  background: 'rgba(255,51,51,0.08)',
                }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleRegister}
              disabled={!hasBlade || status === 'registering'}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px 0',
                fontSize: 14,
                justifyContent: 'center',
              }}
            >
              {status === 'registering'
                ? (isZh ? '鑄造中…' : 'Minting…')
                : (isZh ? '🔗 鑄造到 Sui 鏈上' : '🔗 Mint to Sui')}
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}
