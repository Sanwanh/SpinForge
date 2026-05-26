'use client';

import { useLocaleStore } from '@/lib/i18n';

export function LocaleToggle() {
  const { locale, toggle } = useLocaleStore();

  return (
    <button
      onClick={toggle}
      title={locale === 'zh' ? 'Switch to English' : '切換至中文'}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--text-mute)',
        fontFamily: 'var(--f-mono)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        cursor: 'pointer',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--gold)';
        e.currentTarget.style.color = 'var(--gold)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--text-mute)';
      }}
    >
      {locale === 'zh' ? 'EN' : '中'}
    </button>
  );
}
