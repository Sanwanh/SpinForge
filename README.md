# SpinForge

Beyblade X-authentic blockchain card game built on **Sui Move**.

## Overview

SpinForge brings competitive Beyblade to the blockchain with physics-based 3on3 battles, composable NFT parts (Blade/Ratchet/Bit), a Wuxing elemental system, Xtreme Dash mechanics, and an on-chain tournament economy.

## Architecture

| Layer | Technology |
|-------|-----------|
| **Smart Contracts** | Sui Move (17 modules) |
| **Frontend** | Next.js 14, React 18, PixiJS 7, Tailwind CSS |
| **Backend** | Rust (axum), PostgreSQL, Redis |
| **Wallet** | @mysten/dapp-kit + zkLogin |

## Project Structure

```
spinforge/
  contracts/          # Sui Move smart contracts
    sources/          # 17 Move modules
    tests/            # Move test suite
    Move.toml
  server/             # Rust backend (axum + WebSocket)
    src/
      routes/         # REST API endpoints
      indexer/        # Sui event listener
      db/             # PostgreSQL schema & queries
      ws/             # WebSocket battle relay
    Cargo.toml
  web/                # Next.js 14 frontend
    app/              # App Router pages
    components/       # React components
    hooks/            # Custom hooks
    lib/              # Utilities & SDK clients
```

## Game Mechanics

- **Parts System**: Blade (attack ring) + Ratchet (height/stability) + Bit (movement tip) = Beyblade NFT
- **Battle**: 3on3 deck format, first to 7 points wins
- **Scoring**: Spin Finish (1pt), Over Finish (2pt), Burst Finish (2pt), Xtreme Finish (3pt)
- **Elements**: Wuxing cycle (Wood > Earth > Water > Fire > Metal > Wood)
- **Spirit Beasts**: Azure Dragon, Vermilion Bird, White Tiger, Black Tortoise, Yellow Dragon

## Development

```bash
# Smart Contracts
cd contracts && sui move build && sui move test

# Frontend
cd web && pnpm install && pnpm dev

# Backend
cd server && cargo run
```

## License

MIT
