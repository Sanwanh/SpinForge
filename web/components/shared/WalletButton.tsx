'use client';

import { useState } from 'react';
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { beginZkLogin, isZkLoginConfigured } from '@/lib/zklogin';

export function WalletButton() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { isAuthenticated, authMethod, displayName, logout } = useAuth();
  const t = useT();
  const [showMenu, setShowMenu] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);

  if (isAuthenticated) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="btn btn-ghost"
          style={{ padding: '10px 14px', fontSize: 12, gap: 8 }}
        >
          {authMethod === 'zklogin' && (
            <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
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
        </button>

        {showMenu && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              onClick={() => setShowMenu(false)}
            />
            <div
              className="panel"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                zIndex: 50,
                width: 200,
                padding: 10,
                boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
              }}
            >
              <p
                className="t-eyebrow"
                style={{ marginBottom: 8, paddingLeft: 6, color: 'var(--text-dim)' }}
              >
                {authMethod === 'zklogin' ? 'Google zkLogin' : 'Sui Wallet'}
              </p>
              <button
                onClick={() => {
                  if (authMethod === 'wallet') disconnect();
                  logout();
                  setShowMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  color: 'var(--blood)',
                  fontFamily: 'var(--f-ui)',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.04em',
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

  if (showLoginOptions) {
    return (
      <div style={{ position: 'relative' }}>
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => setShowLoginOptions(false)}
        />
        <div
          className="panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 50,
            width: 240,
            padding: 14,
            boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
          }}
        >
          <p className="t-eyebrow" style={{ marginBottom: 12 }}>
            {t.common.signIn}
          </p>

          {isZkLoginConfigured() && (
            <button
              onClick={async () => {
                const url = await beginZkLogin();
                window.location.href = url;
              }}
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8, fontSize: 12 }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          )}

          <div
            className="t-mono"
            style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-dim)', margin: '6px 0' }}
          >
            or
          </div>

          <div style={{ marginTop: 4 }}>
            <ConnectButton
              connectText="Sui Wallet"
              className="!w-full !rounded-lg !border !border-gray-700 !bg-transparent !px-3 !py-2 !text-xs !text-white"
            />
          </div>

          <button
            onClick={() => setShowLoginOptions(false)}
            style={{
              marginTop: 10,
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.15em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowLoginOptions(true)}
      className="btn btn-primary"
      style={{ padding: '10px 18px', fontSize: 12 }}
    >
      {t.common.signIn}
    </button>
  );
}
