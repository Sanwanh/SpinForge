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

  // Map design-token nav-page ids to i18n keys
  const navLabel = (id: string): string => {
    switch (id) {
      case 'passport':    return t.nav.passport;
      case 'elements':    return t.nav.elements;
      case 'cards':       return t.nav.cards;
      case 'gacha':       return t.nav.gacha;
      case 'battle':      return t.nav.battle;
      case 'forge':       return t.nav.forge;
      case 'marketplace': return t.nav.market;
      case 'tokenomics':  return t.nav.spark;
      case 'tournament':  return t.nav.tournament;
      case 'team':        return t.nav.team;
      case 'faq':         return t.nav.faq;
      case 'index':       return t.nav.home;
      default:            return id;
    }
  };

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

      <nav className="sf-mobile-bar" aria-label="Mobile primary">
        {[
          { id: 'index',       k: '家', href: '/' },
          { id: 'gacha',       k: '鑄', href: '/packs' },
          { id: 'cards',       k: '卡', href: '/collection' },
          { id: 'marketplace', k: '市', href: '/market' },
          { id: 'passport',    k: '證', href: '/passport' },
        ].map((p) => (
          <Link key={p.id} href={p.href} className={clsx(active === p.id && 'active')}>
            <span className="k">{p.k}</span>
            {navLabel(p.id)}
          </Link>
        ))}
      </nav>
    </>
  );
}
