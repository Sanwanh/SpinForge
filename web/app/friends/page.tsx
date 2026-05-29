'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { PageHeader, Section, Corners } from '@/components/design/atoms';
import { QRCodeSVG } from 'qrcode.react';

interface ChatMessage {
  from: string;
  text: string;
  ts: number;
}

interface BattleInvite {
  from: string;
  roomId: string;
  at: number;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function FriendsPage() {
  const { address } = useAuth();
  const t = useT();
  const isZh = t.nav.home === '首頁';
  const router = useRouter();

  const [friends, setFriends] = useState<string[]>([]);
  const [requests, setRequests] = useState<string[]>([]);
  const [invite, setInvite] = useState<BattleInvite | null>(null);
  const [addInput, setAddInput] = useState('');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const inviteHandled = useRef(false);

  const [chatWith, setChatWith] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshFriends = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/friends?address=${address}`);
      const data = await res.json();
      if (res.ok) {
        setFriends(data.friends ?? []);
        setRequests(data.requests ?? []);
        setInvite(data.invite ?? null);
      }
    } catch {
      /* transient — next poll retries */
    }
  }, [address]);

  const refreshChat = useCallback(async () => {
    if (!address || !chatWith) return;
    try {
      const res = await fetch(`/api/chat?me=${address}&friend=${chatWith}`);
      const data = await res.json();
      if (res.ok) setMessages(data.messages ?? []);
    } catch {
      /* transient */
    }
  }, [address, chatWith]);

  // Poll for friends/requests/invites, and chat messages when a thread is open.
  useEffect(() => {
    if (!address) return;
    refreshFriends();
    refreshChat();
    const interval = setInterval(() => {
      refreshFriends();
      refreshChat();
    }, 4000);
    return () => clearInterval(interval);
  }, [address, refreshFriends, refreshChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Opening an invite link (?add=<address>) auto-sends a friend request.
  useEffect(() => {
    if (!address || inviteHandled.current) return;
    const add = new URLSearchParams(window.location.search).get('add');
    if (!add) return;
    inviteHandled.current = true;
    window.history.replaceState({}, '', '/friends');
    if (!/^0x[0-9a-fA-F]{2,64}$/.test(add) || add === address) return;
    (async () => {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', from: address, to: add }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotice({
          ok: true,
          text: data.alreadyFriends
            ? (isZh ? '你們已經是好友' : 'Already friends')
            : (isZh ? '已自動送出好友邀請' : 'Friend request sent'),
        });
      }
      refreshFriends();
    })();
  }, [address, isZh, refreshFriends]);

  const sendRequest = useCallback(async () => {
    if (!address) return;
    const to = addInput.trim();
    if (!/^0x[0-9a-fA-F]{2,64}$/.test(to)) {
      setNotice({ ok: false, text: isZh ? '請輸入有效的錢包地址(0x…)' : 'Enter a valid wallet address (0x…)' });
      return;
    }
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', from: address, to }),
    });
    const data = await res.json();
    if (res.ok) {
      setNotice({ ok: true, text: data.alreadyFriends ? (isZh ? '你們已經是好友' : 'Already friends') : (isZh ? '好友邀請已送出' : 'Friend request sent') });
      setAddInput('');
    } else {
      setNotice({ ok: false, text: data.error });
    }
  }, [address, addInput, isZh]);

  const respond = useCallback(async (action: 'accept' | 'decline', from: string) => {
    if (!address) return;
    await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, me: address, from }),
    });
    refreshFriends();
  }, [address, refreshFriends]);

  const removeFriend = useCallback(async (friend: string) => {
    if (!address) return;
    await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', me: address, friend }),
    });
    if (chatWith === friend) setChatWith(null);
    refreshFriends();
  }, [address, chatWith, refreshFriends]);

  const startBattle = useCallback(async (friend: string) => {
    if (!address) return;
    const res = await fetch('/api/battle-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', creator: address }),
    });
    const data = await res.json();
    if (data.roomId) {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite-battle', from: address, to: friend, roomId: data.roomId }),
      });
      router.push(`/battle?room=${data.roomId}`);
    }
  }, [address, router]);

  const joinInvite = useCallback(async () => {
    if (!address || !invite) return;
    await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear-invite', me: address }),
    });
    router.push(`/battle?join=${invite.roomId}`);
  }, [address, invite, router]);

  const sendMessage = useCallback(async () => {
    if (!address || !chatWith) return;
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    // Optimistic append
    setMessages((m) => [...m, { from: address, text, ts: Date.now() }]);
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: address, to: chatWith, text }),
    });
    refreshChat();
  }, [address, chatWith, chatInput, refreshChat]);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [address]);

  const copyLink = useCallback(() => {
    if (!address) return;
    navigator.clipboard?.writeText(`${window.location.origin}/friends?add=${address}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }, [address]);

  if (!address) {
    return (
      <PageHeader
        eyebrow="FRIENDS · 好友"
        title={<>{isZh ? '連接錢包查看好友' : 'Connect wallet to see friends'}</>}
        sub=""
        kanjiBg="友"
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="FRIENDS · 好友"
        title={<>{isZh ? <>找朋友，<span style={{ color: 'var(--gold)' }}>一起轉。</span></> : <>Find friends, <span style={{ color: 'var(--gold)' }}>spin together.</span></>}</>}
        sub={isZh ? '加好友、約戰、聊天。對戰結果一樣會寫上 Sui 區塊鏈。' : 'Add friends, challenge them, and chat. Battle results still go on-chain.'}
        kanjiBg="友"
      />

      <Section>
        <div style={{ maxWidth: 620, margin: '0 auto', display: 'grid', gap: 16 }}>
          {/* Battle invite banner */}
          {invite && (
            <div className="panel" style={{ padding: 20, border: '1px solid var(--fire)', boxShadow: '0 0 28px rgba(255,68,68,0.15)' }}>
              <Corners color="var(--fire)" />
              <div className="t-eyebrow" style={{ color: 'var(--fire)', marginBottom: 8 }}>⚔ {isZh ? '對戰邀請' : 'Battle Invite'}</div>
              <p style={{ fontSize: 14, marginBottom: 14 }}>
                <span className="t-mono" style={{ color: 'var(--gold)' }}>{short(invite.from)}</span>
                {isZh ? ' 邀請你對戰!' : ' invited you to battle!'}
              </p>
              <button onClick={joinInvite} className="btn btn-primary" style={{ padding: '10px 28px' }}>
                {isZh ? '加入對戰' : 'Join Battle'}
              </button>
            </div>
          )}

          {/* Add me — QR + invite link */}
          <div className="panel" style={{ padding: 20, position: 'relative' }}>
            <Corners color="var(--gold)" />
            <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 14 }}>{isZh ? '加我好友' : 'Add Me'}</div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: '#fff', padding: 10, borderRadius: 12, flexShrink: 0, lineHeight: 0 }}>
                <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/friends?add=${address}`} size={112} bgColor="#ffffff" fgColor="#0a0e17" level="M" />
              </div>
              <div style={{ flex: 1, minWidth: 200, display: 'grid', gap: 10 }}>
                <div>
                  <div className="t-mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.14em', marginBottom: 4 }}>{isZh ? '我的好友碼' : 'MY CODE'}</div>
                  <div className="t-mono" style={{ fontSize: 16, color: 'var(--gold)', letterSpacing: '0.04em' }}>{short(address)}</div>
                </div>
                <button onClick={copyLink} className="btn btn-primary" style={{ fontSize: 12, padding: '9px 0', width: '100%', justifyContent: 'center' }}>
                  {linkCopied ? (isZh ? '✓ 連結已複製' : '✓ Link copied') : (isZh ? '複製邀請連結' : 'Copy invite link')}
                </button>
                <button onClick={copyAddress} className="btn btn-ghost" style={{ fontSize: 11, padding: '8px 0', width: '100%', justifyContent: 'center' }}>
                  {copied ? (isZh ? '✓ 完整地址已複製' : '✓ Address copied') : (isZh ? '複製完整地址' : 'Copy full address')}
                </button>
              </div>
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 14, marginBottom: 0, lineHeight: 1.5 }}>
              {isZh ? '讓朋友掃描 QR 或點開邀請連結,就會自動送出好友邀請 — 不用打地址。' : 'Friends scan the QR or open your invite link to send a request automatically — no address typing.'}
            </p>
          </div>

          {/* Add friend */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>{isZh ? '加好友' : 'Add Friend'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                placeholder={isZh ? '貼上對方的錢包地址 0x…' : "Paste friend's address 0x…"}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--void)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--f-mono)', fontSize: 13 }}
              />
              <button onClick={sendRequest} className="btn btn-primary" style={{ flexShrink: 0 }}>
                {isZh ? '邀請' : 'Add'}
              </button>
            </div>
            {notice && (
              <div className="t-mono" style={{ marginTop: 10, fontSize: 12, color: notice.ok ? 'var(--wood)' : 'var(--blood)' }}>
                {notice.text}
              </div>
            )}
          </div>

          {/* Incoming requests */}
          {requests.length > 0 && (
            <div className="panel" style={{ padding: 20, border: '1px solid var(--gold)' }}>
              <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 12 }}>{isZh ? '好友邀請' : 'Friend Requests'} · {requests.length}</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {requests.map((r) => (
                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="t-mono" style={{ flex: 1, fontSize: 13 }}>{short(r)}</span>
                    <button onClick={() => respond('accept', r)} className="btn btn-primary" style={{ fontSize: 11, padding: '6px 14px' }}>{isZh ? '接受' : 'Accept'}</button>
                    <button onClick={() => respond('decline', r)} className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 14px' }}>{isZh ? '拒絕' : 'Decline'}</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends list */}
          <div className="panel" style={{ padding: 20 }}>
            <div className="t-eyebrow" style={{ marginBottom: 12 }}>{isZh ? '我的好友' : 'My Friends'} · {friends.length}</div>
            {friends.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                {isZh ? '還沒有好友。把你的好友碼分享給朋友,或貼上他們的地址加好友。' : 'No friends yet. Share your code or paste an address above.'}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {friends.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="t-mono" style={{ flex: 1, fontSize: 13, minWidth: 120 }}>{short(f)}</span>
                    <button onClick={() => setChatWith(chatWith === f ? null : f)} className={chatWith === f ? 'btn btn-primary' : 'btn btn-ghost'} style={{ fontSize: 11, padding: '6px 14px' }}>{isZh ? '聊天' : 'Chat'}</button>
                    <button onClick={() => startBattle(f)} className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 14px', color: 'var(--fire)' }}>⚔ {isZh ? '約戰' : 'Battle'}</button>
                    <button onClick={() => removeFriend(f)} className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 10px', color: 'var(--text-dim)' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat thread */}
          {chatWith && (
            <div className="panel" style={{ padding: 20, border: '1px solid var(--gold)' }}>
              <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 12 }}>{isZh ? '聊天' : 'Chat'} · {short(chatWith)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', padding: '4px 2px', marginBottom: 12 }}>
                {messages.length === 0 ? (
                  <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '16px 0' }}>{isZh ? '還沒有訊息,打聲招呼吧' : 'No messages yet — say hi'}</p>
                ) : (
                  messages.map((m, i) => {
                    const mine = m.from === address;
                    return (
                      <div key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                        <div style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.4, background: mine ? 'rgba(212,175,55,0.14)' : 'var(--void)', border: `1px solid ${mine ? 'var(--gold)' : 'var(--border)'}`, color: 'var(--text)' }}>
                          {m.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder={isZh ? '輸入訊息…' : 'Type a message…'}
                  maxLength={500}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--void)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13 }}
                />
                <button onClick={sendMessage} disabled={!chatInput.trim()} className="btn btn-primary" style={{ flexShrink: 0 }}>{isZh ? '送出' : 'Send'}</button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
