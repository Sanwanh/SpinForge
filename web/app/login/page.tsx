'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { Corners } from '@/components/design/atoms';

const APP_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 12.54c-.02-2.05 1.68-3.03 1.75-3.08-.95-1.4-2.44-1.59-2.97-1.61-1.27-.13-2.47.74-3.11.74-.64 0-1.63-.72-2.68-.7-1.38.02-2.65.8-3.36 2.04-1.43 2.49-.37 6.17 1.03 8.19.68.99 1.5 2.1 2.57 2.06 1.03-.04 1.42-.67 2.67-.67 1.24 0 1.6.67 2.69.65 1.11-.02 1.81-1.01 2.49-2 .78-1.15 1.11-2.26 1.13-2.32-.02-.01-2.17-.83-2.2-3.29zM15.1 6.4c.56-.69.95-1.64.84-2.6-.81.03-1.8.54-2.39 1.22-.52.6-.98 1.57-.86 2.5.91.07 1.84-.46 2.41-1.12z" />
    </svg>
  );
}

type Status = { kind: 'idle' | 'loading' | 'ok' | 'error'; message?: string };

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const isZh = t.nav.home === '首頁';
  const { isAuthenticated, isPending } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [magicStatus, setMagicStatus] = useState<Status>({ kind: 'idle' });

  // Already signed in -> send home (guests who never signed in stay free to browse).
  useEffect(() => {
    if (!isPending && isAuthenticated) router.replace('/');
  }, [isPending, isAuthenticated, router]);

  const errMessage = (e: unknown): string => {
    if (e && typeof e === 'object' && 'message' in e) {
      const m = (e as { message?: unknown }).message;
      if (typeof m === 'string' && m) return m;
    }
    return isZh ? '發生錯誤,請再試一次。' : 'Something went wrong, please try again.';
  };

  const handleEmailPassword = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ kind: 'loading' });
    try {
      const res =
        mode === 'signin'
          ? await authClient.signIn.email({ email, password, callbackURL: '/' })
          : await authClient.signUp.email({ email, password, name: name || email, callbackURL: '/' });
      if (res?.error) {
        setStatus({ kind: 'error', message: res.error.message ?? errMessage(res.error) });
        return;
      }
      setStatus({ kind: 'ok' });
      router.replace('/');
    } catch (err) {
      setStatus({ kind: 'error', message: errMessage(err) });
    }
  };

  const handleSocial = async (provider: 'google' | 'apple') => {
    setStatus({ kind: 'loading' });
    try {
      // No-op gracefully when the provider isn't configured: Better Auth returns
      // an error (rather than redirecting) instead of throwing.
      const res = await authClient.signIn.social({
        provider,
        callbackURL: `${APP_ORIGIN}/`,
      });
      if (res?.error) {
        setStatus({
          kind: 'error',
          message: isZh
            ? `${provider === 'google' ? 'Google' : 'Apple'} 登入目前未啟用。`
            : `${provider === 'google' ? 'Google' : 'Apple'} sign-in is not available yet.`,
        });
        return;
      }
      setStatus({ kind: 'idle' });
    } catch {
      setStatus({
        kind: 'error',
        message: isZh ? '此登入方式目前未啟用。' : 'This sign-in method is not available yet.',
      });
    }
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setMagicStatus({ kind: 'loading' });
    try {
      const res = await authClient.signIn.magicLink({
        email: magicEmail,
        callbackURL: '/',
      });
      if (res?.error) {
        setMagicStatus({ kind: 'error', message: res.error.message ?? errMessage(res.error) });
        return;
      }
      setMagicStatus({
        kind: 'ok',
        message: isZh ? '魔法連結已寄出,請查看你的信箱。' : 'Magic link sent — check your inbox.',
      });
    } catch (err) {
      setMagicStatus({ kind: 'error', message: errMessage(err) });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 12px',
    borderRadius: 6,
    background: 'var(--void)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'var(--f-mono)',
    fontSize: 13,
    letterSpacing: '0.02em',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    color: 'var(--text-dim)',
    letterSpacing: '0.14em',
    marginBottom: 5,
    display: 'block',
  };

  const socialBtnStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    padding: '11px 0',
    borderRadius: 8,
    fontFamily: 'var(--f-ui)',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  };

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '120px 24px 64px',
        overflow: 'hidden',
      }}
    >
      <div className="kanji-watermark" style={{ fontSize: 620, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.04 }}>
        鑄
      </div>

      <div
        className="panel"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 420,
          padding: 28,
          boxShadow: '0 18px 48px rgba(0,0,0,0.6)',
        }}
      >
        <Corners color="var(--gold)" />

        <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 6 }}>
          {isZh ? '進入鑄造場' : 'Enter the Forge'}
        </div>
        <h1 className="t-h3" style={{ fontSize: 24, margin: '0 0 6px' }}>
          {mode === 'signin'
            ? isZh ? '登入' : 'Sign In'
            : isZh ? '建立帳號' : 'Create Account'}
        </h1>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: '0 0 22px' }}>
          {isZh ? '使用電子郵件或社群帳號開始遊玩。' : 'Use email or a social account to start playing.'}
        </p>

        {/* Social */}
        <button
          type="button"
          onClick={() => handleSocial('google')}
          style={{ ...socialBtnStyle, background: '#fff', border: 'none', color: '#1f1f1f', marginBottom: 10 }}
        >
          <GoogleMark size={16} />
          {isZh ? '使用 Google 登入' : 'Continue with Google'}
        </button>
        <button
          type="button"
          onClick={() => handleSocial('apple')}
          style={{ ...socialBtnStyle, background: '#000', border: '1px solid var(--border)', color: '#fff', marginBottom: 18 }}
        >
          <AppleMark size={16} />
          {isZh ? '使用 Apple 登入' : 'Continue with Apple'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 18px' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
          <span className="t-mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
            {isZh ? '或使用電子郵件' : 'OR WITH EMAIL'}
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} />
        </div>

        {/* Email + password */}
        <form onSubmit={handleEmailPassword} style={{ display: 'grid', gap: 12 }}>
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="t-mono" style={labelStyle}>
                {isZh ? '顯示名稱' : 'DISPLAY NAME'}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isZh ? '鑄造師' : 'Forge Master'}
                style={inputStyle}
                autoComplete="nickname"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="t-mono" style={labelStyle}>
              {isZh ? '電子郵件' : 'EMAIL'}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="t-mono" style={labelStyle}>
              {isZh ? '密碼' : 'PASSWORD'}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={status.kind === 'loading'}
            style={{ width: '100%', marginTop: 4 }}
          >
            {status.kind === 'loading'
              ? t.common.loading
              : mode === 'signin'
                ? t.common.signIn
                : isZh ? '建立帳號' : 'Create Account'}
          </button>
        </form>

        {status.kind === 'error' && (
          <p className="t-mono" style={{ marginTop: 12, color: 'var(--blood)', fontSize: 11, lineHeight: 1.5 }}>
            {status.message}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setStatus({ kind: 'idle' });
          }}
          style={{
            marginTop: 14,
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          {mode === 'signin'
            ? isZh ? '沒有帳號?建立一個 →' : "No account? Create one →"
            : isZh ? '已有帳號?登入 →' : 'Have an account? Sign in →'}
        </button>

        {/* Magic link */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border-soft)' }}>
          <div className="t-mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.14em', marginBottom: 8 }}>
            {isZh ? '或寄送魔法連結' : 'OR SEND A MAGIC LINK'}
          </div>
          <form onSubmit={handleMagicLink} style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              required
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ ...inputStyle, flex: 1 }}
              autoComplete="email"
            />
            <button
              type="submit"
              className="btn btn-ghost"
              disabled={magicStatus.kind === 'loading'}
              style={{ padding: '0 16px', fontSize: 12, whiteSpace: 'nowrap' }}
            >
              {magicStatus.kind === 'loading' ? t.common.loading : isZh ? '寄送' : 'Send'}
            </button>
          </form>
          {magicStatus.kind === 'ok' && (
            <p className="t-mono" style={{ marginTop: 10, color: 'var(--wood)', fontSize: 11, lineHeight: 1.5 }}>
              {magicStatus.message}
            </p>
          )}
          {magicStatus.kind === 'error' && (
            <p className="t-mono" style={{ marginTop: 10, color: 'var(--blood)', fontSize: 11, lineHeight: 1.5 }}>
              {magicStatus.message}
            </p>
          )}
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link
            href="/"
            className="t-mono"
            style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.16em', textDecoration: 'none', textTransform: 'uppercase' }}
          >
            {isZh ? '← 以訪客身分瀏覽' : '← Browse as guest'}
          </Link>
        </div>
      </div>
    </main>
  );
}
