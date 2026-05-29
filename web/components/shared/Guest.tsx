'use client';

import { useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
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

/** Slim global banner while browsing as a guest. Auto-exits once a wallet connects. */
export function GuestBanner() {
  const account = useCurrentAccount();
  const { isGuest, exit, hydrate } = useGuest();
  const t = useT();
  const isZh = t.nav.home === '首頁';

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { if (account && isGuest) exit(); }, [account, isGuest, exit]);

  if (!isGuest || account) return null;

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
        {isZh ? '訪客模式 · 連接錢包以開始遊玩並保存進度' : 'Guest mode · connect a wallet to play and save progress'}
      </span>
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
