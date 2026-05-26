'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { WalletButton } from './WalletButton';
import { LocaleToggle } from './LocaleToggle';
import { Logo } from '@/components/design/Logo';
import { NAV_PAGES, activePageId } from '@/components/design/tokens';

export function Navbar() {
  const pathname = usePathname();
  const active = activePageId(pathname || '/');

  const visible = NAV_PAGES.filter((p) => p.id !== 'index');

  return (
    <>
      <nav className="sf-nav">
        <Link href="/" className="sf-nav-logo">
          <span className="mark">
            <Logo size={28} />
          </span>
          SPINFORGE
        </Link>

        <div className="sf-nav-links">
          {visible.map((p, i, arr) => {
            const prev = arr[i - 1];
            const divider = prev && prev.group !== p.group;
            return (
              <React.Fragment key={p.id}>
                {divider && <span className="sf-nav-divider">·</span>}
                <Link href={p.href} className={active === p.id ? 'active' : undefined}>
                  {p.label}
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

      <nav className="sf-mobile-bar" aria-label="Mobile primary">
        {[
          { id: 'index', label: 'Home', k: '家', href: '/' },
          { id: 'gacha', label: 'Gacha', k: '鑄', href: '/packs' },
          { id: 'cards', label: 'Cards', k: '卡', href: '/collection' },
          { id: 'marketplace', label: 'Market', k: '市', href: '/market' },
          { id: 'passport', label: 'Passport', k: '證', href: '/passport' },
        ].map((p) => (
          <Link key={p.id} href={p.href} className={clsx(active === p.id && 'active')}>
            <span className="k">{p.k}</span>
            {p.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
