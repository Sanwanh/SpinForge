// ---- Network ----
export const SUI_NETWORK = 'testnet' as const;
// Hardened package, fresh publish 2026-05-31 (red-team remediation: H-RT-4
// AdminCap-gated player_profile + shared profile; H-RT-3 SPARK/FORGE MAX_SUPPLY).
// Fresh publish => PACKAGE_ID and ORIGINAL_PACKAGE_ID are the same.
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0x79e8552bfb9b9cf61b3534a03061b222f022671be4b384efa55d557586ed2110';
export const ORIGINAL_PACKAGE_ID = '0x79e8552bfb9b9cf61b3534a03061b222f022671be4b384efa55d557586ed2110';

// Treasury address — pack payments are sent here. After the C-1/H-RT-3 key split
// this is the MINTER address (holds the SPARK TreasuryCap and signs open-pack),
// so payment verification (payment must reach the signer) stays consistent.
// Public address, never the private key.
export const TREASURY_ADDRESS = '0xe50ccc8220289e27588b05c9a5a2194bbd6869a36ee003a6c7d7b8daf5435c2e';

// Pack cost in MIST (9 decimals): 100 SPARK.
export const PACK_COST_MIST = 100_000_000_000n;

// ---- Deployed Object IDs ----
export const ADMIN_CAP_ID = '0xe6f16e912dbd2a9ee58bc8207648e9225dfe00d95e4888ddcafa1b8239383090';
export const GAME_CONFIG_ID = '0xa72dad0e0757d98fad022feae4dd64f5281ad89db246c4377f714080e26ab41a';
export const SPARK_TREASURY_CAP_ID = '0x095b18a88100dc11f9f1ec3047adf5ac0e497e03d1f7e3b5f50fc2dad9569e69';
export const FORGE_TREASURY_CAP_ID = '0x646620870daec249f3e8f2ccc003749713def637e1a391a812c58ceaff8e856a';
export const TRANSFER_POLICY_ID = '0xcfe28fa4843823f9ecefd726e9a49b82c43cda250e1b9712d2b22edb7ecd0ec5';
export const SUI_RANDOM_ID = '0x8';
// SPARK_TOKEN type is bound to the ORIGINAL defining package, not upgraded versions.
export const SPARK_TYPE = `${ORIGINAL_PACKAGE_ID}::spark_token::SPARK_TOKEN`;

// player_profile now lives in the main hardened package (single deployment).
export const PROFILE_PACKAGE_ID = ORIGINAL_PACKAGE_ID;
export const PROFILE_TYPE = `${PROFILE_PACKAGE_ID}::player_profile::PlayerProfile`;

// ---- Spirit Beasts ----
export const SPIRIT_BEASTS = [
  { id: 0, name: 'Azure Dragon', chinese: 'Seiryu', element: 'Wood', direction: 'East', season: 'Spring' },
  { id: 1, name: 'Vermilion Bird', chinese: 'Suzaku', element: 'Fire', direction: 'South', season: 'Summer' },
  { id: 2, name: 'White Tiger', chinese: 'Byakko', element: 'Metal', direction: 'West', season: 'Autumn' },
  { id: 3, name: 'Black Tortoise', chinese: 'Genbu', element: 'Water', direction: 'North', season: 'Winter' },
  { id: 4, name: 'Yellow Dragon', chinese: 'Koryu', element: 'Earth', direction: 'Center', season: '---' },
] as const;

// ---- Elements ----
export const ELEMENTS = ['Wood', 'Fire', 'Metal', 'Water', 'Earth'] as const;
export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_COLORS: Record<Element, string> = {
  Wood: '#10B981',
  Fire: '#EF4444',
  Metal: '#94A3B8',
  Water: '#3B82F6',
  Earth: '#F59E0B',
};

export const ELEMENT_BG_CLASSES: Record<Element, string> = {
  Wood: 'bg-element-wood',
  Fire: 'bg-element-fire',
  Metal: 'bg-element-metal',
  Water: 'bg-element-water',
  Earth: 'bg-element-earth',
};

// Wuxing cycle: Wood > Earth > Water > Fire > Metal > Wood
export const WUXING_ADVANTAGE: Record<Element, Element> = {
  Wood: 'Earth',
  Earth: 'Water',
  Water: 'Fire',
  Fire: 'Metal',
  Metal: 'Wood',
};

// ---- Bey Types ----
export const BEY_TYPES = ['Attack', 'Defense', 'Stamina', 'Balance'] as const;
export type BeyType = (typeof BEY_TYPES)[number];

export const BEY_TYPE_LABELS: Record<number, BeyType> = {
  0: 'Attack',
  1: 'Defense',
  2: 'Stamina',
  3: 'Balance',
};

// ---- Rarity ----
export const RARITIES = ['Common', 'Rare', 'Epic', 'Legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_LABELS: Record<number, Rarity> = {
  0: 'Common',
  1: 'Rare',
  2: 'Epic',
  3: 'Legendary',
};

export const RARITY_BORDER_CLASSES: Record<Rarity, string> = {
  Common: 'rarity-common',
  Rare: 'rarity-rare',
  Epic: 'rarity-epic',
  Legendary: 'rarity-legendary',
};

// ---- Bit Categories ----
export const BIT_CATEGORIES = ['Attack', 'Defense', 'Stamina', 'Gear'] as const;
export type BitCategory = (typeof BIT_CATEGORIES)[number];

export const BIT_CATEGORY_LABELS: Record<number, BitCategory> = {
  0: 'Attack',
  1: 'Defense',
  2: 'Stamina',
  3: 'Gear',
};

// ---- Zones ----
export const ZONES = ['Center', 'Mid', 'Wall', 'Rail'] as const;
export type Zone = (typeof ZONES)[number];

// ---- Scoring ----
export const FINISH_TYPES = {
  SPIN: { points: 1, label: 'Spin Finish' },
  OVER: { points: 2, label: 'Over Finish' },
  BURST: { points: 2, label: 'Burst Finish' },
  XTREME: { points: 3, label: 'Xtreme Finish' },
} as const;

// ---- Technique Categories ----
export const TECHNIQUE_CATEGORIES = ['Launch', 'Attack', 'Defense', 'Xtreme', 'Spirit'] as const;

// ---- Stadium Types ----
export const STADIUM_TYPES = [
  { id: 0, name: 'Standard X', railPattern: 'X-shaped cross', description: '4 rail zones, balanced' },
  { id: 1, name: 'Infinity Loop', railPattern: 'Circular continuous rail', description: 'More Xtreme Dash opportunities' },
  { id: 2, name: "Dragon's Maw", railPattern: 'Single diagonal rail', description: 'High-risk single corridor' },
  { id: 3, name: 'Fortress', railPattern: 'No rails, deep bowl', description: 'Stamina meta, no Xtreme Finish' },
] as const;

// ---- Rank Progression ----
export const RANKS = [
  { name: 'Rookie', xp: 0, color: '#9CA3AF' },
  { name: 'Bronze', xp: 300, color: '#CD7F32' },
  { name: 'Silver', xp: 1000, color: '#C0C0C0' },
  { name: 'Gold', xp: 3000, color: '#FFD700' },
  { name: 'Platinum', xp: 8000, color: '#E5E4E2' },
  { name: 'Diamond', xp: 20000, color: '#B9F2FF' },
] as const;
