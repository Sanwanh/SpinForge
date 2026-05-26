# SpinForge - Implementation Plan

## Project Name: **SpinForge**

> Beyblade-inspired blockchain card game on Sui Move.
> "Spin" = spinning tops, "Forge" = crafting + on-chain forging.

---

## 1. Game Design Summary

### Core Loop
```
Collect Parts (NFT) -> Forge Beyblade -> Build Deck -> Battle -> Earn Rewards -> Forge Better Parts
```

### Card Categories

| Category | Type | Tradeable | Purpose |
|----------|------|-----------|---------|
| **Layer** (NFT) | Core Part | Yes | Attack ring, determines Type (ATK/DEF/STA/BAL) + Element |
| **Disk** (NFT) | Core Part | Yes | Weight core, HP 20-60, Weight 1-5 |
| **Driver** (NFT) | Core Part | Yes | Tip, Stamina 8-14, Mobility 1-5, decay pattern |
| **Stadium** (NFT) | Battlefield | Yes | 5x5 hex grid with terrain effects |
| **Spirit** (NFT) | Soulbound | No | Once-per-game ability, earned via milestones |
| **Technique** | Fungible | No | Action cards (Launch/Attack/Defense/Shift), off-chain |

### Beyblade Assembly
1 Layer + 1 Disk + 1 Driver = 1 Beyblade (via `dynamic_object_field` composition on-chain)

### Battle System
- **Turn-based, simultaneous reveal** (commit-reveal on-chain)
- 5 phases per turn: Spin Decay -> Draw -> Action (secret select) -> Resolution -> Burst Check
- 3 win conditions: Burst Finish (3pts), Over Finish (2pts), Spin Finish (1pt)
- Match = first to 4+ points (best-of-3 rounds)
- Type advantage: ATK > STA > DEF > ATK, BAL = no hard counter

### Element System
5 elements: Fire > Wind > Earth > Lightning > Water > Fire (cycle)
- Attacker advantage = +2 damage
- Same-element resistance = -1 damage
- Stadium terrain amplifies matching element

### Token Economy

| Token | Standard | Purpose |
|-------|----------|---------|
| **$SPARK** | `Coin<SPARK>` | Play currency - match rewards, crafting costs, entry fees |
| **$FORGE** | `Coin<FORGE>` | Governance - tournament prizes, ban-list votes, prestige |

**Sinks**: Evolution (50 SPARK + 3 cards), Fusion (200 SPARK + 2 cards), Re-roll (100 SPARK), Stadium craft (500 SPARK)
**Sources**: Match win (10-30 SPARK), Daily quest (20 SPARK), Tournament participation
**Target**: Net SPARK supply growth <= 2%/week

### Progression
Bronze (0 XP) -> Silver (500) -> Gold (2000) -> Platinum (5000) -> Diamond (12000)
Unlocks: Rare forge, Evolution, Fusion, Legendary forge access

---

## 2. Smart Contract Architecture (Sui Move)

### Module Structure

```
spinforge/
  sources/
    parts.move          # Part NFT (Layer/Disk/Driver) with stats
    beyblade.move       # Composable Beyblade via dynamic_object_field
    battle.move         # Commit-reveal battle logic
    forge.move          # Evolution, Fusion, crafting mechanics
    tournament.move     # Bracket tournament with prize pools
    marketplace.move    # TransferPolicy + Kiosk integration
    spark_token.move    # Coin<SPARK> fungible token
    forge_token.move    # Coin<FORGE> governance token
    pack.move           # Card pack opening with sui::random
    spirit.move         # Soulbound Spirit NFT (no `store` ability)
    admin.move          # AdminCap, ban-list, parameter tuning
  Move.toml
```

### Key Data Structures

```move
// parts.move
struct Part has key, store {
    id: UID,
    kind: u8,            // 0=Layer, 1=Disk, 2=Driver
    element: u8,         // 0=Fire, 1=Water, 2=Earth, 3=Wind, 4=Lightning
    bey_type: u8,        // 0=ATK, 1=DEF, 2=STA, 3=BAL (Layer only)
    attack: u16,
    defense: u16,
    stamina: u16,
    weight: u16,
    mobility: u16,
    burst_threshold: u16,
    special_ability: u8,
    rarity: u8,          // 0=Common, 1=Rare, 2=Epic, 3=Legendary
    level: u8,
    xp: u32,
}

// beyblade.move - Parts attached as dynamic_object_field
struct Beyblade has key, store {
    id: UID,
    name: String,
    wins: u32,
    losses: u32,
    // dynamic_object_field keys: "layer", "disk", "driver"
}

public fun attach_part(bey: &mut Beyblade, part: Part, slot: String) {
    assert!(!dof::exists_(&bey.id, slot), ESlotOccupied);
    dof::add(&mut bey.id, slot, part);
}

public fun detach_part(bey: &mut Beyblade, slot: String): Part {
    dof::remove(&mut bey.id, slot)
}

// battle.move - Commit-reveal pattern
struct Battle has key {
    id: UID,
    player_a: address,
    player_b: address,
    bey_a_id: ID,
    bey_b_id: ID,
    commit_a: Option<vector<u8>>,   // blake2b(move || salt)
    commit_b: Option<vector<u8>>,
    reveal_a: Option<u8>,
    reveal_b: Option<u8>,
    round: u8,
    hp_a: u16,
    hp_b: u16,
    spin_a: u16,
    spin_b: u16,
    damage_acc_a: u16,              // accumulated for Burst check
    damage_acc_b: u16,
    grid_pos_a: u8,                 // position on 5x5 grid
    grid_pos_b: u8,
    state: u8,                      // 0=Commit, 1=Reveal, 2=Resolved
    deadline: u64,                  // epoch ms, auto-forfeit
    score_a: u8,
    score_b: u8,
}

entry fun commit(battle: &mut Battle, hash: vector<u8>, clock: &Clock) {
    // Verify sender is player_a or player_b
    // Store hash in commit_a or commit_b
    // If both committed, transition state to Reveal
}

entry fun reveal(
    battle: &mut Battle,
    card_move: u8,
    salt: vector<u8>,
    r: &Random,
    ctx: &mut TxContext
) {
    // Verify blake2b(card_move || salt) matches commit
    // If both revealed: resolve round
    //   - Apply type advantage matrix
    //   - Apply element bonuses
    //   - sui::random for damage variance (+/-15%)
    //   - Update HP, spin, positions
    //   - Check win conditions (Burst > Over > Spin)
    //   - Emit BattleRoundResolved event
}

// tournament.move
struct Tournament has key {
    id: UID,
    entry_fee: u64,
    prize_pool: Balance<SPARK>,
    forge_pool: Balance<FORGE>,
    participants: vector<address>,
    bracket: vector<Option<ID>>,
    max_players: u16,
    state: u8,  // 0=Registration, 1=InProgress, 2=Complete
}

// forge.move
public fun evolve(
    base: Part,
    sacrifice1: Part,
    sacrifice2: Part,
    payment: Coin<SPARK>,
    r: &Random,
    ctx: &mut TxContext
): Part {
    // Verify: all 3 same kind, same name, all Common
    // Burn sacrifice1, sacrifice2, 50 SPARK
    // Reroll stats within Rare range using sui::random
    // Return new Rare Part
}

// spirit.move - No `store` ability = soulbound
struct Spirit has key {
    id: UID,
    name: String,
    ability: u8,
    rank_required: u8,
}
```

### On-chain vs Off-chain Split

| On-chain (Trust-critical) | Off-chain (Latency-sensitive) |
|---------------------------|-------------------------------|
| NFT ownership & transfers | Matchmaking & ELO ranking |
| Battle outcomes (commit-reveal) | Battle animations |
| Token balances & staking | Leaderboards (indexed from events) |
| Pack opening RNG (`sui::random`) | Chat & social |
| Tournament brackets & prizes | Technique card inventory |
| Forge/Evolution/Fusion burns | Player profile aggregation |

### Randomness
- `sui::random` (native, address `0x8`) for all RNG
- Pack openings: `random::generate_u64_in_range` for rarity + stat rolls
- Battle: +/-15% damage variance during reveal phase
- All RNG functions = `entry` only (prevent composition attacks)

### Security
- **Anti-cheat**: All battle resolution on-chain, stats from NFT objects
- **Front-running**: Commit-reveal with `blake2b(move || 32-byte-salt)`
- **Deadline forfeit**: Miss reveal deadline = auto-lose (anti-grief)
- **Replay prevention**: Unique Battle UID per match
- **Soulbound**: Spirit = `key` only, no `store`

---

## 3. Frontend Architecture

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | React 18 + Next.js 14 (App Router) | SSR for marketplace SEO, dapp-kit is React-only |
| **Game Rendering** | PixiJS 7 (2D WebGL) | 45KB, 60fps, GPU particles for collisions |
| **Sui SDK** | `@mysten/dapp-kit` + `@mysten/sui` v1 | Wallet hooks, GraphQL, tx building |
| **Wallet** | dapp-kit ConnectButton + zkLogin | Google/Apple OAuth, zero seed phrase |
| **State** | Zustand (client) + TanStack Query (chain) | Stale-while-revalidate for on-chain data |
| **Styling** | Tailwind CSS + Framer Motion | Mobile-first, card animations |
| **Deploy** | Vercel (frontend) + Cloudflare R2 (assets) | Edge-cached |

### Screen Architecture

| Route | Purpose |
|-------|---------|
| `/` | Dashboard - recent battles, quests, featured drops |
| `/collection` | NFT inventory grid with filter/sort |
| `/forge` | Drag-and-drop Beyblade assembly (Layer + Disk + Driver) |
| `/battle/[id]` | PixiJS arena (top 60%) + card hand (bottom 40%) |
| `/market` | Kiosk marketplace: buy/sell/auction |
| `/tournament` | Bracket view, registration, live results |
| `/profile/[addr]` | Stats, battle history, trophy NFTs |
| `/packs` | Pack opening with dramatic reveal animation |

### Battle UI/UX Flow
1. **Matchmaking**: WebSocket pairs by ELO -> sponsored tx creates Battle object
2. **Card hand**: Horizontal scroll strip (bottom 40%), tap to select, swipe up to play
3. **Arena**: PixiJS canvas (top 60%), tops on 5x5 grid, particle collision effects
4. **Commit**: Select Technique card -> sign `battle::commit` (optimistic UI)
5. **Reveal**: Both committed -> sign `battle::reveal` -> play collision animation
6. **Result**: Win condition check, score update, next round or match end

### Blockchain UX Patterns

| Action | Pattern |
|--------|---------|
| Forge Beyblade | Optimistic: show assembled immediately, revert on tx failure |
| Play battle card | Optimistic with 2s grace, rollback if rejected |
| Buy from market | Blocking modal with tx digest link |
| Open pack | Dramatic reveal synced to on-chain result |
| First login | zkLogin (Google) -> sponsored starter pack mint -> tutorial |

### Mobile-First
- Breakpoints: 375px / 768px / 1280px
- Bottom tab bar (mobile), side rail (desktop)
- PixiJS auto-resize via `ResizeObserver`
- `scroll-snap-type: x mandatory` for card hand

---

## 4. Backend Architecture

### Stack
- **Server**: Rust (axum) - high perf WebSocket
- **Database**: PostgreSQL - profiles, ELO, match history
- **Cache**: Redis - matchmaking queue, leaderboard
- **Indexer**: Sui event subscription -> PostgreSQL

### Topology

```
Client <--WebSocket--> Gateway (axum)
                          |
          +---------------+---------------+
     Matchmaker      Battle Relay      Indexer
     (Redis queue)   (WS rooms)       (Sui events -> PG)
          |               |                |
          +---------------+---------------+
                          |
                     PostgreSQL
```

### API

**WebSocket**:
- `ws /battle/queue` - matchmaking by ELO bracket
- `ws /battle/{id}/stream` - relay commits/reveals, push updates

**REST**:
- `GET /leaderboard?season=current` - Redis cached
- `GET /player/{addr}/history` - from PostgreSQL
- `GET /player/{addr}/stats` - win/loss/rank
- `GET /tournament/active` - current tournaments
- `POST /tournament/register` - validate + return tx bytes

### Indexed Events
- `BattleResolved { winner, loser, finish_type, round_count }`
- `PartMinted { player, part_id, rarity, kind }`
- `BeybladeForged { player, bey_id, layer_id, disk_id, driver_id }`
- `TournamentCompleted { tournament_id, winner, prize }`
- `EvolutionCompleted { player, old_ids, new_id }`

---

## 5. Onboarding Flow

```
New Player -> Google/Apple OAuth (zkLogin)
          -> Sui address derived (invisible)
          -> Sponsored tx mints starter pack:
             - 1 Common Layer (random element)
             - 1 Common Disk
             - 1 Common Driver
             - 100 $SPARK
          -> Auto-assemble first Beyblade
          -> Tutorial battle (vs AI)
          -> Ready to PvP
```

Zero friction: no wallet, no seed phrase, no gas (Enoki Gas Pool for first 50 tx).

---

## 6. Implementation Phases

### Phase 1: Core Contracts (Weeks 1-3)
- [ ] `sui move new spinforge`
- [ ] `parts.move` - Part NFT struct, mint, transfer
- [ ] `beyblade.move` - Compose/decompose via dynamic_object_field
- [ ] `spark_token.move` + `forge_token.move`
- [ ] `pack.move` - Pack opening with `sui::random`
- [ ] Unit tests (>80% coverage)
- [ ] Deploy to Sui Testnet

### Phase 2: Battle System (Weeks 4-6)
- [ ] `battle.move` - Commit-reveal, 3 win conditions
- [ ] Type advantage matrix
- [ ] Element bonus calculation
- [ ] Stadium terrain effects
- [ ] `spirit.move` - Soulbound abilities
- [ ] Battle simulation tests (100+ scenarios)

### Phase 3: Economy & Forge (Weeks 7-8)
- [ ] `forge.move` - Evolution, Fusion, re-roll
- [ ] `tournament.move` - Brackets, prizes
- [ ] `marketplace.move` - Kiosk + TransferPolicy royalties
- [ ] `admin.move` - AdminCap, ban-list, tuning
- [ ] Economic simulation

### Phase 4: Backend Server (Weeks 7-9, parallel)
- [ ] Rust axum scaffold
- [ ] PostgreSQL schema
- [ ] Redis matchmaking
- [ ] WebSocket battle relay
- [ ] Sui event indexer
- [ ] REST API
- [ ] Load test (1000 concurrent battles)

### Phase 5: Frontend MVP (Weeks 8-12, parallel)
- [ ] Next.js 14 + dapp-kit
- [ ] zkLogin + ConnectButton
- [ ] `/collection`, `/forge`, `/battle`, `/market`, `/packs`
- [ ] PixiJS battle arena
- [ ] Mobile responsive
- [ ] Sponsored transactions

### Phase 6: Polish & Launch (Weeks 13-16)
- [ ] Tutorial system
- [ ] Sound & music
- [ ] Tournament UI
- [ ] Leaderboard & profiles
- [ ] Smart contract security audit
- [ ] Mainnet deploy
- [ ] Beta (100 players) -> Public launch

---

## 7. Project Structure

```
spinforge/
  contracts/                    # Sui Move
    sources/
      parts.move
      beyblade.move
      battle.move
      forge.move
      tournament.move
      marketplace.move
      spark_token.move
      forge_token.move
      pack.move
      spirit.move
      admin.move
    tests/
      parts_tests.move
      battle_tests.move
      forge_tests.move
      tournament_tests.move
    Move.toml

  server/                       # Rust backend
    src/
      main.rs
      routes/
        matchmaking.rs
        battle_relay.rs
        leaderboard.rs
        tournament.rs
        player.rs
      indexer/
        event_listener.rs
        processors.rs
      db/
        schema.rs
        queries.rs
      ws/
        handler.rs
        rooms.rs
    Cargo.toml

  web/                          # Next.js frontend
    app/
      layout.tsx
      page.tsx
      collection/page.tsx
      forge/page.tsx
      battle/[id]/page.tsx
      market/page.tsx
      tournament/page.tsx
      profile/[addr]/page.tsx
      packs/page.tsx
    components/
      battle/Arena.tsx
      battle/CardHand.tsx
      battle/BurstAnimation.tsx
      forge/PartSlot.tsx
      forge/AssemblyView.tsx
      market/ListingCard.tsx
      market/BuyModal.tsx
      shared/WalletButton.tsx
      shared/Navbar.tsx
      shared/BottomTabs.tsx
    hooks/
      useBattle.ts
      useInventory.ts
      useForge.ts
      useMarketplace.ts
    lib/
      sui-client.ts
      move-calls.ts
      constants.ts
    package.json
    next.config.js
    tailwind.config.ts
```

---

## 8. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Commit-reveal latency (2 tx/turn) | Slow battle UX | Optimistic UI + sponsored tx |
| Legendary power creep | Pay-to-win | Compress stat ranges, governance votes |
| $SPARK inflation | Economy collapse | Auto sink adjustment, 2%/week cap |
| `sui::random` manipulation | Unfair RNG | `entry` functions only |
| Front-running | Cheating | Commit-reveal + deadline forfeit |
| Mobile PixiJS perf | Bad UX | Sprite atlas, reduce particles on mobile |
| zkLogin outage | Login blocked | Multiple OAuth providers |
| Contract bugs | Fund loss | Audit + bug bounty before mainnet |

---

## 9. Blockchain-Native Unique Mechanics

1. **Battle Provenance**: Beyblade on-chain `wins/losses` create NFT history. Tournament-winning Beyblades are worth more than fresh mints.
2. **Cross-Game Composability**: Parts have `store` ability, other Sui games can recognize them.
3. **On-chain Governance Ban-List**: Community votes with $FORGE on banned combos.
4. **Soulbound Achievement**: Spirit cards = earned only, money can't buy the best abilities.
5. **Transparent Economy**: All supply/burn rates verifiable on-chain.
6. **Stadium Rental Income**: Stadium NFT owners earn fees when their arena is used in tournaments.

---

## Task Type
- [x] Frontend (React + Next.js + PixiJS)
- [x] Backend (Rust + PostgreSQL + Redis)
- [x] Smart Contracts (Sui Move)
- [x] Fullstack

## SESSION_ID
- CODEX_SESSION: N/A (analysis via Claude subagents)
- GEMINI_SESSION: N/A (analysis via Claude subagents)
