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
