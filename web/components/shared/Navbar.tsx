'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { WalletButton } from './WalletButton';
import { LocaleToggle } from './LocaleToggle';
import { useT } from '@/lib/i18n';

const NAV_KEYS = [
  { href: '/', key: 'home' },
  { href: '/collection', key: 'collection' },
  { href: '/workshop', key: 'workshop' },
  { href: '/deck', key: 'deck' },
  { href: '/market', key: 'market' },
  { href: '/packs', key: 'packs' },
  { href: '/forge', key: 'forge' },
  { href: '/tournament', key: 'tournament' },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const t = useT();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-surface/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-orange font-bold text-white">
            S
          </div>
          <span className="text-lg font-bold text-gradient">SpinForge</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_KEYS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-brand-blue/20 text-brand-blue'
                  : 'text-gray-400 hover:bg-surface-overlay hover:text-white'
              )}
            >
              {t.nav[link.key]}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LocaleToggle />
          <WalletButton />
        </div>
      </nav>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-800 bg-surface/90 backdrop-blur-lg md:hidden">
        <div className="flex justify-around py-2">
          {NAV_KEYS.slice(0, 5).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors',
                pathname === link.href ? 'text-brand-blue' : 'text-gray-500'
              )}
            >
              {t.nav[link.key]}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
