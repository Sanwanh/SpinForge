// Mythic-Industrial design tokens — pure data, shared across the design components.

export type ElementId = 'wood' | 'fire' | 'metal' | 'water' | 'earth';

export interface ElementMeta {
  k: string;
  color: string;
  deep: string;
  glow: string;
  beast: string;
  beastName: string;
  beastNameZh: string;
}

export const ELEMENT_MAP: Record<ElementId, ElementMeta> = {
  wood:  { k: '木', color: '#00FF88', deep: '#0a8045', glow: 'rgba(0,255,136,0.5)',  beast: '龍', beastName: 'Azure Dragon',   beastNameZh: '青龍' },
  fire:  { k: '火', color: '#FF4444', deep: '#8a1414', glow: 'rgba(255,68,68,0.5)',  beast: '鳳', beastName: 'Vermilion Bird', beastNameZh: '朱雀' },
  metal: { k: '金', color: '#C0C0C0', deep: '#5e5e5e', glow: 'rgba(220,220,220,0.5)', beast: '虎', beastName: 'White Tiger',    beastNameZh: '白虎' },
  water: { k: '水', color: '#00CCFF', deep: '#0a6a85', glow: 'rgba(0,204,255,0.5)',  beast: '龜', beastName: 'Black Tortoise', beastNameZh: '玄武' },
  earth: { k: '土', color: '#FFB800', deep: '#8a6300', glow: 'rgba(255,184,0,0.5)',  beast: '皇', beastName: 'Yellow Dragon',  beastNameZh: '黃龍' },
};

export type RarityId = 'common' | 'rare' | 'epic' | 'legendary';

export interface RarityMeta {
  label: string;
  color: string;
  cls: string;
  bg: string;
}

export const RARITY_MAP: Record<RarityId, RarityMeta> = {
  common:    { label: 'COMMON',    color: 'var(--text-mute)', cls: 'r-common',    bg: 'linear-gradient(160deg, #15171c, #0a0e17)' },
  rare:      { label: 'RARE',      color: 'var(--rare)',      cls: 'r-rare',      bg: 'linear-gradient(160deg, #051a22, #0a0e17)' },
  epic:      { label: 'EPIC',      color: 'var(--epic)',      cls: 'r-epic',      bg: 'linear-gradient(160deg, #1a0a2a, #0a0e17)' },
  legendary: { label: 'LEGENDARY', color: 'var(--legendary)', cls: 'r-legendary', bg: 'linear-gradient(160deg, #1d1605, #0a0e17 60%, #0a0805)' },
};

export type BeyPaletteId = ElementId | 'gold';

export interface BeyPalette {
  rim: string;
  deep: string;
  core: string;
  glow: string;
  kanji: string;
}

export const BEY_PALETTES: Record<BeyPaletteId, BeyPalette> = {
  gold:  { rim: '#D4AF37', deep: '#8C6E18', core: '#F4D679', glow: 'rgba(212,175,55,0.5)', kanji: '龍' },
  wood:  { rim: '#00FF88', deep: '#0a8045', core: '#9affc8', glow: 'rgba(0,255,136,0.5)',  kanji: '龍' },
  fire:  { rim: '#FF4444', deep: '#8a1414', core: '#ffb0b0', glow: 'rgba(255,68,68,0.5)',  kanji: '鳳' },
  metal: { rim: '#C0C0C0', deep: '#5e5e5e', core: '#f0f0f0', glow: 'rgba(220,220,220,0.5)', kanji: '虎' },
  water: { rim: '#00CCFF', deep: '#0a6a85', core: '#a0e8ff', glow: 'rgba(0,204,255,0.5)',  kanji: '龜' },
  earth: { rim: '#FFB800', deep: '#8a6300', core: '#ffdc80', glow: 'rgba(255,184,0,0.5)',  kanji: '皇' },
};

export interface NavPage {
  id: string;
  label: string;
  href: string;
  group: number;
}

export const NAV_PAGES: NavPage[] = [
  { id: 'index',       label: 'Home',       href: '/',            group: 0 },
  { id: 'register',    label: 'Register',   href: '/register',    group: 1 },
  { id: 'passport',    label: 'Passport',   href: '/passport',    group: 1 },
  { id: 'battle',      label: 'Battle',     href: '/battle',      group: 2 },
  { id: 'friends',     label: 'Friends',    href: '/friends',     group: 2 },
  { id: 'community',   label: 'Combos',     href: '/community',    group: 2 },
  { id: 'cards',       label: 'Collection', href: '/collection',  group: 2 },
  { id: 'workshop',    label: 'Workshop',   href: '/workshop',    group: 2 },
  { id: 'gacha',       label: 'Packs',      href: '/packs',       group: 3 },
  { id: 'faq',         label: 'FAQ',        href: '/faq',         group: 3 },
];

// Map a Next.js pathname to a NAV_PAGES id for active highlighting
export function activePageId(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'index';
  if (pathname.startsWith('/register')) return 'register';
  if (pathname.startsWith('/passport')) return 'passport';
  if (pathname.startsWith('/workshop')) return 'workshop';
  if (pathname.startsWith('/collection') || pathname.startsWith('/deck')) return 'cards';
  if (pathname.startsWith('/packs')) return 'gacha';
  if (pathname.startsWith('/battle')) return 'battle';
  if (pathname.startsWith('/friends')) return 'friends';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/forge')) return 'forge';
  if (pathname.startsWith('/market')) return 'cards';
  if (pathname.startsWith('/elements')) return 'index';
  if (pathname.startsWith('/tokenomics')) return 'index';
  if (pathname.startsWith('/tournament')) return 'battle';
  if (pathname.startsWith('/team')) return 'faq';
  if (pathname.startsWith('/faq')) return 'faq';
  if (pathname.startsWith('/profile')) return 'passport';
  return '';
}
