# SpinForge -- Game Design Document v0.1

## Design Pillars
1. **Customization Fantasy**: Building your top from parts feels like invention, not shopping.
2. **Readable Strategy**: Every matchup has a plan; no coin-flip outcomes.
3. **Dramatic Finishes**: Three distinct win conditions create highlight moments.
4. **Own What You Forge**: Blockchain ownership reflects real effort, not just spending.

---

## 1. Card Categories

### 1A. Core Card (NFT) -- 3 subtypes, 1 per deck slot

| Subtype | Role | Base Stats | Rarity Tiers (Common/Rare/Epic/Legendary) |
|---------|------|------------|-------------------------------------------|
| **Layer** | Attack ring; determines Type (ATK/DEF/STA/BAL) and Element | ATK 1-5, Burst Threshold 3-8 | C: 1 passive / R: 1 passive+1 conditional / E: 2 passives / L: 2 passives+1 unique |
| **Disk** | Weight core; raw stats | HP 20-60, Weight 1-5 | C: +0 bonus / R: +5 HP / E: +10 HP, +1 Weight / L: +15 HP, +2 Weight, 1 passive |
| **Driver** | Tip; movement pattern and stamina curve | Stamina 8-14, Mobility 1-5 | C: flat decay / R: slow-start decay / E: conditional decay skip / L: decay skip + counter |

**Assembly**: One Layer + One Disk + One Driver = one Beyblade configuration. A player fields exactly one assembled Beyblade per battle.

### 1B. Technique Cards (Fungible, non-NFT)
Action cards played during battle. Deck holds 15. Categories:
- **Launch** (3 max): Set initial spin power modifier (+1 to +4 Stamina) and first-turn bonus.
- **Attack** (no limit): Deal damage or push opponent. Cost: 1-3 Spin.
- **Defense** (no limit): Reduce incoming damage or prevent Burst. Cost: 1-2 Spin.
- **Shift** (4 max): Reposition on the stadium grid. Cost: 1 Spin.

### 1C. Stadium Cards (NFT, one per match)
5x5 hex grid with terrain tiles. Each stadium has:
- **Home Zones** (2): Starting positions.
- **Terrain Effects** (3-5 tiles): Boost/penalize by Element or Type.
- **Center Tile**: Grants +1 Spin recovery per turn to occupant.

Rarity: Common (1 terrain effect), Rare (3), Epic (5 + 1 hazard), Legendary (5 + 2 hazards + dynamic shift at turn 4).

### 1D. Spirit Cards (NFT, soulbound)
Earned through milestones, never tradeable. One equipped per Beyblade.
- Grant a once-per-game ability (e.g., "Phoenix Blaze: ignore next Burst check").
- Tied to player progression rank.

---

## 2. Battle System

### Phase Structure (per turn)

| Phase | Action |
|-------|--------|
| **1. Spin Decay** | Both players lose Stamina equal to their Driver's decay rate (base 1/turn). |
| **2. Draw** | Draw 1 Technique card (hand limit: 5). |
| **3. Action** | Each player secretly selects 1 Technique card, revealed simultaneously. |
| **4. Resolution** | Compare card types, apply Type advantage, resolve damage/movement. |
| **5. Burst Check** | If a Beyblade's accumulated hit damage this game >= its Burst Threshold, it bursts. |

### Win Conditions (checked in priority order)

| Finish | Trigger | Points |
|--------|---------|--------|
| **Burst Finish** | Opponent's accumulated damage >= Burst Threshold | 3 pts |
| **Over Finish** | Opponent pushed off the 5x5 grid edge | 2 pts |
| **Spin Finish** | Opponent's Stamina hits 0 first | 1 pt |

Match is best-of-3 (first to 4+ points wins). This creates comeback tension -- a Spin Finish winner can still lose the match to one Burst Finish.

### Type Advantage Matrix

| Attacker \ Defender | ATK | DEF | STA | BAL |
|---------------------|-----|-----|-----|-----|
| **ATK** | -- | -1 dmg | +2 dmg, +1 push | +1 dmg |
| **DEF** | +1 dmg, reflect 1 | -- | -1 push | -- |
| **STA** | dodge (50% negate) | +1 Spin recovery | -- | -1 decay |
| **BAL** | -- | +1 push | +1 dmg | -- |

ATK beats STA, DEF beats ATK, STA beats DEF, BAL has no hard counter but no hard weakness.

---

## 3. Element System

Five elements. Each Technique card carries one element tag.

**Interaction Wheel** (attacker -> defender, +2 bonus damage):
Fire > Wind > Earth > Lightning > Water > Fire

**Resistance** (defender's element vs incoming, -1 damage): same-element attacks.

Layer element determines Beyblade element. Stadium terrain tiles amplify element: standing on a matching-element tile grants +1 to all same-element Technique cards played that turn.

---

## 4. Deck Building Rules

- **Beyblade Assembly**: 1 Layer + 1 Disk + 1 Driver (3 NFT cards).
- **Spirit**: 0 or 1 (soulbound).
- **Technique Deck**: Exactly 15 cards. Constraints: max 3 Launch, max 4 Shift, max 2 copies of any single card.
- **Stadium**: 1 per player; coin flip determines which stadium is used.
- **Banned Combos**: No Layer + Driver pairs from the restricted list (updated quarterly by governance vote). Initial ban: Legendary Layer "Void Eater" + any Driver with Mobility 5 (eliminates counterplay to Over Finish).

---

## 5. Progression System

| Rank | XP Required | Unlock |
|------|-------------|--------|
| Bronze | 0 | Tutorial Spirit card |
| Silver | 500 | Forge station (craft Rare parts) |
| Gold | 2000 | Evolution (upgrade Common -> Rare) |
| Platinum | 5000 | Fusion (combine 2 same-rarity parts into next rarity) |
| Diamond | 12000 | Spirit evolution, Legendary forge access |

**Evolution**: Burn 3 same-name Common cards + 50 Spark tokens -> 1 Rare of that card. Stats reroll within Rare range.
**Fusion**: Burn 2 same-rarity cards of same subtype + 200 Spark -> 1 next-rarity card. Element and passives randomly selected from parent pool.

---

## 6. Blockchain Economy

### Token Architecture

| Asset | Standard | Tradeable? | Source |
|-------|----------|------------|--------|
| Layer, Disk, Driver | ERC-721 (NFT) | Yes | Forging, packs, tournaments |
| Stadium | ERC-721 (NFT) | Yes | Seasonal drops, crafting |
| Spirit | ERC-721 (Soulbound) | No | Rank milestones only |
| Technique cards | Off-chain | No | Earned in-game, not scarce |
| **$SPARK** (fungible) | ERC-20 | Yes | Match rewards, daily quests |
| **$FORGE** (governance) | ERC-20 | Yes | Tournament prizes, staking |

### Sink/Source Balance

| Source (minting) | Sink (burning) |
|------------------|----------------|
| Match win: 10-30 $SPARK | Evolution: 50 $SPARK + 3 cards burned |
| Daily quest: 20 $SPARK | Fusion: 200 $SPARK + 2 cards burned |
| Tournament entry: free | Re-roll passives: 100 $SPARK |
| Pack purchase: 5 cards minted | Stadium crafting: 500 $SPARK + 2 Stadiums burned |

Target inflation rate: net $SPARK supply grows <= 2%/week. Governance adjusts sink costs quarterly.

### Tournament Prize Structure

| Placement | Prize |
|-----------|-------|
| 1st | 500 $FORGE + 1 Legendary pack + exclusive Stadium NFT |
| 2nd-4th | 200 $FORGE + 1 Epic pack |
| 5th-8th | 100 $FORGE + 1 Rare pack |
| Top 32 | 50 $FORGE |
| Participation | 10 $SPARK per match played |

Entry: 50 $SPARK (burned) or free entry token (earned weekly).

---

## Tuning Notes

All numerical values above are marked as initial hypotheses. Priority playtesting targets:
1. **Stamina decay rate vs match length**: Target 6-10 turns per round. If average exceeds 10, increase base decay to 2.
2. **Burst Threshold range**: If Burst Finishes occur < 15% of rounds, lower thresholds by 1 across all rarities.
3. **$SPARK economy**: Monitor weekly net supply. If > 2% growth, increase Evolution/Fusion costs by 20%.
4. **Type advantage impact**: If ATK win rate vs STA exceeds 65%, reduce bonus from +2 to +1.
