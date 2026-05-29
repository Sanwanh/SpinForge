'use client';

import { useState } from 'react';
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { beginZkLogin, isZkLoginConfigured } from '@/lib/zklogin';
import { Corners } from '@/components/design/atoms';

function GoogleMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function WalletButton() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { isAuthenticated, authMethod, address, displayName, logout } = useAuth();
  const t = useT();
  const isZh = t.nav.home === '首頁';
  const [showMenu, setShowMenu] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ---- Authenticated: account chip + dropdown ----
  if (isAuthenticated) {
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
          {authMethod === 'zklogin' && <GoogleMark />}
          <span
            className="t-mono"
            style={{
              maxWidth: 130,
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

              <div className="t-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', marginBottom: 12 }}>
                {authMethod === 'zklogin' ? <><GoogleMark size={12} /> Google zkLogin</> : 'Sui Wallet'}
              </div>

              <div className="t-mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.14em', marginBottom: 5 }}>
                {isZh ? '地址' : 'ADDRESS'}
              </div>
              <button
                onClick={copyAddress}
                className="t-mono"
                title={address ?? ''}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'var(--void)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-mute)',
                  fontSize: 11,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? (isZh ? '✓ 已複製' : '✓ Copied') : address}
              </button>

              <div style={{ display: 'grid', gap: 4, margin: '12px 0', paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
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
                  if (authMethod === 'wallet') disconnect();
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

  // ---- Login options popover ----
  if (showLoginOptions) {
    return (
      <div style={{ position: 'relative' }}>
        <button className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 12 }}>
          {t.common.signIn}
        </button>
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowLoginOptions(false)} />
        <div
          className="panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            zIndex: 50,
            width: 268,
            padding: 18,
            boxShadow: '0 18px 48px rgba(0,0,0,0.6)',
          }}
        >
          <Corners color="var(--gold)" />

          <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 4 }}>
            {isZh ? '進入鑄造場' : 'Enter the Forge'}
          </div>
          <p className="muted" style={{ fontSize: 11, lineHeight: 1.5, margin: '0 0 16px' }}>
            {isZh ? '選擇登入方式開始遊玩' : 'Choose how you want to sign in'}
          </p>

          {isZkLoginConfigured() && (
            <button
              onClick={async () => {
                const url = await beginZkLogin();
                window.location.href = url;
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: 'center',
                padding: '11px 0',
                marginBottom: 12,
                borderRadius: 8,
                background: '#fff',
                border: 'none',
                color: '#1f1f1f',
                fontFamily: 'var(--f-ui)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <GoogleMark size={16} />
              {isZh ? '使用 Google 登入' : 'Continue with Google'}
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
            <span className="t-mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
              {isZh ? '或' : 'OR'}
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
          </div>

          <div className="sf-connect-wrap">
            <ConnectButton connectText={isZh ? '連接 Sui 錢包' : 'Connect Sui Wallet'} />
          </div>

          <button
            onClick={() => setShowLoginOptions(false)}
            style={{
              marginTop: 12,
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {isZh ? '取消' : 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  // ---- Default trigger ----
  return (
    <button onClick={() => setShowLoginOptions(true)} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: 12 }}>
      {t.common.signIn}
    </button>
  );
}
