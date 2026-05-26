// ---- Network ----
export const SUI_NETWORK = 'testnet' as const;
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0xe2f6c1771f75ecdd9261bb10099dc42b5977e893e2beb0ca7eae3235a4f8994b';
export const ORIGINAL_PACKAGE_ID = '0xcb4ae0641d8cdf704bf42e3254a3d8463256dd6e77fb005250af16702466ce48';

// ---- Deployed Object IDs ----
export const ADMIN_CAP_ID = '0x6aa381e305390071088b576812732f934722fd11951b702ee42d1c0e2c774078';
export const GAME_CONFIG_ID = '0x8817f5c6419ef94db9f3b0655c8f219f3c28d3b8f4c0e22f305bfafa5f7d1e45';
export const SPARK_TREASURY_CAP_ID = '0x40bcb3ceb5f8e1e19f46388f418bccf108e5cd45b9761eec3f6aa0add9c1f45a';
export const FORGE_TREASURY_CAP_ID = '0xd7460f080363a217383d60c9361f08ff6a10175c8a5ebbf1338508d921bdccd2';
export const TRANSFER_POLICY_ID = '0x5246d426451a76b966bf54902da9682879346277a6969f69c08552765c72ab6c';
export const SUI_RANDOM_ID = '0x8';
export const SPARK_TYPE = `${PACKAGE_ID}::spark_token::SPARK_TOKEN`;

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
