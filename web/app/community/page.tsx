'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { PageHeader, Section, Corners } from '@/components/design/atoms';
import { useCachedAuthSig } from '@/lib/use-auth-sig';
import { ELEMENT_MAP } from '@/components/design/tokens';
import {
  SEED_COMBOS,
  ARCHETYPE_LABEL,
  DIFFICULTY_LABEL,
  type Archetype,
} from '@/lib/community-seed';

interface Post {
  id: string;
  author: string;
  title: string;
  archetype: string;
  blade: string;
  ratchet: string;
  bit: string;
  body: string;
  votes: number;
  commentCount: number;
  ts: number;
}

interface Comment {
  author: string;
  text: string;
  ts: number;
}

const ARCHETYPES: Archetype[] = ['Attack', 'Defense', 'Stamina', 'Balance'];
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const ARCH_COLOR: Record<string, string> = {
  Attack: 'var(--fire)', Defense: 'var(--metal, #C0C0C0)', Stamina: 'var(--water, #00CCFF)', Balance: 'var(--gold)',
};

export default function CommunityPage() {
  const { address } = useAuth();
  const t = useT();
  const isZh = t.nav.home === '首頁';
  const getAuth = useCachedAuthSig();

  const [filter, setFilter] = useState<Archetype | 'All'>('All');
  const [posts, setPosts] = useState<Post[]>([]);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState({ title: '', archetype: 'Attack' as Archetype, blade: '', ratchet: '', bit: '', body: '' });
  const [posting, setPosting] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  const refreshPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/community');
      const data = await res.json();
      if (res.ok) setPosts(data.posts ?? []);
    } catch {
      /* transient */
    }
  }, []);

  useEffect(() => { refreshPosts(); }, [refreshPosts]);

  const loadComments = useCallback(async (id: string) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    setComments([]);
    try {
      const res = await fetch(`/api/community?post=${id}`);
      const data = await res.json();
      if (res.ok) setComments(data.comments ?? []);
    } catch {
      /* transient */
    }
  }, [openId]);

  const submitPost = useCallback(async () => {
    if (!address) return;
    const { title, blade, ratchet, bit, body } = form;
    if (!title.trim() || !blade.trim() || !ratchet.trim() || !bit.trim() || !body.trim()) {
      setNotice({ ok: false, text: isZh ? '請填完所有欄位' : 'Fill in all fields' });
      return;
    }
    setPosting(true);
    try {
      const auth = await getAuth();
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post', author: address, ...form, ...auth }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotice({ ok: true, text: isZh ? '已分享你的組合!' : 'Combo shared!' });
        setForm({ title: '', archetype: 'Attack', blade: '', ratchet: '', bit: '', body: '' });
        setShowComposer(false);
        refreshPosts();
      } else {
        setNotice({ ok: false, text: data.error });
      }
    } finally {
      setPosting(false);
    }
  }, [address, form, isZh, getAuth, refreshPosts]);

  const vote = useCallback(async (id: string) => {
    if (!address) { setNotice({ ok: false, text: isZh ? '連接錢包才能按讚' : 'Connect wallet to vote' }); return; }
    const auth = await getAuth();
    const res = await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote', author: address, postId: id, ...auth }),
    });
    const data = await res.json();
    if (res.ok) {
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, votes: data.votes } : p)));
      if (data.alreadyVoted) setNotice({ ok: false, text: isZh ? '你已經按過讚了' : 'Already voted' });
    }
  }, [address, isZh, getAuth]);

  const submitComment = useCallback(async (id: string) => {
    if (!address) return;
    const text = commentInput.trim();
    if (!text) return;
    setCommentInput('');
    setComments((c) => [...c, { author: address, text, ts: Date.now() }]);
    const auth = await getAuth();
    await fetch('/api/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'comment', author: address, postId: id, text, ...auth }),
    });
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, commentCount: p.commentCount + 1 } : p)));
  }, [address, commentInput, getAuth]);

  const shown = filter === 'All' ? SEED_COMBOS : SEED_COMBOS.filter((c) => c.archetype === filter);

  const input = { padding: '10px 14px', borderRadius: 8, background: 'var(--void)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, width: '100%' } as const;

  return (
    <>
      <PageHeader
        eyebrow="COMMUNITY · 組合攻略"
        title={<>{isZh ? <>哪些組合<span style={{ color: 'var(--gold)' }}>比較強?</span></> : <>Which combos <span style={{ color: 'var(--gold)' }}>win?</span></>}</>}
        sub={isZh ? '新手參考:推薦組合都依本作物理規則設計。也歡迎分享你的配置一起討論。' : 'Newbie reference: every pick is grounded in SpinForge’s own physics. Share your own builds and discuss.'}
        kanjiBg="攻"
      />

      <Section>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 16 }}>
          {/* ---- Recommended combos (seed, browsable by all) ---- */}
          <div className="t-eyebrow" style={{ color: 'var(--gold)' }}>{isZh ? '推薦組合' : 'Recommended Combos'}</div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['All', ...ARCHETYPES] as const).map((a) => (
              <button
                key={a}
                onClick={() => setFilter(a)}
                className={filter === a ? 'btn btn-primary' : 'btn btn-ghost'}
                style={{ fontSize: 11, padding: '6px 14px' }}
              >
                {a === 'All' ? (isZh ? '全部' : 'All') : ARCHETYPE_LABEL[a][isZh ? 'zh' : 'en']}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {shown.map((c) => {
              const el = ELEMENT_MAP[c.element];
              return (
                <div key={c.id} className="panel" style={{ padding: 18, position: 'relative' }}>
                  <Corners color={el.color} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={{ fontSize: 22, color: el.color }}>{el.beast}</span>
                    <strong style={{ fontSize: 15 }}>{isZh ? c.nameZh : c.name}</strong>
                    <span className="t-mono" style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: `1px solid ${ARCH_COLOR[c.archetype]}`, color: ARCH_COLOR[c.archetype] }}>
                      {ARCHETYPE_LABEL[c.archetype][isZh ? 'zh' : 'en']}
                    </span>
                    <span className="t-mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                      {DIFFICULTY_LABEL[c.difficulty][isZh ? 'zh' : 'en']}
                    </span>
                  </div>
                  <div className="t-mono" style={{ fontSize: 12, color: 'var(--text-dim)', display: 'grid', gap: 3, marginBottom: 10 }}>
                    <div><span style={{ color: 'var(--gold)' }}>Blade</span> · {c.blade}</div>
                    <div><span style={{ color: 'var(--gold)' }}>Ratchet</span> · {c.ratchet}</div>
                    <div><span style={{ color: 'var(--gold)' }}>Bit</span> · {c.bit}</div>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, margin: '0 0 10px' }}>{isZh ? c.whyZh : c.why}</p>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11.5 }}>
                    <span style={{ color: 'var(--wood, #00FF88)' }}>✓ {isZh ? c.strongZh : c.strong}</span>
                    <span style={{ color: 'var(--blood, #FF4444)' }}>✕ {isZh ? c.weakZh : c.weak}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- Community posts ---- */}
          <div className="t-eyebrow" style={{ color: 'var(--gold)', marginTop: 12 }}>{isZh ? '社群分享' : 'Community Builds'} · {posts.length}</div>

          {address ? (
            <div className="panel" style={{ padding: 18 }}>
              {!showComposer ? (
                <button onClick={() => setShowComposer(true)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  + {isZh ? '分享我的組合' : 'Share my combo'}
                </button>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <input style={input} placeholder={isZh ? '標題,例:逆旋速攻流' : 'Title, e.g. Reverse rush rush-down'} value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <select style={{ ...input, fontFamily: 'var(--f-mono)' }} value={form.archetype} onChange={(e) => setForm({ ...form, archetype: e.target.value as Archetype })}>
                    {ARCHETYPES.map((a) => <option key={a} value={a}>{ARCHETYPE_LABEL[a][isZh ? 'zh' : 'en']}</option>)}
                  </select>
                  <input style={input} placeholder={isZh ? 'Blade(刀)' : 'Blade'} value={form.blade} maxLength={60} onChange={(e) => setForm({ ...form, blade: e.target.value })} />
                  <input style={input} placeholder={isZh ? 'Ratchet(扣環),例 3-60' : 'Ratchet, e.g. 3-60'} value={form.ratchet} maxLength={60} onChange={(e) => setForm({ ...form, ratchet: e.target.value })} />
                  <input style={input} placeholder={isZh ? 'Bit(軸尖)' : 'Bit'} value={form.bit} maxLength={60} onChange={(e) => setForm({ ...form, bit: e.target.value })} />
                  <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} placeholder={isZh ? '為什麼這套強?怎麼打?' : 'Why is it strong? How do you play it?'} value={form.body} maxLength={800} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={submitPost} disabled={posting} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{posting ? '…' : (isZh ? '送出' : 'Post')}</button>
                    <button onClick={() => setShowComposer(false)} className="btn btn-ghost">{isZh ? '取消' : 'Cancel'}</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              {isZh ? '連接錢包即可分享組合、按讚、留言一起討論。' : 'Connect your wallet to share combos, vote, and discuss.'}
            </p>
          )}

          {notice && (
            <div className="t-mono" style={{ fontSize: 12, color: notice.ok ? 'var(--wood, #00FF88)' : 'var(--blood, #FF4444)' }}>{notice.text}</div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {posts.length === 0 && (
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>{isZh ? '還沒有人分享 — 當第一個吧!' : 'No community combos yet — be the first!'}</p>
            )}
            {posts.map((p) => (
              <div key={p.id} className="panel" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <button onClick={() => vote(p.id)} className="btn btn-ghost" style={{ flexDirection: 'column', padding: '4px 10px', lineHeight: 1.1, flexShrink: 0 }} aria-label="upvote">
                    <span style={{ fontSize: 14 }}>▲</span>
                    <span className="t-mono" style={{ fontSize: 13, color: 'var(--gold)' }}>{p.votes}</span>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <strong style={{ fontSize: 14 }}>{p.title}</strong>
                      <span className="t-mono" style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: `1px solid ${ARCH_COLOR[p.archetype] ?? 'var(--border)'}`, color: ARCH_COLOR[p.archetype] ?? 'var(--text-dim)' }}>{ARCHETYPE_LABEL[p.archetype as Archetype]?.[isZh ? 'zh' : 'en'] ?? p.archetype}</span>
                    </div>
                    <div className="t-mono" style={{ fontSize: 11.5, color: 'var(--text-dim)', display: 'grid', gap: 2, marginBottom: 8 }}>
                      <div>Blade · {p.blade}　Ratchet · {p.ratchet}　Bit · {p.bit}</div>
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.5, margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{p.body}</p>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <span className="t-mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{short(p.author)}</span>
                      <button onClick={() => loadComments(p.id)} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}>
                        💬 {isZh ? '討論' : 'Discuss'} · {p.commentCount}
                      </button>
                    </div>

                    {openId === p.id && (
                      <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'grid', gap: 8 }}>
                        {comments.length === 0 ? (
                          <p className="muted" style={{ fontSize: 12, margin: 0 }}>{isZh ? '還沒有留言' : 'No comments yet'}</p>
                        ) : comments.map((cm, i) => (
                          <div key={i} style={{ fontSize: 12.5 }}>
                            <span className="t-mono" style={{ color: 'var(--gold)', marginRight: 6 }}>{short(cm.author)}</span>
                            <span style={{ whiteSpace: 'pre-wrap' }}>{cm.text}</span>
                          </div>
                        ))}
                        {address && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <input style={input} placeholder={isZh ? '留言…' : 'Comment…'} value={commentInput} maxLength={400} onChange={(e) => setCommentInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitComment(p.id); }} />
                            <button onClick={() => submitComment(p.id)} disabled={!commentInput.trim()} className="btn btn-primary" style={{ flexShrink: 0 }}>{isZh ? '送出' : 'Send'}</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
