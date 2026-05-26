# SpinForge Tutorial System Design

## Overview

An interactive, step-by-step onboarding flow that takes a new player from zero knowledge to PvP-ready in under 10 minutes. Each step is gated — the player must complete the action before advancing. Skip option available after first completion (stored per account).

---

## Step 1: Welcome + Wallet Connection

**Goal**: Get the player authenticated and into the game.

- Display cinematic splash screen with SpinForge logo and tagline
- Offer two connection paths:
  - **zkLogin** (Google/Apple/Twitch) for Web2 players — no wallet install required
  - **Sui Wallet** (Sui Wallet, Suiet, Ethos) for Web3-native players
- On successful auth, create player profile object on-chain
- Tutorial narrator introduces themselves: "Welcome to the Stadium. Let's build your first Beyblade."

**UI Elements**: Full-screen modal, animated logo, wallet selector buttons, loading spinner during tx

---

## Step 2: Open Starter Pack (Free, Sponsored Transaction)

**Goal**: Give the player their first components at zero cost.

- System grants a free Starter Pack (minted via admin-sponsored transaction)
- Player taps "Open Pack" — animated pack-opening sequence plays
- Pack contains: 1 Blade, 1 Ratchet, 1 Bit (all Common rarity)
- Narrator explains: "Every Beyblade is made of three parts. You just got your first set."
- Gas fee is sponsored — player pays nothing

**UI Elements**: Pack card with glow animation, unboxing particle effects, component reveal cards with rarity border

---

## Step 3: View Collection — Blade, Ratchet, Bit

**Goal**: Teach the player what each component type does.

- Navigate to Collection screen showing the three new components
- Interactive tooltips on each component type:
  - **Blade**: The attack ring. Determines attack power, shape profile, and Xtreme Dash compatibility. "This is your weapon."
  - **Ratchet**: The disc. Controls weight distribution, angular momentum base, and stamina. "This is your engine."
  - **Bit**: The tip. Defines movement pattern, friction coefficient, and stadium interaction. "This is your footing."
- Each tooltip has a short animation showing the part in action
- Narrator: "Together, these three parts form a complete Beyblade. Let's assemble yours."

**UI Elements**: 3D component viewer (rotate/zoom), stat bars per component, type icon badges

---

## Step 4: Workshop — Assemble First Beyblade

**Goal**: Teach assembly mechanics through hands-on action.

- Navigate to Workshop screen
- Guided drag-and-drop: Blade slot, Ratchet slot, Bit slot
- Each slot highlights in sequence with a pulse animation
- On complete assembly, the Beyblade NFT is minted on-chain
- Show the assembled Beyblade with combined stats
- Narrator: "Your first Beyblade is ready. Let's understand what makes it spin."

**UI Elements**: Assembly workspace with 3 slots, drag-and-drop with snap feedback, assembled Beyblade 3D preview, mint transaction toast

---

## Step 5: Explain Physics Stats

**Goal**: Teach the three core physics concepts that govern battles.

- Display the assembled Beyblade's stat card
- Walk through each stat with interactive explanation:
  - **Angular Momentum (AM)**: "How fast your Beyblade spins. Higher AM means more energy to deal damage and survive hits. AM decreases every collision."
  - **Burst Integrity (BI)**: "How tightly your parts hold together. When BI hits zero, your Beyblade bursts apart — instant loss. Heavy hits reduce BI."
  - **Friction Coefficient**: "How your Bit grips the stadium. Low friction = faster movement, wider circles. High friction = tighter control, more stamina drain."
- Each stat has a mini-animation showing cause and effect
- Narrator: "These three numbers decide every battle. Now let's see them in action."

**UI Elements**: Stat card with animated gauges, cause-effect mini-simulations, comparison overlay (your stats vs average)

---

## Step 6: Practice Battle vs AI — Guided Through Each Phase

**Goal**: Experience a complete battle with phase-by-phase narration.

- Match the player against an AI opponent (Easy difficulty, predictable behavior)
- Battle proceeds through phases with pauses for explanation:
  - **Launch Phase**: "Both Beyblades enter the stadium. Your launch angle affects starting position."
  - **Collision Phase**: "Contact! AM determines damage dealt. Watch your opponent's spin slow down."
  - **Mid-Battle**: "Both Beyblades are losing energy. The one with better stamina management wins in a spin-out."
  - **Resolution**: If win — "Victory! You won by [Spin Finish/Burst Finish/Ring Out]." If loss — "That's okay. Let's look at what happened and try again."
- Allow replay of practice battle until the player wins at least once
- Narrator: "You've got the basics. But there's more to master..."

**UI Elements**: Battle arena with PixiJS rendering, phase indicator bar, narrator overlay with portrait, pause/resume controls, damage numbers floating text

---

## Step 7: Explain Xtreme Dash, Spirit Beasts, Lock Tightness

**Goal**: Introduce advanced mechanics that differentiate skilled play.

- Three sub-sections, each with a short interactive demo:
  - **Xtreme Dash**: "When your stamina drops below the threshold, you can trigger a last-resort burst of speed. High risk, high reward — it costs a chunk of remaining AM but can land a devastating hit."
    - Demo: replay a moment from the practice battle showing when Xtreme Dash would trigger
  - **Spirit Beasts**: "Rare Blades carry a Spirit Beast — a special ability that activates once per battle. Effects range from damage boosts to defensive shields. Collect different Blades to discover them."
    - Demo: show a Spirit Beast activation animation with stat effect overlay
  - **Lock Tightness**: "This hidden stat represents how securely your parts are assembled. Higher Lock Tightness means higher Burst Integrity. Upgrade it in the Workshop by reinforcing your Beyblade."
    - Demo: show the Lock Tightness meter and its relationship to BI
- Narrator: "Master these three mechanics and you'll dominate the stadium."

**UI Elements**: Tabbed sub-section viewer, replay clips from practice battle, animated mechanic diagrams, "Got it" confirmation button per section

---

## Step 8: Ready for PvP

**Goal**: Transition the player from tutorial to real gameplay.

- Summary screen showing:
  - Player's assembled Beyblade with full stats
  - Tutorial completion badge (minted as a soul-bound NFT)
  - Three suggested next actions:
    1. **Battle** — "Enter matchmaking and fight real players"
    2. **Workshop** — "Open more packs and build new Beyblades"
    3. **Tournament** — "Join a tournament for bigger rewards"
- Narrator: "The stadium is yours. Go show them what you've got."
- Mark tutorial as completed in player profile (on-chain flag)
- Unlock all game modes

**UI Elements**: Achievement card with confetti animation, Beyblade showcase with rotation, three CTA buttons with hover previews, "Skip Tutorial" toggle for future sessions

---

## Implementation Notes

- **State Persistence**: Tutorial progress stored on-chain in the player profile object. Resumable across sessions.
- **Gas Sponsorship**: Steps 2 and 4 involve on-chain transactions. Both are sponsored via the SpinForge relayer to ensure zero-cost onboarding.
- **Analytics Events**: Emit events at each step completion for funnel tracking. Target: >80% completion rate from Step 1 to Step 8.
- **Accessibility**: All narrator text has screen reader support. Animations respect `prefers-reduced-motion`. All interactive elements are keyboard-navigable.
- **Localization**: Narrator text is externalized into i18n JSON files. Initial launch: English. Phase 2: Chinese, Japanese, Korean.
