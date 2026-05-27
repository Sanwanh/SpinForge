'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { WalletButton } from './WalletButton';
import { LocaleToggle } from './LocaleToggle';
import { Logo } from '@/components/design/Logo';
import { NAV_PAGES, activePageId } from '@/components/design/tokens';
import { useT } from '@/lib/i18n';

export function Navbar() {
  const pathname = usePathname();
  const active = activePageId(pathname || '/');
  const t = useT();
  const isZh = t.nav.home === '首頁';

  const navLabel = (id: string): string => {
    const labels: Record<string, string> = isZh
      ? { index: '首頁', register: '註冊', passport: '護照', battle: '對戰', cards: '收藏', gacha: '卡包', faq: '更多' }
      : { index: 'Home', register: 'Register', passport: 'Passport', battle: 'Battle', cards: 'Collection', gacha: 'Packs', faq: 'More' };
    return labels[id] ?? id;
  };

  const desktopLinks = NAV_PAGES.filter((p) => p.id !== 'index');

  return (
    <>
      {/* Desktop navbar */}
      <nav className="sf-nav">
        <Link href="/" className="sf-nav-logo">
          <span className="mark"><Logo size={28} /></span>
          SPINFORGE
        </Link>

        <div className="sf-nav-links">
          {desktopLinks.map((p, i, arr) => {
            const prev = arr[i - 1];
            const divider = prev && prev.group !== p.group;
            return (
              <React.Fragment key={p.id}>
                {divider && <span className="sf-nav-divider">·</span>}
                <Link href={p.href} className={active === p.id ? 'active' : undefined}>
                  {navLabel(p.id)}
                </Link>
              </React.Fragment>
            );
          })}
        </div>

        <div className="sf-flex sf-gap-3 sf-items-center" style={{ flexShrink: 0 }}>
          <LocaleToggle />
          <WalletButton />
        </div>
      </nav>

      {/* Mobile bottom bar — 5 core tabs */}
      <nav className="sf-mobile-bar" aria-label="Mobile primary">
        {[
          { id: 'index',    icon: '⌂', href: '/' },
          { id: 'register', icon: '鑄', href: '/register' },
          { id: 'battle',   icon: '⚔', href: '/battle' },
          { id: 'passport', icon: '證', href: '/passport' },
          { id: 'cards',    icon: '卡', href: '/collection' },
        ].map((p) => (
          <Link key={p.id} href={p.href} className={clsx(active === p.id && 'active')}>
            <span className="k">{p.icon}</span>
            {navLabel(p.id)}
          </Link>
        ))}
      </nav>
    </>
  );
}
