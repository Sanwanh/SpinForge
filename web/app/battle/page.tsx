'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { useInventory } from '@/hooks/useInventory';
import { PageHeader, Section, Tag, Corners, Stat } from '@/components/design/atoms';
import {
  BeyCard,
  type BeyCardData,
  getLastUsedRotor,
  setLastUsedRotor,
} from '@/components/design/BeyCard';
import { useT } from '@/lib/i18n';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthSig, useCachedAuthSig } from '@/lib/use-auth-sig';

type Phase = 'create' | 'waiting' | 'select' | 'battle' | 'submit' | 'confirmed' | 'done';

interface RoomData {
  id: string;
  creator: string;
  opponent: string | null;
  creatorRotor: string | null;
  opponentRotor: string | null;
  creatorRotorName?: string | null;
  opponentRotorName?: string | null;
  status: string;
  result: { winner: string; finishType: number; scoreA: number; scoreB: number } | null;
}

function beyFromInventory(b: { objectId: string; fields: Record<string, unknown> }): BeyCardData {
  return {
    objectId: b.objectId,
    name: String(b.fields.name ?? 'Rotor'),
    wins: Number(b.fields.wins ?? 0),
    losses: Number(b.fields.losses ?? 0),
    burstFinishes: Number(b.fields.burst_finishes ?? 0),
    xtremeFinishes: Number(b.fields.xtreme_finishes ?? 0),
  };
}

const FINISH_LABELS: Record<number, string> = {
  0: 'Spin Finish (1pt)',
  1: 'Over Finish (2pt)',
  2: 'Burst Finish (2pt)',
  3: 'Xtreme Finish (3pt)',
};

export default function BattlePage() {
  const account = useCurrentAccount();
  const getAuthSig = useAuthSig();
  const getCachedAuth = useCachedAuthSig();
  const { beys } = useInventory();
  const t = useT();
  const isZh = t.nav.home === '首頁';

  const [phase, setPhase] = useState<Phase>('create');
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<RoomData | null>(null);
  const [selectedRotor, setSelectedRotor] = useState('');

  // Pre-select the rotor the user used last time, if it's still in inventory
  useEffect(() => {
    if (selectedRotor) return;
    if (phase !== 'select') return;
    if (beys.length === 0) return;
    const last = getLastUsedRotor();
    if (last && beys.some((b) => b.objectId === last)) {
      setSelectedRotor(last);
    }
  }, [phase, beys, selectedRotor]);
  const [winner, setWinner] = useState('');
  const [finishType, setFinishType] = useState(0);
  const [scoreA, setScoreA] = useState(7);
  const [scoreB, setScoreB] = useState(0);
  const [error, setError] = useState('');
  const [onChainId, setOnChainId] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const api = useCallback(async (body: Record<string, unknown>) => {
    // Mutating room actions must carry a wallet signature; 'get' is a read.
    let payload = body;
    if (body.action && body.action !== 'get') {
      const auth = await getCachedAuth();
      payload = { ...body, ...auth };
    }
    const res = await fetch('/api/battle-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }, [getCachedAuth]);

  const handleCreate = useCallback(async () => {
    if (!account) return;
    const data = await api({ action: 'create', creator: account.address });
    if (data.roomId) {
      setRoomId(data.roomId);
      setRoom(data.room);
      setPhase('waiting');
    }
  }, [account, api]);

  const handleJoin = useCallback(async () => {
    if (!account || !joinCode) return;
    const data = await api({ action: 'join', roomId: joinCode, opponent: account.address });
    if (data.success) {
      setRoomId(joinCode);
      setRoom(data.room);
      setPhase('select');
    } else {
      setError(data.error);
    }
  }, [account, joinCode, api]);

  const handleSelectRotor = useCallback(async () => {
    if (!account || !selectedRotor) return;
    const selectedBey = beys.find((b) => b.objectId === selectedRotor);
    const rotorName = selectedBey ? String(selectedBey.fields.name ?? 'Rotor') : 'Rotor';
    const data = await api({
      action: 'select-rotor',
      roomId,
      player: account.address,
      rotorId: selectedRotor,
      rotorName,
    });
    if (data.success) {
      setLastUsedRotor(selectedRotor);
      setRoom(data.room);
      if (data.room.status === 'in_progress') setPhase('battle');
    }
  }, [account, selectedRotor, roomId, beys, api]);

  const handleSubmitResult = useCallback(async () => {
    if (!account || !winner) return;
    const data = await api({
      action: 'submit-result', roomId, submitter: account.address,
      winner, finishType, scoreA, scoreB,
    });
    if (data.success) { setRoom(data.room); setPhase('submit'); }
  }, [account, roomId, winner, finishType, scoreA, scoreB, api]);

  const handleConfirm = useCallback(async () => {
    if (!account) return;
    await api({ action: 'confirm-result', roomId, confirmer: account.address });

    // Commit to chain — sign so the server can verify we're a participant.
    const auth = await getAuthSig();
    const res = await fetch('/api/submit-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerA: room?.creator,
        playerB: room?.opponent,
        rotorA: room?.creatorRotor ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
        rotorB: room?.opponentRotor ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
        winner, finishType, scoreA, scoreB,
        submitter: auth.address,
        authMessage: auth.authMessage,
        authSignature: auth.authSignature,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setOnChainId(data.recordId);
      setPhase('done');
    } else {
      setError(data.error);
    }
  }, [account, getAuthSig, roomId, room, winner, finishType, scoreA, scoreB, api]);

  // Poll for room updates during waiting / select / submit phases so each
  // player sees the other's selection + result without manual refresh.
  useEffect(() => {
    if (phase !== 'waiting' && phase !== 'select' && phase !== 'submit') return;
    const interval = setInterval(async () => {
      const data = await api({ action: 'get', roomId });
      if (!data.room) return;
      setRoom(data.room);
      if (phase === 'waiting' && data.room.status === 'ready') setPhase('select');
      if (phase === 'select' && data.room.status === 'in_progress') setPhase('battle');
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, roomId, api]);

  // Deep-link from the Friends page: ?join=CODE auto-joins as opponent,
  // ?room=CODE resumes as the room creator (waiting for the friend to join).
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || !account) return;
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    const roomParam = params.get('room');
    if (!joinParam && !roomParam) return;
    deepLinkHandled.current = true;
    (async () => {
      if (joinParam) {
        const data = await api({ action: 'join', roomId: joinParam, opponent: account.address });
        const target = data.room ?? (await api({ action: 'get', roomId: joinParam })).room;
        if (target) {
          setRoomId(joinParam);
          setRoom(target);
          setPhase('select');
        } else if (data.error) {
          setError(data.error);
        }
      } else if (roomParam) {
        const got = await api({ action: 'get', roomId: roomParam });
        if (got.room) {
          setRoomId(roomParam);
          setRoom(got.room);
          setPhase(got.room.status === 'waiting' ? 'waiting' : 'select');
        }
      }
    })();
  }, [account, api]);

  // Opponent's bey object (fetched directly from chain so we always see
  // their real name + stats — independent of what the room cache claims).
  const opponentAddress = account
    ? (room?.creator === account.address ? room?.opponent : room?.creator)
    : null;
  const opponentRotorId = account
    ? (room?.creator === account.address ? room?.opponentRotor : room?.creatorRotor)
    : null;

  const { data: opponentBeyObj } = useSuiClientQuery(
    'getObject',
    {
      id: opponentRotorId ?? '',
      options: { showContent: true, showType: true },
    },
    { enabled: !!opponentRotorId },
  );

  const opponentBey: BeyCardData | null = useMemo(() => {
    if (!opponentBeyObj?.data?.content) return null;
    const content = opponentBeyObj.data.content;
    if (content.dataType !== 'moveObject') return null;
    const fields = content.fields as Record<string, unknown>;
    return {
      objectId: opponentBeyObj.data.objectId ?? '',
      name: String(fields.name ?? 'Opponent Rotor'),
      wins: Number(fields.wins ?? 0),
      losses: Number(fields.losses ?? 0),
      burstFinishes: Number(fields.burst_finishes ?? 0),
      xtremeFinishes: Number(fields.xtreme_finishes ?? 0),
    };
  }, [opponentBeyObj]);

  if (!account) {
    return (
      <PageHeader eyebrow="BATTLE" title={<>{isZh ? '連接錢包開始對戰' : 'Connect wallet to battle'}</>} sub="" kanjiBg="戰" />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="PHYSICAL BATTLE · 實體對戰"
        title={<>{isZh ? <>現實對戰，<span style={{ color: 'var(--gold)' }}>鏈上紀錄。</span></> : <>Real battle, <span style={{ color: 'var(--gold)' }}>on-chain record.</span></>}</>}
        sub={isZh ? '在現實中發射你的陀螺對戰，賽後雙方確認結果，永久寫入 Sui 區塊鏈。' : 'Launch your real Beyblades. After the match, both players confirm the result. Permanently written to Sui.'}
        kanjiBg="戰"
      />

      <Section>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {error && (
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,51,51,0.1)', border: '1px solid rgba(255,51,51,0.3)', color: 'var(--blood)', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Phase: Create or Join */}
          {phase === 'create' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="panel" style={{ padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚔️</div>
                <div className="t-h3" style={{ marginBottom: 8 }}>{isZh ? '建立對戰房間' : 'Create Battle Room'}</div>
                <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
                  {isZh ? '建立房間後分享代碼給對手' : 'Create a room and share the code with your opponent'}
                </p>
                <button onClick={handleCreate} className="btn btn-primary" style={{ padding: '12px 32px' }}>
                  {isZh ? '建立房間' : 'Create Room'}
                </button>
              </div>

              <div className="panel" style={{ padding: 28 }}>
                <div className="t-eyebrow" style={{ marginBottom: 12 }}>{isZh ? '或輸入房間代碼加入' : 'Or enter room code to join'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ROOM CODE"
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8,
                      background: 'var(--void)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontFamily: 'var(--f-mono)', fontSize: 16,
                      letterSpacing: '0.15em', textTransform: 'uppercase',
                    }}
                  />
                  <button onClick={handleJoin} disabled={!joinCode} className="btn btn-primary">
                    {isZh ? '加入' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Phase: Waiting for opponent */}
          {phase === 'waiting' && (
            <div className="panel" style={{ padding: 32, textAlign: 'center', border: '1px solid var(--gold)' }}>
              <Corners color="var(--gold)" />
              <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 8 }}>{isZh ? '房間代碼' : 'Room Code'}</div>
              <div className="t-display" style={{ fontSize: 48, letterSpacing: '0.2em', color: 'var(--gold)' }}>
                {roomId}
              </div>

              <div style={{ background: '#fff', padding: 10, borderRadius: 12, display: 'inline-block', margin: '18px 0 4px', lineHeight: 0 }}>
                <QRCodeSVG
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/battle?join=${roomId}`}
                  size={140}
                  bgColor="#ffffff"
                  fgColor="#0a0e17"
                  level="M"
                />
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                {isZh ? '讓對手掃描 QR,或把邀請連結 / 代碼傳給他' : 'Have your opponent scan the QR, or send them the link / code'}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/battle?join=${roomId}`);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 1500);
                }}
                className="btn btn-primary"
                style={{ marginTop: 12, padding: '10px 24px' }}
              >
                {linkCopied ? (isZh ? '✓ 連結已複製' : '✓ Link copied') : (isZh ? '複製邀請連結' : 'Copy invite link')}
              </button>
              <div style={{ width: 24, height: 24, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '20px auto 0' }} />
            </div>
          )}

          {/* Phase: Select Rotor */}
          {phase === 'select' && (() => {
            const lastUsedId = getLastUsedRotor();
            const myRotorId = account ? (room?.creator === account.address ? room?.creatorRotor : room?.opponentRotor) : null;
            const myConfirmed = !!myRotorId;
            const opponentConfirmed = !!opponentRotorId;
            return (
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Opponent status strip */}
                {(opponentAddress || opponentConfirmed) && (
                  <div
                    className="panel"
                    style={{
                      padding: 18,
                      borderColor: opponentConfirmed ? 'var(--wood)' : 'var(--border-soft)',
                    }}
                  >
                    <div
                      className="t-mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        color: opponentConfirmed ? 'var(--wood)' : 'var(--text-dim)',
                        marginBottom: 8,
                      }}
                    >
                      {isZh ? '對手' : 'OPPONENT'}{opponentAddress ? ` · ${opponentAddress.slice(0, 6)}…${opponentAddress.slice(-4)}` : ''}
                    </div>
                    {opponentBey ? (
                      <BeyCard bey={opponentBey} compact />
                    ) : opponentConfirmed ? (
                      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                        {isZh ? '對手已選好，正在載入資料…' : 'Opponent ready, fetching…'}
                      </p>
                    ) : (
                      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                        {isZh ? '對手還在挑陀螺…' : 'Opponent is still choosing…'}
                      </p>
                    )}
                  </div>
                )}

                {/* My rotor selector */}
                <div className="panel" style={{ padding: 28 }}>
                  <div
                    className="sf-flex sf-justify-between sf-items-center"
                    style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}
                  >
                    <div className="t-eyebrow" style={{ color: 'var(--gold)' }}>
                      {isZh ? '選擇你的陀螺' : 'Select Your Rotor'} · {beys.length}
                    </div>
                    {myConfirmed && (
                      <span
                        className="t-mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--wood)',
                          letterSpacing: '0.1em',
                        }}
                      >
                        ✓ {isZh ? '已確認' : 'CONFIRMED'}
                      </span>
                    )}
                  </div>

                  {beys.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32 }}>
                      <p className="muted" style={{ marginBottom: 18 }}>
                        {isZh ? '你還沒有可出戰的陀螺。用卡包零件去工坊組裝,或註冊一台實體陀螺。' : 'No battle-ready rotor yet. Assemble pack parts in the Workshop, or register a physical one.'}
                      </p>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="/workshop" className="btn btn-primary">
                          {isZh ? '前往工坊組裝' : 'Assemble in Workshop'}
                        </a>
                        <a href="/register" className="btn btn-ghost">
                          {isZh ? '註冊實體陀螺' : 'Register Physical'}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                          gap: 12,
                          marginBottom: 18,
                        }}
                      >
                        {beys.map((b) => {
                          const card = beyFromInventory(b);
                          return (
                            <BeyCard
                              key={b.objectId}
                              bey={card}
                              selected={selectedRotor === b.objectId}
                              lastUsed={lastUsedId === b.objectId && selectedRotor !== b.objectId}
                              onClick={myConfirmed ? undefined : () => setSelectedRotor(b.objectId)}
                            />
                          );
                        })}
                      </div>
                      {!myConfirmed && (
                        <button
                          onClick={handleSelectRotor}
                          disabled={!selectedRotor}
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '14px 0', fontSize: 14 }}
                        >
                          {isZh ? '確認選擇' : 'Confirm Selection'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Phase: Physical Battle in Progress */}
          {phase === 'battle' && (() => {
            const myBey = beys.find((b) => b.objectId === selectedRotor);
            const myCard = myBey ? beyFromInventory(myBey) : null;
            return (
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Matchup: my rotor vs opponent's rotor */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    gap: 14,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      className="t-mono"
                      style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: 6 }}
                    >
                      {isZh ? '你' : 'YOU'}
                    </div>
                    {myCard ? <BeyCard bey={myCard} compact /> : null}
                  </div>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      border: '1px solid var(--gold)',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'radial-gradient(circle, rgba(212,175,55,0.18), transparent)',
                      boxShadow: '0 0 20px rgba(212,175,55,0.3)',
                      fontFamily: 'var(--f-display)',
                      fontWeight: 700,
                      fontSize: 20,
                      color: 'var(--gold)',
                    }}
                  >
                    VS
                  </div>
                  <div>
                    <div
                      className="t-mono"
                      style={{ fontSize: 10, color: 'var(--blood)', letterSpacing: '0.12em', marginBottom: 6, textAlign: 'right' }}
                    >
                      {isZh ? '對手' : 'OPPONENT'}
                    </div>
                    {opponentBey ? <BeyCard bey={opponentBey} compact /> : (
                      <p className="muted" style={{ fontSize: 12, margin: 0, textAlign: 'right' }}>
                        {isZh ? '載入中…' : 'loading…'}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className="panel"
                  style={{ padding: 32, textAlign: 'center', border: '1px solid var(--fire)' }}
                >
                  <div style={{ fontSize: 64, marginBottom: 16 }}>🔥</div>
                  <div className="t-h3" style={{ marginBottom: 8 }}>
                    {isZh ? '開始實體對戰！' : 'Battle Now!'}
                  </div>
                  <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
                    {isZh
                      ? '在現實中發射你們的陀螺。結束後由勝者提交結果。'
                      : 'Launch your Beyblades in real life. The winner submits the result after.'}
                  </p>
                  <button
                    onClick={() => setPhase('submit')}
                    className="btn btn-primary"
                    style={{ padding: '12px 32px' }}
                  >
                    {isZh ? '對戰結束，提交結果' : 'Battle Over — Submit Result'}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Phase: Submit Result */}
          {phase === 'submit' && (
            <div className="panel" style={{ padding: 28 }}>
              <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 16 }}>{isZh ? '對戰結果' : 'Battle Result'}</div>

              <div style={{ marginBottom: 16 }}>
                <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>{isZh ? '勝者' : 'Winner'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setWinner(room?.creator ?? '')} className={winner === room?.creator ? 'btn btn-primary' : 'btn btn-ghost'} style={{ flex: 1, fontSize: 11, padding: '10px 0' }}>
                    Player A
                  </button>
                  <button onClick={() => setWinner(room?.opponent ?? '')} className={winner === room?.opponent ? 'btn btn-primary' : 'btn btn-ghost'} style={{ flex: 1, fontSize: 11, padding: '10px 0' }}>
                    Player B
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>{isZh ? '終結方式' : 'Finish Type'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[0, 1, 2, 3].map((ft) => (
                    <button key={ft} onClick={() => setFinishType(ft)} className={finishType === ft ? 'btn btn-primary' : 'btn btn-ghost'} style={{ fontSize: 11, padding: '8px 12px' }}>
                      {FINISH_LABELS[ft]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Score A</div>
                  <input type="number" value={scoreA} onChange={(e) => setScoreA(Number(e.target.value))} min={0} max={99} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--f-mono)', fontSize: 20, textAlign: 'center' }} />
                </div>
                <div>
                  <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Score B</div>
                  <input type="number" value={scoreB} onChange={(e) => setScoreB(Number(e.target.value))} min={0} max={99} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--f-mono)', fontSize: 20, textAlign: 'center' }} />
                </div>
              </div>

              <button onClick={handleSubmitResult} disabled={!winner} className="btn btn-primary" style={{ width: '100%', padding: '14px 0' }}>
                {isZh ? '提交結果（等待對手確認）' : 'Submit (waiting for opponent to confirm)'}
              </button>
            </div>
          )}

          {/* Phase: Waiting for confirm (for opponent) */}
          {phase === 'confirmed' && (
            <div className="panel" style={{ padding: 28, textAlign: 'center' }}>
              <p className="muted">{isZh ? '等待對手確認...' : 'Waiting for opponent to confirm...'}</p>
              <button onClick={handleConfirm} className="btn btn-primary" style={{ marginTop: 16, padding: '12px 32px' }}>
                {isZh ? '我確認結果' : 'I Confirm Result'}
              </button>
            </div>
          )}

          {/* Phase: Done — On-chain */}
          {phase === 'done' && (
            <div className="panel" style={{ padding: 32, textAlign: 'center', border: '1px solid var(--gold)', boxShadow: '0 0 40px rgba(212,175,55,0.15)' }}>
              <Corners color="var(--gold)" />
              <div style={{ fontSize: 48, marginBottom: 12 }}>⛓️</div>
              <div className="t-h3" style={{ marginBottom: 8 }}>{isZh ? '對戰紀錄已上鏈！' : 'Battle Record On-Chain!'}</div>
              <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>
                {onChainId.slice(0, 16)}...{onChainId.slice(-8)}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Tag color="var(--gold)">{scoreA} - {scoreB}</Tag>
                <Tag color="var(--fire)">{FINISH_LABELS[finishType]}</Tag>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
                <a href="/passport" className="btn btn-primary">{isZh ? '查看護照' : 'View Passport'}</a>
                <button onClick={() => { setPhase('create'); setRoomId(''); setRoom(null); setError(''); setOnChainId(''); }} className="btn btn-ghost">
                  {isZh ? '再來一場' : 'Battle Again'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
