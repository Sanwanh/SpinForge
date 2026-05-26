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
      <div className="relative">
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-brand-blue"
        >
          {authMethod === 'zklogin' && (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span className="max-w-[120px] truncate">{displayName}</span>
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-700 bg-surface p-2 shadow-xl">
              <p className="mb-2 px-2 text-xs text-gray-500">
                {authMethod === 'zklogin' ? 'Google zkLogin' : 'Sui Wallet'}
              </p>
              <button
                onClick={() => {
                  if (authMethod === 'wallet') disconnect();
                  logout();
                  setShowMenu(false);
                }}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-red-400 transition-colors hover:bg-red-400/10"
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
      <div className="relative">
        <div className="fixed inset-0 z-40" onClick={() => setShowLoginOptions(false)} />
        <div className="absolute right-0 top-0 z-50 w-56 rounded-lg border border-gray-700 bg-surface p-3 shadow-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.common.signIn}</p>

          {isZkLoginConfigured() && (
            <button
              onClick={async () => {
                const url = await beginZkLogin();
                window.location.href = url;
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm text-white transition-colors hover:border-brand-blue hover:bg-brand-blue/10"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          )}

          <div className="text-center text-xs text-gray-500">or</div>

          <div className="mt-2">
            <ConnectButton
              connectText="Sui Wallet"
              className="!w-full !rounded-lg !border !border-gray-600 !bg-transparent !px-3 !py-2 !text-sm !text-white hover:!border-brand-blue hover:!bg-brand-blue/10"
            />
          </div>

          <button
            onClick={() => setShowLoginOptions(false)}
            className="mt-2 w-full text-center text-xs text-gray-500 hover:text-gray-300"
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
      className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-blue hover:bg-brand-blue/10"
    >
      {t.common.signIn}
    </button>
  );
}
