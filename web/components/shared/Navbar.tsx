'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { WalletButton } from './WalletButton';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/collection', label: 'Collection' },
  { href: '/workshop', label: 'Workshop' },
  { href: '/deck', label: 'Deck' },
  { href: '/market', label: 'Market' },
  { href: '/packs', label: 'Packs' },
  { href: '/forge', label: 'Forge' },
  { href: '/tournament', label: 'Tournament' },
] as const;

export function Navbar() {
  const pathname = usePathname();

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
          {NAV_LINKS.map((link) => (
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
              {link.label}
            </Link>
          ))}
        </div>

        <WalletButton />
      </nav>

      {/* Mobile bottom tabs */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-800 bg-surface/90 backdrop-blur-lg md:hidden">
        <div className="flex justify-around py-2">
          {NAV_LINKS.slice(0, 5).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors',
                pathname === link.href ? 'text-brand-blue' : 'text-gray-500'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
