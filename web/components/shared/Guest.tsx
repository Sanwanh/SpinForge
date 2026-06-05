'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useGuest } from '@/lib/guest';
import { useT } from '@/lib/i18n';

/** Button shown on connect-walls: lets a visitor browse without a wallet. */
export function GuestEntry() {
  const { enter } = useGuest();
  const t = useT();
  const isZh = t.nav.home === '首頁';
  return (
    <button
      onClick={enter}
      className="btn btn-ghost"
      style={{ fontSize: 12, padding: '10px 18px' }}
    >
      {isZh ? '以訪客身分瀏覽' : 'Browse as guest'}
    </button>
  );
}

/** Slim global banner while browsing as a guest. Auto-exits once signed in. */
export function GuestBanner() {
  const { isAuthenticated } = useAuth();
  const { isGuest, exit, hydrate } = useGuest();
  const t = useT();
  const isZh = t.nav.home === '首頁';

  useEffect(() => { hydrate(); }, [hydrate]);
  // A real session supersedes guest mode — clear the flag once signed in.
  useEffect(() => { if (isAuthenticated && isGuest) exit(); }, [isAuthenticated, isGuest, exit]);

  if (!isGuest || isAuthenticated) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '8px 16px',
        background: 'rgba(212,175,55,0.08)',
        borderBottom: '1px solid rgba(212,175,55,0.25)',
        fontSize: 12,
        textAlign: 'center',
      }}
    >
      <span className="t-mono" style={{ color: 'var(--gold)', letterSpacing: '0.08em' }}>
        {isZh ? '訪客模式 · 登入以開始遊玩並保存進度' : 'Guest mode · sign in to play and save progress'}
      </span>
      <Link
        href="/login"
        className="t-mono"
        style={{
          background: 'rgba(212,175,55,0.12)',
          border: '1px solid var(--gold)',
          color: 'var(--gold)',
          borderRadius: 6,
          padding: '3px 12px',
          fontSize: 10,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          textTransform: 'uppercase',
          textDecoration: 'none',
        }}
      >
        {isZh ? '登入' : 'Sign in'}
      </Link>
      <button
        onClick={exit}
        className="t-mono"
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-dim)',
          borderRadius: 6,
          padding: '3px 10px',
          fontSize: 10,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        {isZh ? '退出訪客' : 'Exit guest'}
      </button>
    </div>
  );
}
