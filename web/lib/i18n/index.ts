import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zh } from './zh';
import { en } from './en';

export type Locale = 'zh' | 'en';
type DeepStringify<T> = {
  readonly [K in keyof T]: T[K] extends Record<string, unknown> ? DeepStringify<T[K]> : string;
};

export type Translations = DeepStringify<typeof zh>;

const translations: Record<Locale, Translations> = { zh, en };

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggle: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'zh',
      setLocale: (locale) => set({ locale }),
      toggle: () => set({ locale: get().locale === 'zh' ? 'en' : 'zh' }),
    }),
    { name: 'spinforge-locale' },
  ),
);

export function useT(): Translations {
  const locale = useLocaleStore((s) => s.locale);
  return translations[locale];
}

export { zh, en };
