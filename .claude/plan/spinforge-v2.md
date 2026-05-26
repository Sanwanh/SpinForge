# SpinForge v2 - Implementation Plan (Physics-Authentic Redesign)

## Project Name: **SpinForge**

> Beyblade X-authentic blockchain card game on Sui Move.
> Parts system, physics, and scoring faithfully mirror real competitive Beyblade.

---

## 1. Game Design — Grounded in Real Beyblade

### Core Loop
```
Open Packs -> Collect Parts (Blade/Ratchet/Bit NFTs)
  -> Assemble 3 Beyblades (Deck)
  -> Battle (3on3, physics-based)
  -> Earn $SPARK + XP
  -> Forge/Evolve Better Parts
  -> Compete in Tournaments
```

### 1.1 Parts System (Faithful to Beyblade X)

Three interchangeable NFT parts per Beyblade, matching real Beyblade X:

| Part | Real Function | Game Stats | NFT? |
|------|--------------|------------|------|
| **Blade** | Top attack ring, contact geometry, avatar identity | ATK, Recoil, Spin Direction (L/R), Spirit Beast, Type (ATK/DEF/STA/BAL) | Yes |
| **Ratchet** | Middle hub, height + stability + burst mechanism | Height (50-80), Prongs (0-9), Weight, Burst Resistance | Yes |
| **Bit** | Bottom tip + gear teeth, movement + Xtreme Dash | Friction, Mobility, Gear Diameter, Stamina Decay Rate | Yes |

**Assembly**: 1 Blade + 1 Ratchet + 1 Bit = 1 Beyblade (on-chain via `dynamic_object_field`)

**Ratchet Naming Convention** (mirrors real system):
- Format: `{prongs}-{height}` (e.g., "3-60" = 3 prongs, 60mm height)
- Low ratchets (1-60, 3-60): low center of gravity, high stability
- High ratchets (5-80, 7-80): raised contact, defensive profile
- More prongs = more weight distributed outward = higher moment of inertia

**Bit Types** (29+ varieties inspired by real Beyblade X):

| Category | Examples | Behavior |
|----------|----------|----------|
| **Attack** | Rush (R), Spike (S), Accel (A), Quake (Q) | High friction, aggressive movement, fast stamina drain |
| **Defense** | Flat (F), Ball (B), Orb (O), Unite (U) | Medium friction, anchored position, high recoil resistance |
| **Stamina** | Needle (N), High Needle (HN), Cyclone (C) | Minimal friction, center spin, maximum spin time |
| **Gear** | Gear Flat (GF), Gear Ball (GB), Gear Needle (GN) | Enhanced Xtreme Dash: smaller gear = faster dash, larger = more control |

### 1.2 Spirit Beast System (Four Symbols / Wu Xing Cosmology)

Instead of generic elements, use the actual mythological system from original Beyblade:

| Spirit Beast | Chinese Name | Element | Direction | Season | Color | Stat Bonus |
|-------------|-------------|---------|-----------|--------|-------|------------|
| **Azure Dragon** | Seiryu / Canglong | Wood/Wind | East | Spring | Blue-Green | +ATK, +Mobility |
| **Vermilion Bird** | Suzaku / Zhuque | Fire | South | Summer | Red | +ATK, +Burst Damage |
| **White Tiger** | Byakko / Baihu | Metal | West | Autumn | White | +DEF, +Recoil Resist |
| **Black Tortoise** | Genbu / Xuanwu | Water | North | Winter | Black | +STA, +Burst Resist |
| **Yellow Dragon** | Koryu / Huanglong | Earth | Center | --- | Gold | +ALL (minor), Legendary only |

**Elemental Interaction Wheel** (based on Wuxing cycle):
```
Wood -> Earth -> Water -> Fire -> Metal -> Wood
```
- Advantaged attack: +20% damage
- Same-element: -10% damage (resistance)
- Yellow Dragon (Earth/Center): neutral to all, no weakness, no advantage

**Spirit Beast NFT (Soulbound)**:
- Each Blade has a Spirit Beast alignment (determines element)
- Separate Spirit Avatar NFT earned through milestones (soulbound, no `store`)
- Spirit Avatar grants once-per-match ultimate ability
- E.g., "Dragon's Fury" (Seiryu): ignore recoil for 2 turns
- E.g., "Phoenix Rebirth" (Suzaku): survive one Burst with 1 spin remaining
- E.g., "Tiger's Claw" (Byakko): double recoil reflect for 1 turn
- E.g., "Tortoise Shell" (Genbu): nullify next Xtreme Dash damage
- E.g., "Emperor's Decree" (Koryu): force opponent to change zone

### 1.3 Battle System (Physics-Based)

**Match Format**: 3on3 Deck (faithful to Beyblade X competitive)
- Bring 3 assembled Beyblades
- **No duplicate parts** across your deck (same as WBBA rules)
- Each round: both players secretly pick 1 of their remaining Beyblades
- First to **7 points** wins the match

**Scoring** (mirrors Beyblade X):

| Finish Type | Points | Trigger |
|-------------|--------|---------|
| **Spin Finish** | 1 | Opponent's Angular Momentum (AM) reaches 0 first |
| **Over Finish** | 2 | Opponent knocked outside stadium boundary |
| **Burst Finish** | 2 | Opponent's Burst Integrity reaches 0 (top disassembles) |
| **Xtreme Finish** | 3 | Opponent KO'd into Xtreme Zone via Xtreme Dash trajectory |

**Physics Stats per Beyblade** (computed from parts):

| Stat | Source | Physics Meaning |
|------|--------|-----------------|
| **Angular Momentum (AM)** | Ratchet Weight + Bit Stamina + Launch Power | L = I x omega -- total spin energy, depletes over time |
| **Moment of Inertia (I)** | Ratchet Prongs + Weight distribution | Resistance to spin decay -- rim-weighted = higher I |
| **Friction Coefficient** | Bit type | How fast AM decays: Needle = 0.02/turn, Flat = 0.08/turn |
| **Attack Power** | Blade ATK + AM x velocity | Damage dealt on collision |
| **Recoil** | Blade geometry + defender's weight | Self-damage from attacking (Newton's 3rd law) |
| **Burst Integrity (BI)** | Ratchet Burst Resistance | Hidden HP -- each hit reduces BI; at 0 = Burst |
| **Mobility** | Bit Friction + Blade weight | Movement range on stadium grid |
| **Gear Rating** | Bit Gear Diameter | Xtreme Dash speed/control (smaller = faster, less control) |

**Turn Structure** (6 phases):

```
Phase 1: SPIN DECAY
  Both tops lose AM = base_decay x friction x (1 + wobble_factor)
  If AM < 20%: enter "Death Spin" state (gyroscopic precession)
    -> Increased vulnerability, but enables "Life After Death" passive

Phase 2: MOVEMENT
  Each player commits a Zone action (commit-reveal):
  Center / Mid-Ring / Wall / Rail
  Bit type constrains available zones:
    Needle -> Center only
    Flat/Rush -> Any zone
    Ball -> Center or Mid-Ring

Phase 3: COLLISION RESOLUTION
  If both in same zone or adjacent: collision occurs
  Damage = ATK x (AM_attacker / AM_max) x type_advantage x element_bonus +/- 15% (sui::random)
  Recoil = damage x recoil_coefficient (attacker takes self-damage)
  Knockback: if damage > defender's Weight x 2 -> push 1 zone outward
  Over Finish: pushed beyond Wall zone = ring-out (2 pts)

Phase 4: SPIN STEAL CHECK
  If opposite spin directions (L vs R):
    10% of damage dealt transfers as AM from defender to attacker
  Same spin: no steal, but reduced contact friction (-15% damage)

Phase 5: XTREME DASH
  If Beyblade is on Rail zone AND has Gear Bit:
    -> Triggers Xtreme Dash: launch toward opponent at 2x velocity
    -> Damage multiplied by 1.5x
    -> If this KOs opponent: Xtreme Finish (3 points!)
    -> Risk: self-recoil increased by 2x
  Gear Rating determines dash accuracy:
    Small gear (4-6) = high speed, 70% accuracy
    Medium gear (8-10) = balanced, 85% accuracy
    Large gear (12) = reliable, 95% accuracy

Phase 6: BURST CHECK
  Each hit reduces Burst Integrity:
    BI_loss = impact_force - burst_resistance
  Lock Tightness (player pre-sets before round, 1-5):
    Higher = more burst resistant, BUT more stamina drain per impact
    Lower = less burst resistant, BUT preserves stamina on hits
  If BI <= 0: BURST FINISH (2 points)
  Attacker's own BI also decreases from recoil!

WIN CHECK (after each turn):
  Priority: Xtreme Finish > Burst > Over > Spin
  If AM_a = 0 AND AM_b = 0 simultaneously: draw (no points)
```

**Death Spin / Life After Death**:
- When AM < 20%: Beyblade enters precession state
- Wobble factor increases each turn (1.2x, 1.5x, 2.0x...)
- "Life After Death" passive (Bits: Ball, Orb, Free Ball) allows scoring Spin Finish while wobbling
- Creates dramatic end-game tension: both tops wobbling, who falls first?

### 1.4 Technique Cards (Off-chain, Non-NFT)

| Category | Cards | Effect |
|----------|-------|--------|
| **Launch** (max 2) | Power Launch, Angle Launch, Banking Shot | Set initial AM modifier (+10-30%), determine starting zone |
| **Attack** | Upper Smash, Side Crash, Barrage | Extra damage, push opponent, multi-hit |
| **Defense** | Counter Stance, Anchor, Absorb | Reduce damage, negate knockback, partial spin steal |
| **Xtreme** (max 2) | Dash Strike, Rail Ride, X-Celerator | Force Xtreme Dash, +accuracy, double dash damage |
| **Spirit** (max 1) | Spirit Awakening | Activate Spirit Beast ultimate (once per match) |

**Deck**: 12 Technique cards (shared across match)
- Max 2 Launch, max 2 Xtreme, max 1 Spirit
- Draw 3 per turn, hand limit 5

### 1.5 Stadium NFTs

| Stadium Type | Rail Pattern | Effect |
|-------------|-------------|--------|
| **Standard X** | X-shaped cross | 4 rail zones, balanced |
| **Infinity Loop** | Circular continuous rail | More Xtreme Dash opportunities |
| **Dragon's Maw** | Single diagonal rail | High-risk single corridor |
| **Fortress** | No rails, deep bowl | Stamina meta, no Xtreme Finish possible |
| **Seasonal** (limited) | Unique patterns | Element terrain bonus |

Stadium owner earns 2% of $SPARK wagered in matches using their stadium.

### 1.6 Token Economy

| Token | Standard | Purpose |
|-------|----------|---------|
| **$SPARK** | `Coin<SPARK>` | Play currency -- rewards, forge, packs |
| **$FORGE** | `Coin<FORGE>` | Governance -- tournaments, ban votes |

| Source | Amount | Sink | Cost |
|--------|--------|------|------|
| Match win (casual) | 5-15 SPARK | Pack (5 parts) | 100 SPARK |
| Match win (ranked) | 15-40 SPARK | Evolution (3 Common -> 1 Rare) | 50 SPARK + burn 3 |
| Daily missions | 20 SPARK | Fusion (2 Rare -> 1 Epic) | 200 SPARK + burn 2 |
| Tournament | 10 SPARK/match | Gear Re-tune (reroll 1 stat) | 75 SPARK |
| Season pass | variable | Stadium Forge | 500 SPARK + materials |

### 1.7 Progression

| Rank | XP | Unlock | Spirit Milestone |
|------|-----|--------|-----------------|
| **Rookie** | 0 | Tutorial, starter deck | --- |
| **Bronze** | 300 | Ranked, basic forge | Common Spirit Avatar |
| **Silver** | 1000 | Evolution, deck building | Rare Spirit Avatar |
| **Gold** | 3000 | Fusion, tournaments | Epic Spirit Avatar |
| **Platinum** | 8000 | Legendary forge, custom stadiums | Legendary Spirit Avatar |
| **Diamond** | 20000 | Governance voting | Yellow Dragon unlock |

---

## 2. Smart Contract Architecture (Sui Move)

### Module Structure

```
spinforge/
  sources/
    blade.move            # Blade NFT
    ratchet.move          # Ratchet NFT
    bit.move              # Bit NFT
    bey.move              # Composable Beyblade
    deck.move             # 3on3 Deck validation
    physics.move          # AM calc, damage, type matrix, Wuxing wheel
    battle.move           # Match + Round, commit-reveal
    xtreme_dash.move      # Gear x rail interaction
    stadium.move          # Stadium NFT with rail patterns
    spirit.move           # Soulbound Spirit Avatar
    forge.move            # Evolution, Fusion, Re-tune
    tournament.move       # Bracket tournament
    marketplace.move      # Kiosk + TransferPolicy
    spark_token.move      # Coin<SPARK>
    forge_token.move      # Coin<FORGE>
    pack.move             # Pack opening with sui::random
    admin.move            # Ban-list, physics constants
  Move.toml
```

### Key Data Structures

```move
// blade.move
struct Blade has key, store {
    id: UID,
    name: String,             // "Wizard Rod", "Phoenix Wing", etc.
    spirit_beast: u8,         // 0=Seiryu, 1=Suzaku, 2=Byakko, 3=Genbu, 4=Koryu
    element: u8,              // derived: 0=Wood, 1=Fire, 2=Metal, 3=Water, 4=Earth
    bey_type: u8,             // 0=ATK, 1=DEF, 2=STA, 3=BAL
    spin_direction: u8,       // 0=Right, 1=Left
    attack: u16,              // 10-100
    recoil_factor: u16,       // 10-80 (lower = less self-damage)
    rarity: u8,
    xp: u32,
}

// ratchet.move
struct Ratchet has key, store {
    id: UID,
    prongs: u8,               // 0-9
    height: u8,               // 50, 55, 60, 70, 80, 85
    weight: u16,              // moment of inertia factor
    burst_resistance: u16,    // base burst integrity
    rarity: u8,
    xp: u32,
}

// bit.move
struct Bit has key, store {
    id: UID,
    name: String,             // "Rush", "Needle", "Gear Flat"
    category: u8,             // 0=Attack, 1=Defense, 2=Stamina, 3=Gear
    friction: u16,            // 2-80 (x0.001 decay rate)
    mobility: u16,            // 1-5 zones accessible
    gear_diameter: u8,        // 0=none, 4/6/8/10/12
    has_life_after_death: bool,
    rarity: u8,
    xp: u32,
}

// bey.move
struct Bey has key, store {
    id: UID,
    name: String,
    wins: u32,
    losses: u32,
    xtreme_finishes: u32,
    burst_finishes: u32,
    // dynamic_object_field: "blade", "ratchet", "bit"
}

public fun assemble(
    blade: Blade, ratchet: Ratchet, bit: Bit,
    name: String, ctx: &mut TxContext
): Bey {
    let mut bey = Bey {
        id: object::new(ctx), name,
        wins: 0, losses: 0, xtreme_finishes: 0, burst_finishes: 0
    };
    dof::add(&mut bey.id, b"blade", blade);
    dof::add(&mut bey.id, b"ratchet", ratchet);
    dof::add(&mut bey.id, b"bit", bit);
    bey
}

public fun disassemble(bey: Bey): (Blade, Ratchet, Bit) {
    let Bey { mut id, .. } = bey;
    let blade: Blade = dof::remove(&mut id, b"blade");
    let ratchet: Ratchet = dof::remove(&mut id, b"ratchet");
    let bit: Bit = dof::remove(&mut id, b"bit");
    object::delete(id);
    (blade, ratchet, bit)
}

// physics.move
public fun compute_angular_momentum(
    ratchet: &Ratchet, bit: &Bit, launch_power: u16
): u64 {
    let inertia = (ratchet.weight as u64) * prong_multiplier(ratchet.prongs);
    let efficiency = 100 - (bit.friction as u64);
    inertia * efficiency * (launch_power as u64) / 10000
}

public fun compute_damage(
    atk_blade: &Blade, atk_am: u64,
    def_blade: &Blade,
    type_bonus: u16, element_bonus: u16,
    random_variance: u16,  // 85-115
): (u64, u64) {
    let raw = (atk_blade.attack as u64) * atk_am / 1000;
    let dmg = raw * (type_bonus as u64) * (element_bonus as u64)
              * (random_variance as u64) / 1_000_000;
    let recoil = dmg * (atk_blade.recoil_factor as u64) / 100;
    (dmg, recoil)
}

public fun compute_spin_steal(
    atk_blade: &Blade, def_blade: &Blade, damage: u64
): u64 {
    if (atk_blade.spin_direction != def_blade.spin_direction) {
        damage / 10  // 10% AM transfer on opposite spin
    } else { 0 }
}

// Type advantage: ATK>STA +30%, STA>DEF +20%, DEF>ATK +40% recoil reflect
// BAL: +10% to all, -10% from all
// Wuxing: Wood>Earth>Water>Fire>Metal>Wood, +20% / same-element -10%

// battle.move
struct Match has key {
    id: UID,
    player_a: address,
    player_b: address,
    score_a: u8,
    score_b: u8,
    stadium_id: ID,
    rounds_played: u8,
    current_round: Option<ID>,
    deck_a: vector<ID>,
    deck_b: vector<ID>,
    used_a: vector<bool>,
    used_b: vector<bool>,
    state: u8,  // 0=BeySelect, 1=InRound, 2=Complete
}

struct Round has key {
    id: UID,
    match_id: ID,
    bey_a_id: ID,
    bey_b_id: ID,
    am_a: u64,
    am_b: u64,
    burst_integrity_a: u64,
    burst_integrity_b: u64,
    zone_a: u8,  // 0=Center, 1=Mid, 2=Wall, 3=Rail
    zone_b: u8,
    lock_tightness_a: u8,  // 1-5
    lock_tightness_b: u8,
    turn: u8,
    wobble_a: u8,  // 0=stable, 1+=death spin multiplier
    wobble_b: u8,
    commit_a: Option<vector<u8>>,
    commit_b: Option<vector<u8>>,
    state: u8,
    deadline: u64,
}

// xtreme_dash.move
public fun can_dash(bit: &Bit, zone: u8, stadium: &Stadium): bool {
    bit.gear_diameter > 0 && vector::contains(&stadium.rail_zones, &zone)
}

entry fun compute_dash(
    bit: &Bit, atk_am: u64, r: &Random, ctx: &mut TxContext
): (u64, bool) {
    let mut gen = random::new_generator(r, ctx);
    let roll = random::generate_u8_in_range(&mut gen, 1, 100);
    let threshold = if (bit.gear_diameter <= 6) { 70 }
                    else if (bit.gear_diameter <= 10) { 85 }
                    else { 95 };
    let hit = roll <= threshold;
    let multiplier = if (hit) { 150 } else { 50 };
    (atk_am * multiplier / 100, hit)
}

// stadium.move
struct Stadium has key, store {
    id: UID,
    name: String,
    rail_pattern: u8,
    rail_zones: vector<u8>,
    element_terrain: u8,
    depth: u8,
    rarity: u8,
    owner_fee_bps: u16,  // max 200 = 2%
}

// spirit.move (soulbound: key only, no store)
struct SpiritAvatar has key {
    id: UID,
    beast: u8,
    tier: u8,
    ultimate_ability: u8,
    activated_count: u32,
}
```

### On-chain vs Off-chain

| On-chain | Off-chain |
|----------|-----------|
| Part NFTs, composition, deck validation | Matchmaking, ELO |
| Battle resolution (commit-reveal) | Animations, sound |
| Xtreme Dash RNG | Leaderboards (indexed) |
| Burst check, scoring | Technique card inventory |
| Tokens, staking | Chat, social |
| Tournament brackets, prizes | Replay storage |
| Stadium fees | Tutorial AI |
| Spirit soulbound mint | Profile aggregation |

---

## 3. Frontend Architecture

### Tech Stack

| Layer | Choice |
|-------|--------|
| **Framework** | React 18 + Next.js 14 (App Router) |
| **Game Rendering** | PixiJS 7 (2D WebGL) |
| **Sui SDK** | `@mysten/dapp-kit` + `@mysten/sui` v1 |
| **Wallet** | dapp-kit ConnectButton + zkLogin |
| **State** | Zustand + TanStack Query |
| **Styling** | Tailwind CSS + Framer Motion |

### Screens

| Route | Purpose |
|-------|---------|
| `/` | Dashboard |
| `/collection` | Blade/Ratchet/Bit inventory with element/type filters |
| `/workshop` | Assemble Beys with live physics stat preview |
| `/deck` | Build 3on3 deck (3 Beys + 12 Techniques + 1 Stadium) |
| `/battle/[id]` | PixiJS arena with Xtreme rails, zone selector, physics HUD |
| `/market` | Kiosk marketplace |
| `/tournament` | 3on3 bracket tournament |
| `/profile/[addr]` | Stats, Spirit Beast collection |
| `/packs` | Pack opening with Spirit Beast reveal |
| `/forge` | Evolution / Fusion / Re-tune |

### Battle UI Layout

```
+-------------------------------------------+
|  SCORE: Player A [3] vs [2] Player B      |
|                                           |
|  +-------------------------------------+ |
|  |         STADIUM VIEW (PixiJS)       | |
|  |     X-rail lines glowing            | |
|  |     Spinning tops with trail FX     | |
|  |     Zone indicators                 | |
|  +-------------------------------------+ |
|                                           |
|  AM: ########-- 73%  |  BI: ###### 89%   |
|                                           |
|  [Attack] [Defense] [Xtreme!] [Spirit]    |
|  Zone: [Center] [Mid] [Wall] [Rail]       |
+-------------------------------------------+
```

---

## 4. Backend Architecture

- **Server**: Rust (axum) + WebSocket
- **Database**: PostgreSQL (matches, ELO, history)
- **Cache**: Redis (matchmaking queue, leaderboard)
- **Indexer**: Sui events -> PostgreSQL

### Key Events
- `MatchCompleted`, `RoundResolved`, `XtremeDashTriggered`
- `BurstTriggered`, `SpinStealOccurred`
- `PartForged`, `SpiritAvatarMinted`

---

## 5. Onboarding

```
New Player -> Google/Apple OAuth (zkLogin)
  -> Sponsored tx mints starter deck:
     3 Blades (Seiryu/Suzaku/Byakko)
     3 Ratchets (3-60, 5-70, 1-80)
     3 Bits (Rush, Ball, Needle)
     12 Technique cards + 1 Standard X Stadium
     50 $SPARK
  -> Auto-assemble 3 Beyblades (ATK/DEF/STA)
  -> Tutorial (physics, Lock Tightness, Xtreme Dash)
  -> AI battle -> Ready for PvP
```

---

## 6. Implementation Phases

### Phase 1: Core Parts + Assembly (Weeks 1-3)
- [ ] blade.move, ratchet.move, bit.move, bey.move
- [ ] physics.move (AM calc, damage, type matrix, Wuxing)
- [ ] deck.move (3on3 no-dupe validation)
- [ ] spark_token.move, forge_token.move, pack.move
- [ ] Unit tests >80%
- [ ] Testnet deploy

### Phase 2: Battle System (Weeks 4-7)
- [ ] battle.move (Match + Round, commit-reveal)
- [ ] xtreme_dash.move (gear x rail, accuracy RNG)
- [ ] Spin steal, Burst integrity, Lock Tightness
- [ ] Death Spin / Life After Death
- [ ] stadium.move, spirit.move
- [ ] 200+ battle simulation tests

### Phase 3: Economy + Forge (Weeks 8-9)
- [ ] forge.move (Evolution, Fusion, Re-tune)
- [ ] tournament.move, marketplace.move, admin.move
- [ ] Economic simulation

### Phase 4: Backend (Weeks 8-10, parallel)
- [ ] Rust axum + PostgreSQL + Redis
- [ ] WebSocket battle relay
- [ ] Sui event indexer
- [ ] Load test 1000 concurrent matches

### Phase 5: Frontend (Weeks 9-14, parallel)
- [ ] Next.js + dapp-kit + zkLogin
- [ ] Workshop, Deck Builder, Battle Arena
- [ ] PixiJS: Xtreme Dash FX, Death Spin, Burst explosion
- [ ] Marketplace, Packs, Forge
- [ ] Mobile responsive

### Phase 6: Polish + Launch (Weeks 15-18)
- [ ] Tutorial, sound, tournament UI
- [ ] Security audit
- [ ] Mainnet deploy
- [ ] Beta -> Public launch

---

## 7. Project Structure

```
spinforge/
  contracts/
    sources/
      blade.move, ratchet.move, bit.move, bey.move
      deck.move, physics.move
      battle.move, xtreme_dash.move
      stadium.move, spirit.move
      forge.move, tournament.move, marketplace.move
      spark_token.move, forge_token.move, pack.move, admin.move
    tests/
      parts_tests.move, physics_tests.move
      battle_tests.move, xtreme_tests.move
      deck_tests.move, forge_tests.move, tournament_tests.move
    Move.toml

  server/
    src/
      main.rs
      routes/ (matchmaking, battle_relay, leaderboard, tournament, player)
      indexer/ (event_listener, processors)
      db/ (schema, queries)
      ws/ (handler, rooms)
    Cargo.toml

  web/
    app/ (layout, page, collection, workshop, deck, battle, market, tournament, profile, packs, forge)
    components/
      battle/ (StadiumCanvas, SpinningTop, XtremeDashFX, BurstExplosion, DeathSpinWobble, SpiritBeastHolo, TechniqueHand, ZoneSelector, ScoreBar, PhysicsHUD)
      workshop/ (PartSlot, AssemblyPreview, StatsPanel)
      deck/ (DeckBuilder, DuplicateWarning)
      collection/ (PartGrid, PartCard)
      market/ (ListingCard, BuyModal)
      shared/ (WalletButton, Navbar, BottomTabs, SpiritBeastIcon)
    hooks/ (useBattle, useInventory, useForge, useMarketplace, useDeck, usePhysicsCalc)
    lib/ (sui-client, move-calls, physics-sim, constants)
```

---

## 8. Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Physics imbalance (one type dominates) | Tunable constants in admin.move, quarterly governance |
| Xtreme Dash too powerful | 70% accuracy for small gear, 2x self-recoil |
| Spin steal breaks stamina meta | Cap at 10%, diminishing returns |
| Lock Tightness has dominant strategy | Interact with opponent type (ATK benefits low, DEF benefits high) |
| Commit-reveal latency | Optimistic UI + sponsored tx + 10s deadline |
| 3on3 too complex for new players | Pre-built starter deck + guided tutorial |
| Left-spin rarity distortion | Equal rarity distribution L/R |

---

## 9. Blockchain x Beyblade Authenticity

1. **Physics-on-Chain**: AM, burst integrity, Xtreme Dash accuracy all computed on-chain
2. **Ratchet Naming = NFT Identity**: "3-60 Gear Flat" reads like real Beyblade X combos
3. **Xtreme Finish as Blockchain Event**: Most exciting moment = permanent on-chain record
4. **Spin Direction Market Dynamics**: L-spin scarcity creates organic market cycles
5. **Lock Tightness = Signed On-chain Decision**: Irreversible risk/reward commitment
6. **Spirit Beast Provenance**: Yellow Dragon only at Diamond rank = soulbound proof-of-skill
7. **Stadium Economy**: Stadium owners earn passive fees from battles
8. **Death Spin Drama**: Physics-driven uncertainty creates viral clip moments

---

## Task Type
- [x] Frontend (React + Next.js + PixiJS)
- [x] Backend (Rust + PostgreSQL + Redis)
- [x] Smart Contracts (Sui Move -- 17 modules)
- [x] Fullstack
