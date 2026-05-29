'use client';

import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { useCallback } from 'react';
import { buildAuthMessage } from '@/lib/auth-verify';

export interface AuthSig {
  address: string;
  authMessage: string;
  authSignature: string;
}

/**
 * Returns a function that prompts the connected wallet to sign a fresh,
 * time-stamped auth message. Spread the result into any mutating API request
 * body so the server can verify the caller controls `address` (C-2).
 */
export function useAuthSig(): () => Promise<AuthSig> {
  const account = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  return useCallback(async () => {
    if (!account?.address) throw new Error('Connect a wallet first.');
    const message = buildAuthMessage(account.address, Date.now());
    const { signature } = await signPersonalMessage({
      message: new TextEncoder().encode(message),
    });
    return { address: account.address, authMessage: message, authSignature: signature };
  }, [account, signPersonalMessage]);
}

// Cache the signature per address and reuse it within the freshness window, so
// frequent off-chain social calls (friends, chat, lobby) don't pop a wallet
// prompt every time. Re-signs ~1 min before the 5-min server window expires.
const sigCache = new Map<string, { sig: AuthSig; expiresAt: number }>();
const REUSE_MS = 4 * 60 * 1000;

export function useCachedAuthSig(): () => Promise<AuthSig> {
  const account = useCurrentAccount();
  const getAuthSig = useAuthSig();
  return useCallback(async () => {
    const addr = account?.address;
    if (!addr) throw new Error('Connect a wallet first.');
    const cached = sigCache.get(addr);
    if (cached && cached.expiresAt > Date.now()) return cached.sig;
    const sig = await getAuthSig();
    sigCache.set(addr, { sig, expiresAt: Date.now() + REUSE_MS });
    return sig;
  }, [account, getAuthSig]);
}
