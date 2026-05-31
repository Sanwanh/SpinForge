// Curated "strong combo" reference for newcomers.
//
// These are SpinForge-native builds expressed in the game's own parts (spirit
// beast + type + ratchet prongs-height + bit category), grounded in the actual
// rules in contracts/sources/physics.move:
//   - Type wheel: ATK>STA (+30%), STA>DEF (+20%), DEF>ATK (+40% recoil reflect), BAL ±10%
//   - Wuxing: Wood>Earth>Water>Fire>Metal>Wood (+20%); same element -10%; Koryu neutral
//   - Spin steal: opposite spin direction transfers 10% AM
//   - Friction: Needle = slow decay (stamina), Rush/Flat = fast decay (attack)
//   - Ratchet: low (3-60) = low CoG/stability, high (5-80) = defensive; more prongs = more inertia
//   - Xtreme Dash: a Gear bit on a Rail zone (smaller gear = faster, less accurate)
// The archetypes follow universal spinning-top battle principles (Attack
// low-ratchet pressure / Stamina out-spin + Life-After-Death / Defense anti-KO),
// expressed entirely in SpinForge's own Four-Symbols parts. Original setting —
// no third-party product or brand names.

export type Archetype = 'Attack' | 'Defense' | 'Stamina' | 'Balance';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ElementId = 'wood' | 'fire' | 'metal' | 'water' | 'earth';

export interface SeedCombo {
  id: string;
  name: string;
  nameZh: string;
  archetype: Archetype;
  element: ElementId;
  difficulty: Difficulty;
  blade: string;
  ratchet: string; // "{prongs}-{height}" naming, mirrors the real system
  bit: string;
  why: string;
  whyZh: string;
  strong: string;
  strongZh: string;
  weak: string;
  weakZh: string;
}

export const ARCHETYPE_LABEL: Record<Archetype, { en: string; zh: string }> = {
  Attack: { en: 'Attack', zh: '攻擊' },
  Defense: { en: 'Defense', zh: '防禦' },
  Stamina: { en: 'Stamina', zh: '持久' },
  Balance: { en: 'Balance', zh: '平衡' },
};

export const DIFFICULTY_LABEL: Record<Difficulty, { en: string; zh: string }> = {
  beginner: { en: 'Beginner', zh: '新手' },
  intermediate: { en: 'Intermediate', zh: '進階' },
  advanced: { en: 'Advanced', zh: '高手' },
};

export const SEED_COMBOS: SeedCombo[] = [
  {
    id: 'tortoise-endure',
    name: 'Tortoise Endure',
    nameZh: '玄武持久',
    archetype: 'Stamina',
    element: 'water',
    difficulty: 'beginner',
    blade: 'Black Tortoise · Stamina type',
    ratchet: '5-80 (high, defensive posture)',
    bit: 'Needle (Stamina · lowest friction)',
    why: 'A high ratchet plus a Needle tip barely loses spin, so you simply outlast opponents and win on Spin Finish. The passive tip rarely self-KOs — the safest first build.',
    whyZh: '高扣環加針尖底部幾乎不掉轉速,靠「比誰轉得久」拿 Spin Finish。被動底部極少自滅,最安全的第一套。',
    strong: 'Beats Defense types (+20%)',
    strongZh: '剋防禦型(+20%)',
    weak: 'Aggressive Attack early KO',
    weakZh: '怕攻擊型早期擊飛',
  },
  {
    id: 'tiger-bulwark',
    name: 'Tiger Bulwark',
    nameZh: '白虎壁壘',
    archetype: 'Defense',
    element: 'metal',
    difficulty: 'beginner',
    blade: 'White Tiger · Defense type (high recoil resist)',
    ratchet: '1-60 (low, heavy, anti-KO insurance)',
    bit: 'Ball (Defense · anchored, Life-After-Death)',
    why: 'Sits low and heavy and reflects the attacker’s own recoil back at them — Defense beats Attack with a +40% recoil reflect. Ball keeps scoring even while wobbling.',
    whyZh: '低重心、重量足,把攻方的反作用力彈回去——防禦剋攻擊有 +40% 反傷。Ball 在搖晃(死旋)時還能得分。',
    strong: 'Beats Attack types (recoil reflect)',
    strongZh: '剋攻擊型(反傷)',
    weak: 'Stamina types out-spin it',
    weakZh: '怕持久型耗轉',
  },
  {
    id: 'vermilion-rush',
    name: 'Vermilion Rush',
    nameZh: '赤焰猛攻',
    archetype: 'Attack',
    element: 'fire',
    difficulty: 'intermediate',
    blade: 'Vermilion Bird · Attack type (high ATK, +burst damage)',
    ratchet: '3-60 (low, stable aggression)',
    bit: 'Rush (Attack · high friction, fast movement)',
    why: 'Maximum pressure: low ratchet for stability while you ram, Fire spirit adds burst damage, Attack beats Stamina (+30%). Win fast before you run out of spin.',
    whyZh: '極限壓制:低扣環撞擊時保持穩定,火屬性加爆裂傷害,攻擊剋持久(+30%)。要在掉轉前速戰速決。',
    strong: 'Beats Stamina types (+30%), fast Burst/Over',
    strongZh: '剋持久型(+30%),爆裂/擊飛快',
    weak: 'Defense reflects recoil; burns spin fast',
    weakZh: '怕防禦反傷;自身耗轉快',
  },
  {
    id: 'azure-gale',
    name: 'Azure Gale',
    nameZh: '青龍疾風',
    archetype: 'Attack',
    element: 'wood',
    difficulty: 'advanced',
    blade: 'Azure Dragon · Attack type (+Mobility)',
    ratchet: '1-60 (aggression + anti-KO)',
    bit: 'Gear Flat (small gear → fastest Xtreme Dash)',
    why: 'Built to hunt the 3-point Xtreme Finish: ride the Rail zone, trigger an Xtreme Dash and slam for 1.5× damage. High risk — the small gear is only ~70% accurate and self-recoil doubles.',
    whyZh: '專為 3 分的 Xtreme Finish 而生:走 Rail 區觸發 Xtreme Dash,1.5 倍傷害撞擊。高風險——小齒輪命中約 70%,且自身反傷加倍。',
    strong: 'Only build that scores 3-point Xtreme Finish',
    strongZh: '唯一能拿 3 分 Xtreme Finish 的路線',
    weak: 'Misses on low accuracy; needs a Rail stadium',
    weakZh: '命中率低易落空;需 Rail 場地',
  },
  {
    id: 'reverse-steal',
    name: 'Reverse Spin-Steal',
    nameZh: '逆旋奪魂',
    archetype: 'Attack',
    element: 'wood',
    difficulty: 'intermediate',
    blade: 'Left-spin Attack blade (opposite the meta)',
    ratchet: '3-70 (mid)',
    bit: 'Rush (Attack)',
    why: 'When spin directions are opposite, 10% of damage transfers spin from the defender to you. Run Left-spin against a Right-spin field to drain them while you build.',
    whyZh: '當雙方旋向相反,造成的傷害有 10% 會把對手轉速「偷」過來。在右旋當道的環境帶左旋,邊打邊吸對手轉速。',
    strong: 'Steals AM vs opposite-spin opponents',
    strongZh: '對逆旋對手偷轉速',
    weak: 'No steal vs same-spin (−15% contact)',
    weakZh: '同旋無偷取(接觸 −15%)',
  },
  {
    id: 'balanced-way',
    name: 'Balanced Way',
    nameZh: '平衡之道',
    archetype: 'Balance',
    element: 'metal',
    difficulty: 'beginner',
    blade: 'Balance type (any spirit)',
    ratchet: '4-70 (mid, all-round)',
    bit: 'Orb (Defense-leaning, stable)',
    why: 'Balance gives +10% to all and −10% from all — no hard counters either way. The most forgiving competitive build while you learn match-ups.',
    whyZh: '平衡型對所有對手 +10%、受到 −10%——沒有硬剋也不被硬剋。學習相剋關係時最不吃虧的競技套。',
    strong: 'No hard counters; consistent',
    strongZh: '無硬剋;穩定',
    weak: 'Master of none — loses the +30/40% edges',
    weakZh: '樣樣通樣樣鬆——拿不到 +30/40% 優勢',
  },
  {
    id: 'needle-marathon',
    name: 'Needle Marathon',
    nameZh: '針尖長轉',
    archetype: 'Stamina',
    element: 'water',
    difficulty: 'beginner',
    blade: 'Black Tortoise · Stamina type (+burst resist)',
    ratchet: '7-80 (high, max inertia)',
    bit: 'Needle (lowest friction)',
    why: 'Pure endurance: more prongs = higher moment of inertia, highest ratchet + Needle = the slowest spin decay in the game. You win the wobbling end-game (“Life After Death”).',
    whyZh: '純耐力:扣爪越多轉動慣量越大,最高扣環 + 針尖 = 全場最慢的轉速衰減。靠最後的搖晃殘局(死旋續戰)取勝。',
    strong: 'Outlasts almost everything 1v1',
    strongZh: '單挑幾乎耗死所有對手',
    weak: 'No offense — pure Attack KOs it early',
    weakZh: '毫無攻擊力——純攻擊早期擊飛',
  },
  {
    id: 'heavy-counter',
    name: 'Heavy Counter',
    nameZh: '重壁反傷',
    archetype: 'Defense',
    element: 'metal',
    difficulty: 'intermediate',
    blade: 'White Tiger · Defense type',
    ratchet: '9-70 (heavy, many prongs)',
    bit: 'Orb (Defense)',
    why: 'Set Lock Tightness high so impacts barely dent your Burst Integrity (at a small stamina cost), then let Attack types shatter themselves on your +40% recoil reflect.',
    whyZh: '把 Lock Tightness 調高,撞擊幾乎不傷你的爆裂值(代價是少量耗轉),讓攻擊型在你的 +40% 反傷上自爆。',
    strong: 'Hard-counters Attack; burst-resistant',
    strongZh: '硬剋攻擊;抗爆裂',
    weak: 'High lock drains stamina vs Stamina',
    weakZh: '高鎖緊耗轉,打持久吃虧',
  },
  {
    id: 'wuxing-wood-earth',
    name: 'Wuxing: Wood Cuts Earth',
    nameZh: '五行・木剋土',
    archetype: 'Attack',
    element: 'wood',
    difficulty: 'advanced',
    blade: 'Azure Dragon · Wood (Attack type)',
    ratchet: '3-60 (low)',
    bit: 'Spike (Attack)',
    why: 'A counter-pick: Wood beats Earth on the Wuxing wheel for +20% on top of the type bonus. Bring this specifically against Earth/Yellow-Dragon-heavy lineups.',
    whyZh: '針對性 counter:五行中木剋土,在屬性加成之外再 +20%。專門用來對付土系/黃龍陣容。',
    strong: '+20% element bonus vs Earth builds',
    strongZh: '對土系 +20% 屬性加成',
    weak: 'Hurts vs same-element Wood (−10%)',
    weakZh: '對同為木屬性 −10%',
  },
  {
    id: 'emperor-balance',
    name: "Emperor's Balance",
    nameZh: '皇龍均衡',
    archetype: 'Balance',
    element: 'earth',
    difficulty: 'advanced',
    blade: 'Yellow Dragon (Koryu) · Balance — legendary, Diamond unlock',
    ratchet: '5-70 (mid-high)',
    bit: 'Ball (Defense, Life-After-Death)',
    why: 'Koryu sits at the Wuxing center: neutral to every element, so it has no −20% weakness anyone can exploit. The most consistent build — but soulbound at Diamond rank, so it doubles as proof-of-skill.',
    whyZh: '黃龍居五行之中:對任何屬性都中性,沒有任何 −20% 弱點可被針對。最穩定的套——但鑽石階靈魂綁定,等於實力證明。',
    strong: 'No elemental weakness; ultra-consistent',
    strongZh: '無屬性弱點;極穩定',
    weak: 'Legendary-only; no +20% element edge',
    weakZh: '僅傳說可得;無 +20% 屬性優勢',
  },
];
