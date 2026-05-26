'use client';

import { useLocaleStore } from '@/lib/i18n';

export function LocaleToggle() {
  const { locale, toggle } = useLocaleStore();

  return (
    <button
      onClick={toggle}
      className="rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-surface-overlay hover:text-white"
      title={locale === 'zh' ? 'Switch to English' : '切換至中文'}
    >
      {locale === 'zh' ? 'EN' : '中'}
    </button>
  );
}
