'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { Corners } from '@/components/design/atoms';

/**
 * Account menu in the navbar.
 *  - Logged out: a "Login" button linking to /login.
 *  - Logged in:  handle/email chip with a dropdown (profile links + Logout).
 *
 * Named `WalletButton` for import stability; auth is now session-based.
 */
export function WalletButton() {
  const { isAuthenticated, displayName, email, logout } = useAuth();
  const t = useT();
  const isZh = t.nav.home === '首頁';
  const [showMenu, setShowMenu] = useState(false);

  // ---- Logged out: link to the dedicated login page ----
  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="btn btn-primary"
        style={{ padding: '10px 18px', fontSize: 12 }}
      >
        {t.common.signIn}
      </Link>
    );
  }

  // ---- Logged in: account chip + dropdown ----
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu((v) => !v)}
        className="btn btn-ghost"
        style={{ padding: '8px 14px', fontSize: 12, gap: 8, alignItems: 'center' }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--wood)',
            boxShadow: '0 0 8px var(--wood)',
            flexShrink: 0,
          }}
        />
        <span
          className="t-mono"
          style={{
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textTransform: 'none',
            letterSpacing: '0.04em',
          }}
        >
          {displayName}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>▾</span>
      </button>

      {showMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowMenu(false)} />
          <div
            className="panel"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 10px)',
              zIndex: 50,
              width: 248,
              padding: 16,
              boxShadow: '0 18px 48px rgba(0,0,0,0.6)',
            }}
          >
            <Corners color="var(--gold)" />

            <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 10 }}>
              {isZh ? '帳號' : 'Account'}
            </div>

            {email && (
              <div
                className="t-mono"
                title={email}
                style={{
                  fontSize: 11,
                  color: 'var(--text-mute)',
                  marginBottom: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {email}
              </div>
            )}

            <div style={{ display: 'grid', gap: 4, margin: '4px 0 12px', paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
              <Link
                href="/passport"
                onClick={() => setShowMenu(false)}
                className="t-ui"
                style={{ padding: '8px 10px', borderRadius: 6, fontSize: 12, color: 'var(--text)', textDecoration: 'none', letterSpacing: '0.03em' }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(212,175,55,0.08)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {isZh ? '我的護照' : 'My Passport'}
              </Link>
              <Link
                href="/friends"
                onClick={() => setShowMenu(false)}
                className="t-ui"
                style={{ padding: '8px 10px', borderRadius: 6, fontSize: 12, color: 'var(--text)', textDecoration: 'none', letterSpacing: '0.03em' }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(212,175,55,0.08)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {isZh ? '好友' : 'Friends'}
              </Link>
            </div>

            <button
              onClick={() => {
                logout();
                setShowMenu(false);
              }}
              style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: 6,
                background: 'transparent',
                border: '1px solid rgba(255,51,51,0.25)',
                textAlign: 'center',
                color: 'var(--blood)',
                fontFamily: 'var(--f-ui)',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,51,51,0.1)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {t.common.signOut}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
