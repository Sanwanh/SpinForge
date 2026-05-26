'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeSession, type ZkLoginSession } from '@/lib/zklogin';
import { useAuthStore } from '@/hooks/useAuth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const setZkSession = useAuthStore((s) => s.setZkSession);
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const idToken = params.get('id_token');

        if (!idToken) {
          setStatus('error');
          setErrorMsg('No ID token received from Google.');
          return;
        }

        const payload = JSON.parse(atob(idToken.split('.')[1]));
        const { sub, email } = payload;

        const stored = sessionStorage.getItem('zklogin_ephemeral');
        if (!stored) {
          setStatus('error');
          setErrorMsg('Session expired. Please try again.');
          return;
        }

        const { randomness, nonce, maxEpoch } = JSON.parse(stored);

        const session: ZkLoginSession = {
          ephemeralKeypair: stored,
          randomness,
          nonce,
          maxEpoch,
          jwt: idToken,
          sub,
          email: email ?? 'unknown',
          address: `zklogin:${sub.slice(0, 16)}`,
        };

        storeSession(session);
        setZkSession(session);
        sessionStorage.removeItem('zklogin_ephemeral');

        router.push('/');
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
      }
    }

    handleCallback();
  }, [router, setZkSession]);

  if (status === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-red-400">Authentication Error</h1>
        <p className="text-sm text-gray-400">{errorMsg}</p>
        <button onClick={() => router.push('/')} className="btn-primary text-sm">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      <p className="text-sm text-gray-400">Signing you in...</p>
    </div>
  );
}
