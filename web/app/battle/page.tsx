'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { useInventory } from '@/hooks/useInventory';
import { useGameUser } from '@/hooks/useGameUser';
import { api } from '@/lib/api-fetch';
import { PageHeader, Section, Tag, Corners } from '@/components/design/atoms';
import {
  BeyCard,
  type BeyCardData,
  getLastUsedRotor,
  setLastUsedRotor,
} from '@/components/design/BeyCard';
import { useT } from '@/lib/i18n';
import { QRCodeSVG } from 'qrcode.react';

type Phase = 'create' | 'waiting' | 'select' | 'battle' | 'submit' | 'confirmed' | 'done';

interface RoomData {
  id: string;
  creator: string;
  opponent: string | null;
  creatorRotor: string | null;
  opponentRotor: string | null;
  creatorRotorName?: string | null;
  opponentRotorName?: string | null;
  battleStartedAt?: number | null;
  battleEndedAt?: number | null;
  durationSeconds?: number | null;
  youAre?: 'creator' | 'opponent' | null;
  status: string;
  result: { winner: string; finishType: number; scoreA: number; scoreB: number } | null;
}

// Both players have chosen → advance to the battle/timer screen. Derived from
// the rotor fields directly (robust even if the legacy status string lags).
function bothChose(room: RoomData): boolean {
  return !!room.creatorRotor && !!room.opponentRotor;
}

// mm:ss formatting for the match timer.
function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// Compact label/value row for the read-only confirm view.
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span className="t-eyebrow" style={{ fontSize: 9 }}>{label}</span>
      <span className="t-mono" style={{ fontSize: 14, color: 'var(--text)' }}>{value}</span>
    </div>
  );
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

// Localized finish-type label. Beyblade X scoring: how the point was won.
const FINISH_LABELS_ZH: Record<number, string> = {
  0: '旋轉終結 (1分)',
  1: '出局終結 (2分)',
  2: '爆裂終結 (2分)',
  3: 'Xtreme 終結 (3分)',
};
const finishLabel = (ft: number, isZh: boolean) => (isZh ? FINISH_LABELS_ZH[ft] : FINISH_LABELS[ft]);

export default function BattlePage() {
  const { user, isPending } = useGameUser();
  const myId = user?.id ?? null;
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
  // Live re-render tick (1s) so the running timer counts up smoothly.
  const [, setNowTick] = useState(0);
  const [busy, setBusy] = useState(false);
  // True for the player who proposed the result; the other player confirms it.
  const [iProposed, setIProposed] = useState(false);

  // Room actions go through the session-authenticated API. Identity comes from
  // the session cookie, so we never send creator/opponent/player/submitter.
  const roomApi = useCallback(async (body: Record<string, unknown>) => {
    const res = await api('/api/battle-room', body);
    return res.json();
  }, []);

  const handleCreate = useCallback(async () => {
    if (!myId) return;
    const data = await roomApi({ action: 'create' });
    if (data.roomId) {
      setRoomId(data.roomId);
      setRoom(data.room);
      setPhase('waiting');
    }
  }, [myId, roomApi]);

  const handleJoin = useCallback(async () => {
    if (!myId || !joinCode) return;
    const data = await roomApi({ action: 'join', roomId: joinCode });
    if (data.success) {
      setRoomId(joinCode);
      setRoom(data.room);
      setPhase('select');
    } else {
      setError(data.error);
    }
  }, [myId, joinCode, roomApi]);

  const handleSelectRotor = useCallback(async () => {
    if (!myId || !selectedRotor) return;
    const selectedBey = beys.find((b) => b.objectId === selectedRotor);
    const rotorName = selectedBey ? String(selectedBey.fields.name ?? 'Rotor') : 'Rotor';
    const data = await roomApi({
      action: 'select-rotor',
      roomId,
      rotorId: selectedRotor,
      rotorName,
    });
    if (data.success) {
      setLastUsedRotor(selectedRotor);
      setRoom(data.room);
      // Both chosen -> go straight into the match screen; the timer still waits
      // for an explicit "Start Battle" press there.
      if (bothChose(data.room)) setPhase('battle');
    }
  }, [myId, selectedRotor, roomId, beys, roomApi]);

  // Synchronized match timer: a single server timestamp drives both clients.
  const handleStartBattle = useCallback(async () => {
    const data = await roomApi({ action: 'start-battle', roomId });
    if (data.success) setRoom(data.room);
    else setError(data.error);
  }, [roomId, roomApi]);

  const handleEndBattle = useCallback(async () => {
    const data = await roomApi({ action: 'end-battle', roomId });
    if (data.success) { setRoom(data.room); setPhase('submit'); }
    else setError(data.error);
  }, [roomId, roomApi]);

  // Single commit path used by propose, confirm, AND polling. Server reads Beys
  // + duration from the room, so both players' canonical hashes match and the
  // record commits on-chain only once both have confirmed. Returns true when
  // the on-chain record is committed.
  const commitToChain = useCallback(
    async (winnerSide: 'creator' | 'opponent', ft: number, sa: number, sb: number): Promise<boolean> => {
      const res = await api('/api/submit-result', {
        code: roomId, winnerSide, finishType: ft, scoreA: sa, scoreB: sb,
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || 'Commit failed'); return false; }
      if (data.committed) { setOnChainId(data.recordId || ''); setPhase('done'); return true; }
      return false; // recorded; still waiting for the opponent to confirm
    },
    [roomId],
  );

  // Proposer: broadcast the outcome to the room, then record my confirmation.
  const handleProposeResult = useCallback(async () => {
    if (!myId || !winner || !room || busy) return;
    const side: 'creator' | 'opponent' = winner === room.creator ? 'creator' : 'opponent';
    setBusy(true); setError('');
    try {
      const data = await roomApi({ action: 'submit-result', roomId, winner, finishType, scoreA, scoreB });
      if (!data.success) { setError(data.error); return; }
      setRoom(data.room);
      setIProposed(true);
      const committed = await commitToChain(side, finishType, scoreA, scoreB);
      if (!committed) setPhase('confirmed');
    } finally { setBusy(false); }
  }, [myId, winner, room, busy, roomId, finishType, scoreA, scoreB, roomApi, commitToChain]);

  // Confirmer: adopt the proposed result (incl. the shared duration) and confirm.
  const handleConfirmOpponent = useCallback(async () => {
    if (!myId || !room?.result || busy) return;
    const r = room.result;
    const side: 'creator' | 'opponent' = r.winner === room.creator ? 'creator' : 'opponent';
    setBusy(true); setError('');
    try {
      setWinner(side === 'creator' ? room.creator : (room.opponent ?? ''));
      setFinishType(r.finishType); setScoreA(r.scoreA); setScoreB(r.scoreB);
      const committed = await commitToChain(side, r.finishType, r.scoreA, r.scoreB);
      if (!committed) setPhase('confirmed');
    } finally { setBusy(false); }
  }, [myId, room, busy, commitToChain]);

  // Poll room state across the live phases so both players stay in sync.
  useEffect(() => {
    if (!['waiting', 'select', 'battle', 'submit'].includes(phase)) return;
    const interval = setInterval(async () => {
      const data = await roomApi({ action: 'get', roomId });
      if (!data.room) return;
      setRoom(data.room);
      if (phase === 'waiting' && data.room.status === 'ready') setPhase('select');
      if (phase === 'select' && bothChose(data.room)) setPhase('battle');
      if (phase === 'battle' && data.room.battleEndedAt) setPhase('submit');
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, roomId, roomApi]);

  // In the 'confirmed' phase, poll the CHEAP room endpoint (not /api/submit-result,
  // which is rate-limited to 30/h — polling it every 3s would trip "Too many
  // requests"). When the room flips to settled (the opponent confirmed and the
  // commit landed), call /api/submit-result exactly once to fetch the record.
  useEffect(() => {
    if (phase !== 'confirmed' || !room) return;
    const side: 'creator' | 'opponent' = winner === room.creator ? 'creator' : 'opponent';
    let done = false;
    const interval = setInterval(async () => {
      if (done) return;
      const data = await roomApi({ action: 'get', roomId });
      if (data?.room?.status === 'confirmed') {
        done = true;
        await commitToChain(side, finishType, scoreA, scoreB); // idempotent → recordId + 'done'
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [phase, room, roomId, winner, finishType, scoreA, scoreB, roomApi, commitToChain]);

  // Tick once a second while the shared timer is running so it counts up live.
  useEffect(() => {
    if (phase !== 'battle' || !room?.battleStartedAt || room?.battleEndedAt) return;
    const id = setInterval(() => setNowTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [phase, room?.battleStartedAt, room?.battleEndedAt]);

  // Deep-link from the Friends page: ?join=CODE auto-joins as opponent,
  // ?room=CODE resumes as the room creator (waiting for the friend to join).
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || !myId) return;
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    const roomParam = params.get('room');
    if (!joinParam && !roomParam) return;
    deepLinkHandled.current = true;
    (async () => {
      if (joinParam) {
        const data = await roomApi({ action: 'join', roomId: joinParam });
        const target = data.room ?? (await roomApi({ action: 'get', roomId: joinParam })).room;
        if (target) {
          setRoomId(joinParam);
          setRoom(target);
          setPhase('select');
        } else if (data.error) {
          setError(data.error);
        }
      } else if (roomParam) {
        const got = await roomApi({ action: 'get', roomId: roomParam });
        if (got.room) {
          setRoomId(roomParam);
          setRoom(got.room);
          setPhase(got.room.status === 'waiting' ? 'waiting' : 'select');
        }
      }
    })();
  }, [myId, roomApi]);

  // Which side I am, per the server (session-derived). creator/opponent in the
  // room are HANDLES, not user ids, so we must use this instead of comparing to myId.
  const iAmCreator = room?.youAre === 'creator';

  // Opponent's bey object (fetched directly from chain so we always see
  // their real name + stats — independent of what the room cache claims).
  const opponentAddress = room
    ? (iAmCreator ? room.opponent : room.creator)
    : null;
  const opponentRotorId = room
    ? (iAmCreator ? room.opponentRotor : room.creatorRotor)
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

  if (!myId) {
    return (
      <PageHeader eyebrow="BATTLE" title={<>{isPending ? (isZh ? '載入中…' : 'Loading…') : (isZh ? '登入開始對戰' : 'Sign in to battle')}</>} sub="" kanjiBg="戰" />
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
            const myRotorId = room ? (iAmCreator ? room.creatorRotor : room.opponentRotor) : null;
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

                {(() => {
                  const startedAt = room?.battleStartedAt ?? null;
                  const endedAt = room?.battleEndedAt ?? null;
                  const running = !!startedAt && !endedAt;
                  const elapsed = running
                    ? (Date.now() - startedAt) / 1000
                    : room?.durationSeconds ?? 0;
                  return (
                    <div
                      className="panel"
                      style={{ padding: 32, textAlign: 'center', border: '1px solid var(--fire)' }}
                    >
                      <div style={{ fontSize: 48, marginBottom: 8 }}>{running ? '⏱️' : '🔥'}</div>
                      <div className="t-h3" style={{ marginBottom: 8 }}>
                        {!startedAt
                          ? (isZh ? '準備開始對戰' : 'Ready to Battle')
                          : running
                            ? (isZh ? '對戰進行中' : 'Battle in Progress')
                            : (isZh ? '對戰結束' : 'Battle Over')}
                      </div>
                      <div
                        className="t-display"
                        style={{ fontSize: 64, letterSpacing: '0.08em', color: 'var(--gold)', margin: '4px 0 16px' }}
                      >
                        {fmtDuration(elapsed)}
                      </div>
                      <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
                        {isZh
                          ? '計時雙方同步：任一方開始，兩邊一起計時；結束後時長雙方一致。'
                          : 'The timer is synchronized: either player starts it, both clocks run together, and the final duration matches for both.'}
                      </p>
                      {!startedAt ? (
                        <button onClick={handleStartBattle} className="btn btn-primary" style={{ padding: '12px 32px' }}>
                          {isZh ? '開始比賽' : 'Start Battle'}
                        </button>
                      ) : running ? (
                        <button onClick={handleEndBattle} className="btn btn-primary" style={{ padding: '12px 32px' }}>
                          {isZh ? '結束比賽' : 'Stop Battle'}
                        </button>
                      ) : (
                        <button onClick={() => setPhase('submit')} className="btn btn-primary" style={{ padding: '12px 32px' }}>
                          {isZh ? '提交結果' : 'Submit Result'}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Phase: Submit Result (propose) or Confirm opponent's proposal */}
          {phase === 'submit' && (() => {
            const confirmMode = !!room?.result && !iProposed;
            const proposed = room?.result ?? null;
            // Show real player names (handles) instead of "Player A/B", with a (你)/(You) marker.
            const youTag = isZh ? '（你）' : ' (You)';
            const aName = (room?.creator || 'Player A') + (iAmCreator ? youTag : '');
            const bName = (room?.opponent || 'Player B') + (!iAmCreator ? youTag : '');
            const proposedWinnerLabel = proposed ? (proposed.winner === room?.creator ? aName : bName) : '';
            return (
              <div className="panel" style={{ padding: 28 }}>
                <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 6 }}>
                  {confirmMode ? (isZh ? '確認對手提交的成績' : "Confirm Opponent's Result") : (isZh ? '填寫對戰結果' : 'Battle Result')}
                </div>
                <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
                  {confirmMode
                    ? (isZh ? '對手送出了以下成績，核對無誤後按確認即寫入並上鏈。' : 'Your opponent submitted the result below. Confirm if it is correct to write it on-chain.')
                    : (isZh ? '選出贏家、這局怎麼分勝負、以及雙方總分，送出後等對手確認。' : 'Pick the winner, how the point was won, and each side’s score, then submit.')}
                </p>

                {/* Agreed, server-authoritative match duration. */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)', marginBottom: 16 }}>
                  <span className="t-eyebrow" style={{ fontSize: 9 }}>{isZh ? '比賽時長' : 'Match Duration'}</span>
                  <span className="t-mono" style={{ fontSize: 20, color: 'var(--gold)' }}>{fmtDuration(room?.durationSeconds ?? 0)}</span>
                </div>

                {confirmMode ? (
                  <>
                    <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
                      <Row label={isZh ? '勝者' : 'Winner'} value={proposedWinnerLabel} />
                      <Row label={isZh ? '終結方式' : 'Finish'} value={finishLabel(proposed?.finishType ?? 0, isZh)} />
                      <Row label={isZh ? `比分（${aName} / ${bName}）` : `Score (${aName} / ${bName})`} value={`${proposed?.scoreA ?? 0} - ${proposed?.scoreB ?? 0}`} />
                    </div>
                    <button onClick={handleConfirmOpponent} disabled={busy} className="btn btn-primary" style={{ width: '100%', padding: '14px 0' }}>
                      {busy ? (isZh ? '確認中…' : 'Confirming…') : (isZh ? '確認成績' : 'Confirm Result')}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>{isZh ? '勝者（誰贏了這局）' : 'Winner'}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setWinner(room?.creator ?? '')} className={winner === room?.creator ? 'btn btn-primary' : 'btn btn-ghost'} style={{ flex: 1, fontSize: 11, padding: '10px 0' }}>
                          {aName}
                        </button>
                        <button onClick={() => setWinner(room?.opponent ?? '')} className={winner === room?.opponent ? 'btn btn-primary' : 'btn btn-ghost'} style={{ flex: 1, fontSize: 11, padding: '10px 0' }}>
                          {bName}
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>{isZh ? '終結方式（這分怎麼贏的）' : 'Finish Type'}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[0, 1, 2, 3].map((ft) => (
                          <button key={ft} onClick={() => setFinishType(ft)} className={finishType === ft ? 'btn btn-primary' : 'btn btn-ghost'} style={{ fontSize: 11, padding: '8px 12px' }}>
                            {finishLabel(ft, isZh)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div className="t-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>{isZh ? '比分（雙方總分）' : 'Score'}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div className="t-mono" style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{aName}</div>
                          <input type="number" value={scoreA} onChange={(e) => setScoreA(Math.min(15, Math.max(0, Number(e.target.value))))} min={0} max={15} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--f-mono)', fontSize: 20, textAlign: 'center' }} />
                        </div>
                        <div>
                          <div className="t-mono" style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{bName}</div>
                          <input type="number" value={scoreB} onChange={(e) => setScoreB(Math.min(15, Math.max(0, Number(e.target.value))))} min={0} max={15} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--f-mono)', fontSize: 20, textAlign: 'center' }} />
                        </div>
                      </div>
                    </div>

                    <button onClick={handleProposeResult} disabled={!winner || busy} className="btn btn-primary" style={{ width: '100%', padding: '14px 0' }}>
                      {busy ? (isZh ? '提交中…' : 'Submitting…') : (isZh ? '提交成績（等待對手確認）' : 'Submit (waiting for opponent to confirm)')}
                    </button>
                  </>
                )}
              </div>
            );
          })()}

          {/* Phase: Waiting for confirm (for opponent) */}
          {phase === 'confirmed' && (
            <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <div className="t-h3" style={{ marginBottom: 8 }}>{isZh ? '已送出你的確認' : 'Your confirmation is in'}</div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
                {isZh ? '雙方成績（含時長）一致後即自動寫入並上鏈。' : 'Once both results (including duration) match, it commits on-chain automatically.'}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Tag color="var(--gold)">{scoreA} - {scoreB}</Tag>
                <Tag color="var(--fire)">{FINISH_LABELS[finishType]}</Tag>
                <Tag color="var(--wood)">⏱ {fmtDuration(room?.durationSeconds ?? 0)}</Tag>
              </div>
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
                <Tag color="var(--wood)">⏱ {fmtDuration(room?.durationSeconds ?? 0)}</Tag>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
                <a href="/passport" className="btn btn-primary">{isZh ? '查看護照' : 'View Passport'}</a>
                <button onClick={() => { setPhase('create'); setRoomId(''); setRoom(null); setError(''); setOnChainId(''); setIProposed(false); setWinner(''); setSelectedRotor(''); setFinishType(0); setScoreA(7); setScoreB(0); }} className="btn btn-ghost">
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
