// Deterministic fun display name derived from a wallet address, so the same
// address always gets the same name. ASCII-only (safe for an on-chain String).
const ADJ = [
  'Crimson', 'Azure', 'Golden', 'Shadow', 'Thunder', 'Frost',
  'Iron', 'Storm', 'Blazing', 'Ivory', 'Obsidian', 'Jade',
  'Scarlet', 'Cobalt', 'Solar', 'Lunar',
];
const NOUN = [
  'Dragon', 'Phoenix', 'Tiger', 'Tortoise', 'Fang', 'Vortex',
  'Blade', 'Comet', 'Talon', 'Sovereign', 'Tempest', 'Warden',
  'Reaver', 'Falcon', 'Saber', 'Wyrm',
];

export function funName(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const adj = ADJ[h % ADJ.length];
  const noun = NOUN[Math.floor(h / ADJ.length) % NOUN.length];
  const num = (h % 900) + 100; // 100–999
  return `${adj}${noun}${num}`;
}
