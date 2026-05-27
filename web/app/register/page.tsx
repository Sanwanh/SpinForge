'use client';

import { useState, useCallback } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { PageHeader, Section, SectionHead, Tag, Corners } from '@/components/design/atoms';
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

const SPIRIT_BEASTS = [
  { id: 0, name: '青龍 Seiryu', kanji: '龍', color: 'var(--wood)' },
  { id: 1, name: '朱雀 Suzaku', kanji: '鳳', color: 'var(--fire)' },
  { id: 2, name: '白虎 Byakko', kanji: '虎', color: 'var(--metal)' },
  { id: 3, name: '玄武 Genbu', kanji: '龜', color: 'var(--water)' },
];

const BEY_TYPES = [
  { id: 0, name: '攻擊 Attack', color: 'var(--fire)' },
  { id: 1, name: '防禦 Defense', color: 'var(--water)' },
  { id: 2, name: '持久 Stamina', color: 'var(--wood)' },
  { id: 3, name: '平衡 Balance', color: 'var(--gold)' },
];

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

  if (!account) {
    return (
      <PageHeader
        eyebrow="REGISTER ROTOR"
        title={<>{isZh ? '連接錢包以註冊你的陀螺' : 'Connect wallet to register your top'}</>}
        sub=""
        kanjiBg="鑄"
      />
    );
  }

  if (status === 'done' && result) {
    return (
      <>
        <PageHeader
          eyebrow="REGISTERED"
          title={<>{isZh ? '你的陀螺已上鏈！' : 'Your top is on-chain!'}</>}
          sub=""
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
              }}
            >
              <Corners color="var(--gold)" />
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <div className="t-h3" style={{ marginBottom: 8 }}>{result.name}</div>
              <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>
                Object: {result.beyId.slice(0, 12)}...{result.beyId.slice(-6)}
              </div>
              <div className="t-mono" style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 24 }}>
                TX: {result.digest.slice(0, 16)}...
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <a href="/passport" className="btn btn-primary">{isZh ? '查看護照' : 'View Passport'}</a>
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

  return (
    <>
      <PageHeader
        eyebrow="REGISTER ROTOR · 註冊陀螺"
        title={
          <>
            {isZh ? (
              <>把你手上的<span style={{ color: 'var(--gold)' }}>真實陀螺</span>鑄到鏈上</>
            ) : (
              <>Register your <span style={{ color: 'var(--gold)' }}>real Beyblade</span> on-chain</>
            )}
          </>
        }
        sub={isZh
          ? '輸入你的實體陀螺零件組合，系統會鑄造對應的鏈上物件。從此這顆陀螺的所有對戰紀錄都會永久記錄。'
          : 'Enter your physical Beyblade parts. The system mints a matching on-chain object. All future battle records are permanently linked.'}
        kanjiBg="鑄"
      />

      <Section>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Blade Selection */}
          <div className="panel" style={{ padding: 24, marginBottom: 16 }}>
            <div className="t-eyebrow" style={{ color: 'var(--fire)', marginBottom: 12 }}>
              01 · BLADE · 刃片
            </div>
            <select
              value={blade}
              onChange={(e) => setBlade(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'var(--surface-1)', border: '1px solid var(--border)',
                color: 'var(--text)', fontFamily: 'var(--f-ui)', fontSize: 14,
              }}
            >
              <option value="">{isZh ? '選擇你的 Blade...' : 'Select your Blade...'}</option>
              {REAL_BLADES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>{isZh ? '靈獸' : 'Spirit Beast'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SPIRIT_BEASTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSpirit(s.id)}
                      className={spirit === s.id ? 'btn btn-primary' : 'btn btn-ghost'}
                      style={{ padding: '6px 10px', fontSize: 11, minWidth: 0 }}
                    >
                      {s.kanji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>{isZh ? '類型' : 'Type'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {BEY_TYPES.map((bt) => (
                    <button
                      key={bt.id}
                      onClick={() => setBeyType(bt.id)}
                      className={beyType === bt.id ? 'btn btn-primary' : 'btn btn-ghost'}
                      style={{ padding: '6px 10px', fontSize: 11, minWidth: 0 }}
                    >
                      {bt.id === 0 ? 'ATK' : bt.id === 1 ? 'DEF' : bt.id === 2 ? 'STA' : 'BAL'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>{isZh ? '旋轉方向' : 'Spin Direction'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setSpin(0)} className={spin === 0 ? 'btn btn-primary' : 'btn btn-ghost'} style={{ padding: '6px 16px', fontSize: 12 }}>
                  → Right
                </button>
                <button onClick={() => setSpin(1)} className={spin === 1 ? 'btn btn-primary' : 'btn btn-ghost'} style={{ padding: '6px 16px', fontSize: 12 }}>
                  ← Left
                </button>
              </div>
            </div>
          </div>

          {/* Ratchet Selection */}
          <div className="panel" style={{ padding: 24, marginBottom: 16 }}>
            <div className="t-eyebrow" style={{ color: 'var(--water)', marginBottom: 12 }}>
              02 · RATCHET · 棘齒
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>Prongs (棘齒數)</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {PRONGS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setProng(p)}
                      className={prong === p ? 'btn btn-primary' : 'btn btn-ghost'}
                      style={{ padding: '6px 10px', fontSize: 12, minWidth: 32 }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>Height (高度)</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {HEIGHTS.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHeight(h)}
                      className={height === h ? 'btn btn-primary' : 'btn btn-ghost'}
                      style={{ padding: '6px 10px', fontSize: 12, minWidth: 0 }}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="t-mono" style={{ marginTop: 12, fontSize: 18, color: 'var(--gold)' }}>
              {prong}-{height}
            </div>
          </div>

          {/* Bit Selection */}
          <div className="panel" style={{ padding: 24, marginBottom: 24 }}>
            <div className="t-eyebrow" style={{ color: 'var(--wood)', marginBottom: 12 }}>
              03 · BIT · 底軸
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {REAL_BITS.map((b) => (
                <button
                  key={b.name}
                  onClick={() => { setBit(b.name); setBitCat(b.category); }}
                  className={bit === b.name ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ padding: '6px 12px', fontSize: 11 }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Preview + Register */}
          <div className="panel" style={{ padding: 24, border: blade ? '1px solid var(--gold)' : '1px solid var(--border)' }}>
            <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 12 }}>
              {isZh ? '你的陀螺' : 'YOUR ROTOR'}
            </div>
            <div className="t-h3" style={{ marginBottom: 4 }}>
              {blade || '???'} {prong}-{height} {bit}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              <Tag color={SPIRIT_BEASTS[spirit].color}>{SPIRIT_BEASTS[spirit].kanji} {SPIRIT_BEASTS[spirit].name}</Tag>
              <Tag color={BEY_TYPES[beyType].color}>{BEY_TYPES[beyType].name}</Tag>
              <Tag color="var(--text-mute)">{spin === 0 ? '→ Right' : '← Left'}</Tag>
            </div>

            {error && <p style={{ color: 'var(--blood)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <button
              onClick={handleRegister}
              disabled={!blade || status === 'registering'}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px 0', fontSize: 15 }}
            >
              {status === 'registering'
                ? (isZh ? '鑄造中...' : 'Minting...')
                : (isZh ? '🔗 鑄造到 Sui 鏈上' : '🔗 Mint to Sui')}
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}
