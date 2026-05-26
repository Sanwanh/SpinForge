# Design System — SpinForge

## Product Context
- **What this is:** Beyblade X blockchain card game — gacha pack opening, part collection, 3on3 battles, forge/evolution, marketplace, tournaments
- **Who it's for:** Competitive Beyblade fans + crypto gamers (16-35)
- **Space/industry:** Gacha / TCG / Web3 gaming (peers: Genshin Impact, Honkai Star Rail, Gods Unchained, Reverse:1999)
- **Project type:** Web app (Next.js 14 + Tailwind + Framer Motion)
- **Key differentiator:** Eastern mythology (Wu Xing / Five Elements) + mechanical toy (metal Beyblades) — no other game occupies this intersection

## Aesthetic Direction
- **Direction:** Mythic-Industrial — ancient temples meets precision engineering. Not anime-cute (Genshin), not tavern-cozy (Hearthstone). Think: stone engravings + industrial metal + talisman glow.
- **Decoration level:** Expressive — trigram geometric patterns as backgrounds, element-contaminated card borders, rarity-driven visual complexity (Common=plain, Legendary=full relief effect with particle glow)
- **Mood:** Powerful, ancient, heavy. The weight of metal spinning at 10,000 RPM. Gold that feels like real gold, not UI gold. Darkness that feels like void, not just #1a1a1a.
- **Reference sites:** Reverse:1999 (Art Deco conviction), Honkai Star Rail (polish + gacha UX), Gods Unchained (card quality tiers)

## Typography
- **Display/Hero:** Clash Grotesk Black — geometric, forceful, perfect for battle results and gacha reveals. Used EXTRA LARGE for impact moments (XTREME FINISH!, BURST!, pack reveals).
- **UI/Navigation:** Cabinet Grotesk Bold — geometric but warmer than Clash, for nav links, button labels, card names.
- **Body:** DM Sans — clean, readable, good tabular-nums. For descriptions, tooltips, body text.
- **Data/Blockchain:** JetBrains Mono — addresses, SPARK amounts, transaction hashes, stat numbers.
- **Loading:** Google Fonts / Bunny Fonts CDN
- **Scale:** 11px (caption) / 13px (small) / 15px (body) / 18px (lead) / 24px (h3) / 32px (h2) / 48-96px (display)

## Color
- **Approach:** Expressive — color is the primary design tool, not decoration
- **Primary:** #D4AF37 (True Gold) — ancient gold with weight. Used for: primary buttons, logo gradient, section accents, legendary glow
- **Accent:** #FF3333 (Blood Red) — instant pulse acceleration. Used for: battle CTA, critical alerts, damage numbers
- **Surface scale:**
  - #050810 (Abyss) — deepest background, body
  - #0A0E17 (Void) — card backgrounds, panels
  - #111827 (Surface) — elevated cards, modals
  - #1F2937 (Raised) — hover states, inputs
  - #374151 (Border) — subtle dividers
- **Five Elements (saturated, vivid — these are the game's soul):**
  - 木 Wood: #00FF88 — Azure Dragon / Seiryu
  - 火 Fire: #FF4444 — Vermilion Bird / Suzaku
  - 金 Metal: #C0C0C0 — White Tiger / Byakko
  - 水 Water: #00CCFF — Black Tortoise / Genbu
  - 土 Earth: #FFB800 — Yellow Dragon / Koryu
- **Rarity system:**
  - Common: no glow, border #374151
  - Rare: blue glow, border #00CCFF, shadow rgba(0,204,255,0.15)
  - Epic: purple glow, border #A855F7, shadow rgba(147,51,234,0.2)
  - Legendary: gold pulse animation, border #D4AF37, shadow rgba(212,175,55,0.3), `animation: legendaryPulse 2s infinite`
- **Semantic:** success #00FF88, warning #FFB800, error #FF4444, info #00CCFF
- **Dark mode:** This IS dark mode. No light mode. The void is the brand.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable (game UI needs breathing room for visual impact)
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64) 4xl(80)

## Layout
- **Approach:** Hybrid — grid for inventory/collection (data-dense), creative for gacha/battle (full-screen choreography)
- **Grid:** 12-col at lg, 6-col at md, 2-col at sm
- **Max content width:** 1200px
- **Border radius:** sm:4px md:8px lg:12px xl:16px full:9999px
- **Cards:** Use 16px radius. Legendary cards can overflow their container (spirit beast icons break frame).

## Motion
- **Approach:** Full choreography — motion IS gameplay, not decoration
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out) spring(stiffness:150, damping:18)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms) dramatic(700-1500ms)
- **Key animations:**
  - Pack opening: pack shake (1.5s) → burst explosion (0.8s, 30 particles) → cards condense from particles → flip reveal (spring, 0.7s per card)
  - Legendary pull: full-screen color shift + pattern crawl + extra glow
  - Page transitions: elements dissolve to particles, reassemble
  - Launch power meter: oscillating bar, release flash, AM multiplier display
  - Card hover: translateY(-4px) + glow intensify
  - Rarity border: Common=static, Rare=subtle shimmer, Epic=slow rotate gradient, Legendary=pulse glow

## Decoration Patterns
- **Background:** Subtle trigram (八卦) geometric pattern at 1.5% opacity + radial gradient color washes from element colors
- **Card frames:** Rarity-driven complexity. Common=clean border. Legendary=embossed relief pattern + overflow glow
- **Element contamination:** Cards with fire element get subtle flame edge animation; water gets ripple; wood gets vine; metal gets metallic sheen; earth gets ember particles
- **Kanji stamps:** 龍/鳳/虎/龜/皇 used boldly as decorative elements (spirit beast icons, background watermarks at 3% opacity, card art)

## Component Patterns
- **Primary button:** Gold gradient (#D4AF37 → #B8941F), dark text (#050810), gold shadow, hover lifts +1px + shadow expands
- **Battle button:** Blood red gradient, white text, red shadow
- **Ghost button:** Transparent + border-gray-700, hover → border-gold + text-gold
- **Element tags:** Transparent + element-color border + element-color text, small (6px 14px)
- **Stat cards:** Surface-2 bg, border-gray-800, stat label in muted uppercase 11px, stat value in Clash Grotesk 28px with element color
- **Input fields:** Surface-raised bg, border-gray-700, focus → border-gold, placeholder in gray-500
- **Part cards (game cards):** Rarity border + gradient bg (rarity-specific), header (type icon + rarity badge), center (beast orb/kanji + name), footer (stats bar with JetBrains Mono values)

## Launch Power System
- **Pre-battle mechanic:** Oscillating power meter (0-100), player holds and releases
- **Sweet spot:** 75-95 range (green/gold), perfect: 88-92 (gold flash)
- **Power → AM:** launch_power maps to Angular Momentum multiplier (power/50 = ×0.00 to ×2.00)
- **Visual:** Bar color shifts through gray → blue → yellow → green → gold → red as power oscillates

## Spirit Beast Kanji Map
| Beast | Kanji | Element | Color |
|-------|-------|---------|-------|
| Azure Dragon (Seiryu) | 龍 | Wood | #00FF88 |
| Vermilion Bird (Suzaku) | 鳳 | Fire | #FF4444 |
| White Tiger (Byakko) | 虎 | Metal | #C0C0C0 |
| Black Tortoise (Genbu) | 龜 | Water | #00CCFF |
| Yellow Dragon (Koryu) | 皇 | Earth | #FFB800 |

## Anti-Patterns (DO NOT)
- No purple gradients as default accent
- No generic 3-column feature grids with circle icons
- No uniform border-radius on everything
- No stock-photo hero sections
- No "Built for X" marketing copy
- No light mode
- No Inter/Roboto/Poppins/Montserrat fonts
- No pastel colors — everything saturated and vivid

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-26 | Mythic-Industrial aesthetic | Differentiates from anime-gacha (Genshin) and fantasy-TCG (Hearthstone). Leverages Beyblade's metal toy identity + Eastern mythology. Inspired by Reverse:1999's conviction in Art Deco. |
| 2026-05-26 | Expressive color with Five Elements | The Wu Xing cycle is core gameplay — color must carry it. Saturated vivid palette makes elements feel alive. |
| 2026-05-26 | True Gold (#D4AF37) as primary | Every top card game uses gold accent. But ours is "ancient gold" — heavier, less shiny, more weight. Matches the Mythic-Industrial mood. |
| 2026-05-26 | Clash Grotesk for display | Geometric brutalism for impact moments. Battle results and gacha reveals need to feel like a punch. |
| 2026-05-26 | Launch power meter pre-battle | Bridges physical Beyblade X launcher (BLE) with digital game. Simulated QTE for all players, real hardware connection planned. |
| 2026-05-26 | Trigram background patterns | 八卦 geometry is culturally authentic and visually distinctive. At low opacity it adds depth without distraction. |
