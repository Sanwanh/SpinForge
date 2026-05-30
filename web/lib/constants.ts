// ---- Network ----
export const SUI_NETWORK = 'testnet' as const;
// Hardened package, fresh publish 2026-05-30 (audit remediation: H-4 AdminCap-gated
// battle records + M-1 GameConfig ban enforcement on register_rotor/open_pack).
// Fresh publish => PACKAGE_ID and ORIGINAL_PACKAGE_ID are the same.
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0x0d072582b7058f0bc709462add402df73a36b8371ef3628840397a743ee2c377';
export const ORIGINAL_PACKAGE_ID = '0x0d072582b7058f0bc709462add402df73a36b8371ef3628840397a743ee2c377';

// Treasury / admin address — pack payments are sent here (real SPARK charge for
// wallet players). This is a public address, never the private key.
export const TREASURY_ADDRESS = '0x6728bc6ed415fad991328142c556e6130c2866f999b07eabec17e92efd1941fb';

// Pack cost in MIST (9 decimals): 100 SPARK.
export const PACK_COST_MIST = 100_000_000_000n;

// ---- Deployed Object IDs ----
export const ADMIN_CAP_ID = '0xa295ba12fb7bada3856be0075b374f66325b36f4561af9ee662834db2bec5916';
export const GAME_CONFIG_ID = '0x3b372a7a4f94e9b7e517a38aaaa6592b50ae2e67a343f0e8c56462d2226bd238';
export const SPARK_TREASURY_CAP_ID = '0x026b064861338efe216e7d452736d9457f6bd2c84ddd48cc4149ed01811b4980';
export const FORGE_TREASURY_CAP_ID = '0x2ceb69214b7f7307df3a6ecce896c79d2b726e09fb7755da77ab1b9c82727406';
export const TRANSFER_POLICY_ID = '0x60f76856e08da9d434a2d5c27ba949cfa1833c9ea34e6bf86823e3cda2bc9b63';
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
