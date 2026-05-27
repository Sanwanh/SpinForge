'use client';

import { useState, useCallback } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { PageHeader, Section, Tag, Corners } from '@/components/design/atoms';
import { useT } from '@/lib/i18n';

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
  { id: 0, zh: '青龍',   en: 'Azure Dragon',   kanji: '龍', color: 'var(--wood)' },
  { id: 1, zh: '朱雀',   en: 'Vermilion Bird', kanji: '鳳', color: 'var(--fire)' },
  { id: 2, zh: '白虎',   en: 'White Tiger',    kanji: '虎', color: 'var(--metal)' },
  { id: 3, zh: '玄武',   en: 'Black Tortoise', kanji: '龜', color: 'var(--water)' },
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

// Common inline styles
const SELECT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  background: 'var(--void)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontFamily: 'var(--f-ui)',
  fontSize: 14,
  cursor: 'pointer',
  outline: 'none',
};

const CHIP_BTN_BASE: React.CSSProperties = {
  padding: '7px 12px',
  fontSize: 12,
  minWidth: 0,
  whiteSpace: 'nowrap',
  letterSpacing: 0,
  textTransform: 'none',
};

const CHIP_NUM: React.CSSProperties = {
  ...CHIP_BTN_BASE,
  padding: '7px 0',
  minWidth: 40,
  width: 40,
  textAlign: 'center',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function RegisterPage() {
  const account = useCurrentAccount();
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

  const handleRegister = useCallback(async () => {
    if (!account?.address || !blade) return;
    setStatus('registering');
    setError('');

    try {
      const res = await fetch('/api/register-rotor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: account.address,
          bladeName: blade,
          spiritBeast: spirit,
          beyType,
          spinDirection: spin,
          ratchetProng: prong,
          ratchetHeight: height,
          bitName: bit,
          bitCategory: bitCat,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult({ beyId: data.beyId, name: data.name, digest: data.digest });
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setStatus('error');
    }
  }, [account, blade, spirit, beyType, spin, prong, height, bit, bitCat]);

  // ─── Empty state ───
  if (!account) {
    return (
      <>
        <PageHeader
          eyebrow={isZh ? '註冊陀螺 · REGISTER ROTOR' : 'REGISTER ROTOR · 註冊陀螺'}
          title={<>{isZh ? '連接錢包以註冊你的陀螺' : 'Connect wallet to register your top'}</>}
          sub={isZh ? '把你手上的實體陀螺鑄到 Sui 鏈上。' : 'Mint your physical Beyblade to Sui.'}
          kanjiBg="鑄"
        />
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
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <div className="t-h3" style={{ marginBottom: 8 }}>{result.name}</div>
              <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
                {isZh ? '物件 ID' : 'Object ID'}: {result.beyId.slice(0, 12)}…{result.beyId.slice(-6)}
              </div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 24 }}>
                {isZh ? '交易' : 'TX'}: {result.digest.slice(0, 16)}…
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/passport" className="btn btn-primary">
                  {isZh ? '查看護照' : 'View Passport'}
                </a>
                <button onClick={() => { setStatus('idle'); setResult(null); }} className="btn btn-ghost">
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

  return (
    <>
      <PageHeader
        eyebrow={isZh ? '註冊陀螺 · REGISTER ROTOR' : 'REGISTER ROTOR · 註冊陀螺'}
        title={
          <>
            {isZh ? (
              <>把你的<span style={{ color: 'var(--gold)' }}>實體陀螺</span>鑄到鏈上</>
            ) : (
              <>Register your <span style={{ color: 'var(--gold)' }}>real Beyblade</span> on-chain</>
            )}
          </>
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
            <div className="t-eyebrow" style={{ color: 'var(--fire)', marginBottom: 14 }}>
              01 · {isZh ? '刃片 · BLADE' : 'BLADE · 刃片'}
            </div>

            <label
              className="t-mono"
              style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}
            >
              {isZh ? '型號' : 'Model'}
            </label>
            <select value={blade} onChange={(e) => setBlade(e.target.value)} style={SELECT_STYLE}>
              <option value="">{isZh ? '── 選擇你的 Blade ──' : '── Select your Blade ──'}</option>
              {REAL_BLADES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Spirit Beast */}
            <div style={{ marginTop: 18 }}>
              <div
                className="t-mono"
                style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}
              >
                {isZh ? '靈獸' : 'Spirit Beast'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {SPIRIT_BEASTS.map((s) => {
                  const active = spirit === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSpirit(s.id)}
                      className={active ? 'btn btn-primary' : 'btn btn-ghost'}
                      style={{
                        ...CHIP_BTN_BASE,
                        padding: '10px 4px',
                        flexDirection: 'column',
                        gap: 2,
                        lineHeight: 1.1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--f-han)',
                          fontSize: 18,
                          color: active ? 'var(--abyss)' : s.color,
                        }}
                      >
                        {s.kanji}
                      </span>
                      <span style={{ fontSize: 10, opacity: 0.85 }}>
                        {isZh ? s.zh : s.en}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type */}
            <div style={{ marginTop: 16 }}>
              <div
                className="t-mono"
                style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}
              >
                {isZh ? '類型' : 'Type'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {BEY_TYPES.map((bt) => {
                  const active = beyType === bt.id;
                  return (
                    <button
                      key={bt.id}
                      onClick={() => setBeyType(bt.id)}
                      className={active ? 'btn btn-primary' : 'btn btn-ghost'}
                      style={{ ...CHIP_BTN_BASE, padding: '8px 0' }}
                    >
                      {isZh ? bt.zh : bt.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spin */}
            <div style={{ marginTop: 16 }}>
              <div
                className="t-mono"
                style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}
              >
                {isZh ? '旋轉方向' : 'Spin Direction'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSpin(0)}
                  className={spin === 0 ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ ...CHIP_BTN_BASE, padding: '8px 16px' }}
                >
                  → {isZh ? '右旋' : 'Right'}
                </button>
                <button
                  onClick={() => setSpin(1)}
                  className={spin === 1 ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ ...CHIP_BTN_BASE, padding: '8px 16px' }}
                >
                  ← {isZh ? '左旋' : 'Left'}
                </button>
              </div>
            </div>
          </div>

          {/* ─── RATCHET ─── */}
          <div className="panel" style={{ padding: 24 }}>
            <div className="t-eyebrow" style={{ color: 'var(--water)', marginBottom: 14 }}>
              02 · {isZh ? '棘齒 · RATCHET' : 'RATCHET · 棘齒'}
            </div>

            <div
              className="t-mono"
              style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}
            >
              {isZh ? '齒數 (Prongs)' : 'Prongs'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(40px, 1fr))',
                gap: 6,
                marginBottom: 16,
              }}
            >
              {PRONGS.map((p) => (
                <button
                  key={p}
                  onClick={() => setProng(p)}
                  className={prong === p ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={CHIP_NUM}
                >
                  {p}
                </button>
              ))}
            </div>

            <div
              className="t-mono"
              style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}
            >
              {isZh ? '高度 (Height, mm)' : 'Height (mm)'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))',
                gap: 6,
              }}
            >
              {HEIGHTS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHeight(h)}
                  className={height === h ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ ...CHIP_NUM, minWidth: 48, width: 'auto' }}
                >
                  {h}
                </button>
              ))}
            </div>

            <div
              className="t-mono"
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid var(--border-soft)',
                fontSize: 22,
                color: 'var(--gold)',
                letterSpacing: '0.04em',
              }}
            >
              {prong}-{height}
            </div>
          </div>

          {/* ─── BIT ─── */}
          <div className="panel" style={{ padding: 24 }}>
            <div className="t-eyebrow" style={{ color: 'var(--wood)', marginBottom: 14 }}>
              03 · {isZh ? '底軸 · BIT' : 'BIT · 底軸'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
                gap: 6,
              }}
            >
              {REAL_BITS.map((b) => (
                <button
                  key={b.name}
                  onClick={() => { setBit(b.name); setBitCat(b.category); }}
                  className={bit === b.name ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={CHIP_BTN_BASE}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* ─── PREVIEW + REGISTER ─── */}
          <div
            className="panel"
            style={{
              padding: 24,
              border: blade ? '1px solid var(--gold)' : '1px solid var(--border)',
              boxShadow: blade ? '0 0 32px rgba(212,175,55,0.1)' : undefined,
              transition: 'box-shadow 0.2s, border-color 0.2s',
            }}
          >
            <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 12 }}>
              {isZh ? '你的陀螺 · YOUR ROTOR' : 'YOUR ROTOR · 你的陀螺'}
            </div>
            <div className="t-h3" style={{ marginBottom: 8, wordBreak: 'break-word' }}>
              {blade || (isZh ? '（請先選擇 Blade）' : '(Select a Blade first)')} {prong}-{height} {bit}
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
              disabled={!blade || status === 'registering'}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px 0', fontSize: 14 }}
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
