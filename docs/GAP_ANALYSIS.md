# SpinForge 計畫 vs. 系統落差分析（Gap Analysis）

> 基準規格：`.claude/plan/spinforge-v2.md`（下稱 *plan*）
> 比對對象：`contracts/sources/*.move`、`web/`（Next.js 即時後端）、`server/`（Rust，孤兒層）
> 產出日期：2026-05-31
> 性質：以實際程式碼逐項驗證，所有路徑均以 `path:line` 標註。

---

## 摘要（Executive Summary）

plan 描繪的是一個「**physics-on-chain**」的回合制競技遊戲：6 階段戰鬥流程、commit-reveal 走位、Xtreme Dash 機率擲骰、爆裂判定、靈獸大招、技術卡組、競技場分潤、Rookie→Diamond 進度系統，全部由 Move 合約權威執行，並由 Rust（axum + Postgres + Redis + WebSocket + 事件索引）負責即時撮合與持久化。**實作與規格嚴重背離**：戰鬥幾乎完全在鏈下進行——`web/app/api/battle-room`（Upstash KV 房間 + QR）負責整盤回合模擬，賽後由 `web/app/api/submit-result` 用 admin 金鑰把結果寫成 `battle_record`。鏈上的 `battle.move::resolve_turn / commit_action / reveal_action`、`physics.move`（傷害/型剋/五行/搶轉）、`xtreme_dash.move`、`deck.move::validate_deck`、`spirit.move` 大招、`stadium.move` 分潤、`admin.move` 可調參數**全部存在但從未被 app 觸發**，等同孤兒程式碼。Rust `server/` 自初始 scaffold 後再無演進（僅 2 commits），web 從不呼叫它；事件索引器訂閱硬寫死的無效 package `0x0000...`。整套「技術卡組」「教學/AI 對戰」「Rank/XP 進度」「靈獸大招」「競技場經濟」「治理投票」在鏈上、前端、後端三層皆未實作或未接線。

實質結論：**目前可玩的是「線下實體對戰 + 賽後鏈上記錄」的記分板**，而非 plan 所述的鏈上物理競技。plan 的核心信任承諾（physics-on-chain 作為防作弊根基）並未兌現——任一參與者即可自報勝負（見 `REDTEAM_FINDINGS.md`）。

---

## 缺失／落差總表

| Area | Status | Impact | 缺失檔案／未接項（節錄） |
|---|---|---|---|
| 6-Phase Battle Turn System | partial | major | `battle.move` resolve_turn（無 6 階段切分、無擊退、無 Over Finish）、`physics.move`（無場地幾何/界外判定） |
| Spin Steal（10% AM 轉移） | orphaned | major | `battle.move` resolve_turn 從不呼叫 `compute_spin_steal` |
| Death Spin & Life After Death | partial | major | `battle.move`（wobble 僅 +1 非 1.2x/1.5x/2.0x）、`bit.move`（`has_life_after_death` 從不讀取） |
| Lock Tightness × 體力懲罰 | partial | major | `battle.move` resolve_turn 從不套用 `lock_tightness_drain` |
| Xtreme Dash（Gear × Rail） | orphaned | blocker | `battle.move` 從不呼叫 `xtreme_dash::compute_dash`、不發 `FINISH_XTREME` |
| Spirit Beast 大招（每場一次） | missing | major | `spirit.move`（無每場限制、無大招效果）、`battle.move`（不讀 avatar） |
| Stadium NFT & 2% 分潤 | missing | major | `battle.move`（無 owner fee 收取）、缺鏈上 staking/wager 模組 |
| Technique Cards（鏈下卡組） | missing | major/blocker | 無 `technique.move`；`web/app/api`、`web/components/deck` 無抽牌/手牌邏輯 |
| Progression & Ranks（XP/段位） | missing | blocker | 缺 rank 進度模組；`player_profile.move` 無 xp 欄位/段位；`spirit.move` 無段位門檻 |
| Evolution / Fusion / Retune | diverged | blocker | `forge.move`（玩家簽 tx 引用 admin 持有的 `TreasuryCap` → 功能性失效）、`move-calls.ts` 無 admin relay |
| Marketplace（Kiosk） | missing | minor | `marketplace.move`（僅 Blade、無 rule、未接 web）；缺 list/purchase tx builder |
| Type Advantage Matrix | orphaned | major | `battle.move` 從不呼叫 `physics::type_advantage` |
| Wuxing Elemental Bonus | orphaned | major | `battle.move` 從不呼叫 `physics::wuxing_bonus` |
| Stat Computation（AM/MOI…） | partial | major | `battle.move::select_bey` 接受鏈下預算值，無 parts 推導 |
| Deck Validation（3on3 無重複） | orphaned | major | `battle.move::create_match` 從不呼叫 `deck::validate_deck` |
| Match Win（First to 7） | done | minor | 無落差（`battle.move:39 WIN_SCORE=7`） |
| Round Commit-Reveal（Zone） | partial | major | `battle.move` commit/reveal 無 Bit 類別的 Zone 約束 |
| Collision Resolution | partial | major | `battle.move` resolve_turn 無擊退/Over Finish，傷害/反作用力鏈下預算 |
| Scoring（1/2/2/3 分） | partial | major | `battle.move::check_win` 從不觸發 FINISH_OVER / FINISH_XTREME |
| On-chain vs Off-chain 邊界 | diverged | blocker | `battle.move::resolve_turn` 整段物理流程缺席 |
| Admin 可調參數 | partial | major | `admin.move` GameConfig 純裝飾；`battle/xtreme_dash/physics` 全硬寫常數 |
| Ban-list 強制 | partial | major | `battle.move`/`tournament.move`/`spirit.move`/`battle_record.move` 缺 `is_banned` |
| Battle Arena（PixiJS） | missing | major | `web/components/battle/*`（StadiumCanvas/SpinningTop/…）全缺 |
| On-chain Commit-Reveal（前端接線） | orphaned | major | `commitAction/revealAction` 已導出但 `battle/page.tsx` 從不呼叫 |
| Spirit Avatar 前端 | missing | major | 無 `web/hooks/useSpirit.ts`、`web/app/spirit/`、spirit tx builder |
| Stadium 交易/分潤前端 | missing | major | 無 `useStadium.ts`、stadium/marketplace tx builder |
| Technique Hand 管理前端 | partial | major | `deck/page.tsx` 12 空槽佔位，無 `TechniqueHand.tsx` |
| Lock Tightness 前端 | missing | minor | 無 1-5 滑桿、無 KV/Move 儲存 |
| Xtreme Dash FX 前端 | orphaned | major | 無 `XtremeDashFX.tsx`、`ZoneSelector.tsx` |
| Death Spin / Wobble 前端 | orphaned | major | 無 `DeathSpinWobble.tsx`、KV 無 AM 追蹤 |
| Marketplace 前端 | missing | major | `useMarketplace` 回傳空陣列；無 list/buy tx |
| Tournament 前端 | partial | major | `tournament/page.tsx` 寫死 BRACKET_MATCHES，無 `useTournament.ts` |
| Tutorial & Onboarding | missing | major/blocker | 無 `/tutorial`、無 AI 對戰、無教學元件 |
| Physics HUD / ScoreBar | partial | minor | 戰鬥頁無即時 AM/BI bar |
| Deck 持久化 | partial | minor | 無 `POST /api/save-deck`，validateDeck 從不被呼叫 |
| Spin 方向顯示 | partial | minor | spin_direction 從不顯示於 UI |
| Battle Room QR & Deep Link | done | blocker | 完整實作（`battle/page.tsx`） |
| Collection / 篩選 | partial | minor | 無 element/rarity 篩選 UI |
| Workshop Assembly | done | blocker | 完整實作 |
| Forge 前端 | partial | major | UI 完整但合約架構壞掉（TreasuryCap） |
| Profile / Passport | partial | minor | 無戰績歷史、無靈獸里程碑 |
| Rust Server（axum+PG+Redis） | orphaned | blocker | `server/src/routes/*.rs` 為未完成 stub；web 不呼叫 |
| WebSocket Battle Relay | diverged | major | `server/src/ws/*` 訊息型別存在但無遊戲邏輯；web 用 KV 輪詢 |
| PostgreSQL Event Indexing | missing | blocker | 合約未發 `RoundResolved/XtremeDashTriggered/BurstTriggered/SpinStealOccurred`；索引器訂閱 `0x0000...` |
| Matchmaking Queue（Redis ELO） | orphaned | major | `matchmaking.rs` handler 未實作；web 用 KV 房間碼 |
| Leaderboard Service | diverged | minor | web 直接讀鏈上 `ProfileUpdated`，server PG 排行被繞過 |
| Player Profiles（server） | diverged | minor | web 直接查鏈上，server `player.rs` 被繞過 |
| FORGE Token & Governance | missing | minor | `forge_token.move` 鑄造存在；無治理/投票模組 |
| zkLogin OAuth e2e | done | minor | 完整（`zklogin-verify.ts`，需設定 secrets） |
| Sponsored Starter Mint + 自動組裝 | partial | major | 僅鑄 500 SPARK + 1 包 5 隨機零件；無自動組裝、無 Stadium、無技術卡 |
| Starter deck 規格 | partial | major | `pack::open_pack` 隨機 5 件，非保證 3+3+3 + Stadium + 12 卡 |
| Onboarding flow 序列 | partial | blocker | 拆散於多頁，無引導序列、無 AI 對戰、無自動組裝 |
| Profile 建立原子性 | partial | minor | profile 與 starter 脫鉤，非原子 |

> Impact 等級沿用資料集標註：`blocker` > `major` > `minor`。`done` 列為對照，代表已完整實作、無落差。

---

## 依層分組的落差（Planned vs. Actual）

### 一、Contracts 層（`contracts/sources/*.move`）

核心結論：**幾乎所有戰鬥物理皆已正確實作於 Move，但從未被任何交易呼叫**——形成大規模孤兒程式碼。`battle.move::resolve_turn`（`battle.move:289-358`）僅以線性序列套用呼叫端傳入的預算傷害/反作用力，不切分 6 階段、不擊退、不觸發 Over/Xtreme Finish。

- **6-Phase / Collision / Scoring / Death Spin / Lock Tightness**：`resolve_turn` 接受 `damage_a_to_b/damage_b_to_a/recoil_a/recoil_b` 為顯式參數（`battle.move:292-295`），不在鏈上計算；wobble 每回合僅 +1（`battle.move:335-341`）而非規格的 1.2x/1.5x/2.0x；`bit.move:21 has_life_after_death` 從不被讀取；`physics.move:198 check_knockback` 為 stub 但 resolve_turn 從不呼叫；`physics.move:177-193 lock_tightness_drain` 定義存在但體力懲罰從不套用；`check_win`（`battle.move:363-394`）僅判 Burst/Spin Finish，FINISH_OVER/FINISH_XTREME 永不觸發。
- **物理計算全孤兒**：`physics.move:63-73 compute_spin_steal`（搶轉）、`physics.move:83-102 type_advantage`（型剋）、`physics.move:112-143 wuxing_bonus`（五行）、`xtreme_dash.move compute_dash`（極限衝刺）均正確，但 `battle.move` 全程不呼叫；同類傷害 -15% 摩擦減免無任何程式碼。
- **Stat 推導缺席**：`battle.move::select_bey`（`battle.move:172-173`）接受預先算好的 `am_a/am_b`、`burst_integrity_a/b`，無 `physics.move:19-36 compute_angular_momentum` 等 parts 推導。
- **Deck 驗證孤兒**：`deck.move::validate_deck` 完整，但 `battle.move:135-137` 僅 assert 牌組大小 == 3，`create_match` 收原始 `vector<ID>` 不驗證合法牌組。
- **Spirit 大招未實作**：`spirit.move:25-31` 有 `activated_count`，`activate()`（`spirit.move:93-99`）僅遞增計數；無「每場一次」限制、五個具名大招效果不存在、`battle.move` 不讀取 avatar。
- **Stadium 分潤缺席**：`stadium.move` 有 `owner_fee_bps`（上限 200），但無鏈上 wager 系統、`battle.move` 不讀取 fee、無結算/分潤邏輯。
- **Forge 架構性失效**：`forge.move` 五函式（`forge.move:59-257`）全要求 `&mut TreasuryCap<SPARK_TOKEN>`（admin 持有），`move-calls.ts:76,98,120,140,160` 以玩家錢包簽 tx 傳入 `SPARK_TREASURY_CAP_ID` → 玩家簽的交易無法存取 admin owned object → forge 功能性失效。
- **Admin 參數純裝飾**：`admin.move:20-31 GameConfig` 定義 5 個可調常數，但 resolve_turn 硬寫衰減邏輯、`xtreme_dash.move` 硬寫 `DASH_MULTIPLIER=150`、`physics.move` 硬寫搶轉 10%、`WIN_SCORE=7` 硬寫——皆不讀 config。
- **Ban-list 僅覆蓋 2 入口**：`pack.move:44`、`register.move:34` 有 `admin::is_banned`，但 `battle.move::create_match`、`tournament.move::register`、`spirit.move::mint`、`battle_record.move::create`、`forge.move::*` 全缺。
- **缺事件**：合約僅發 `MatchCreated/RoundStarted/TurnResolved/RoundFinished/MatchCompleted`（`battle.move:85-120`），plan 要求的 `RoundResolved/XtremeDashTriggered/BurstTriggered/SpinStealOccurred` 從未發出。

**缺失檔案清單（Contracts）**
- `contracts/sources/battle.move`（resolve_turn 缺 6 階段切分、擊退、Over/Xtreme Finish、spin steal、type/wuxing/lock_tightness 套用、deck 驗證、ban 檢查、stadium 分潤、parts stat 推導、admin config 讀取、`RoundResolved/XtremeDashTriggered/BurstTriggered/SpinStealOccurred` 事件）
- `contracts/sources/physics.move`（缺場地/賽道幾何、距離/鄰接圖、界外判定；現有函式全孤兒）
- `contracts/sources/bit.move`（`has_life_after_death` 從不被讀取）
- `contracts/sources/spirit.move`（缺每場一次限制、五大招效果、段位門檻、`is_banned`）
- `contracts/sources/stadium.move`（缺 mint 邏輯、缺 fee 收取與分潤）
- `contracts/sources/forge.move`（架構性壞掉：玩家簽名 vs admin 持有 TreasuryCap；缺 `is_banned`）
- `contracts/sources/admin.move`（GameConfig 未串接至各玩法模組）
- `contracts/sources/xtreme_dash.move`（硬寫 `DASH_MULTIPLIER`，從不讀 admin config）
- `contracts/sources/tournament.move`（缺 GameConfig/`is_banned`）
- `contracts/sources/battle_record.move`（`create` 缺 `is_banned`）
- `contracts/sources/marketplace.move`（僅 Blade、零 rule、未接 web）
- `contracts/sources/technique.move`（不存在）
- 缺：Rank/XP 進度模組（追蹤 total XP 並推導段位）
- 缺：鏈上 staking/wager 模組（觸發 stadium 分潤）
- `contracts/sources/player_profile.move`（缺 xp 欄位、段位列舉與計算）
- `contracts/sources/governance.move` / `contracts/sources/voting.move`（不存在）

### 二、Frontend 層（`web/`）

核心結論：**前端是「線下實體對戰 + 賽後鏈上記錄」的非同步 UI**，與 plan 描述的即時動畫物理模擬完全不同。`battle/page.tsx` 流程為 create→waiting→select→battle→submit→confirmed→done，無 commit/reveal、無 PixiJS、無即時 HUD。`move-calls.ts` 導出 `commitAction`（`move-calls.ts:168`）/`revealAction`（`move-calls.ts:187`）但 `battle/page.tsx` 從不呼叫，直接走 `/api/submit-result`——死碼。

- **已完整實作（對照）**：Battle Room QR/Deep Link、Workshop 組裝（PartSlot/AssemblyPreview/StatsPanel + 物理預覽）。
- **架構壞但 UI 完整**：Forge 頁（`forge/page.tsx` + `useForge`）UI 齊全，但底層 Move 因 TreasuryCap 失效。
- **大量子系統前端缺席**：PixiJS 戰鬥場、Spirit Avatar（mint/啟用/大招）、Stadium 交易/分潤、Technique 手牌、Lock Tightness 滑桿、Xtreme Dash FX、Death Spin/Wobble、Marketplace（list/buy）、Tournament（bracket/register/prize）、Tutorial/AI 對戰。
- **資料來源繞過 server**：`leaderboard/route.ts:17,39` 直接查鏈上 `ProfileUpdated` 事件並按 `elo` 排序，未用 server PG 排行。

**缺失檔案清單（Frontend）**
- `web/components/battle/StadiumCanvas.tsx`
- `web/components/battle/SpinningTop.tsx`
- `web/components/battle/XtremeDashFX.tsx`
- `web/components/battle/BurstExplosion.tsx`
- `web/components/battle/DeathSpinWobble.tsx`
- `web/components/battle/PhysicsHUD.tsx`（即時 AM/BI bar）
- `web/components/battle/ScoreBar.tsx`（回合進度）
- `web/components/battle/ZoneSelector.tsx`
- `web/components/battle/TechniqueHand.tsx`
- `web/components/battle/TutorialMode.tsx`
- `web/components/deck/TechniqueCardPicker.tsx`（或 `TechniqueCardSelector.tsx`）
- `web/components/spirit/`（或 `web/components/design/SpiritAvatarCard.tsx`）
- `web/components/market/StadiumListing.tsx`
- `web/components/tournament/`（BracketView / TournamentRegister / PrizePool）
- `web/components/tutorial/`（PhysicsExplainer / LockTightnessGuide / XtremeDashTutorial / AIBattle）
- `web/components/ProgressionUI.tsx`（或 rank 徽章）
- Spin direction 指示器（PartCard / BeyCard）、element/rarity 篩選 UI、Lock Tightness 1-5 滑桿、戰績歷史/靈獸里程碑元件

### `web/hooks/`
- `web/hooks/useSpirit.ts`、`useStadium.ts`、`useTournament.ts`、`useRank.ts`、`useTechniqueCards.ts`、`useTutorial.ts`、`useAIBattle.ts`、`useMarketplace.ts`（鏈上實作，取代回傳空陣列的 stub）

### `web/app/`
- `web/app/spirit/page.tsx`（或整合進 `/profile`）、`tutorial/page.tsx`、`battle/ai/`、`stadium/`、`governance*`

### `web/lib/`
- `web/lib/move-calls.ts`（缺：spirit::mint/activate、stadium::mint/set_fee、marketplace::list/purchase/delist、tournament 各函式、forge admin relay 的 tx builder；Lock Tightness 與 spin 方向 UI 接線）
- `web/lib/technique-data.ts`

### 三、Backend 層（`server/` Rust，孤兒）

核心結論：**整個 Rust server 自初始 scaffold 後從未演進（僅 2 commits），web 從不呼叫它**。事件索引器訂閱硬寫死的無效 package `SPINFORGE_PACKAGE='0x0000...'`（`server/src/indexer/event_listener.rs:97`），實際永不索引任何事件。WebSocket relay（`server/src/ws/handler.rs`、`server/src/ws/rooms.rs`）僅定義訊息型別（Commit/Reveal/PlayCard/ActivateSpirit），無遊戲邏輯；web 改用 KV 房間 + 手動輪詢。排行/玩家路由被 web 的鏈上查詢繞過，使 server PG 基礎設施冗餘。

**缺失檔案清單（Backend）**
- `server/src/routes/battle_relay.rs`（僅收 WS 升級與訊息型別，無物理解算/commit-reveal 驗證/鏈上建 match）
- `server/src/routes/matchmaking.rs`（queue/status/cancel handler 主體缺失，無 ELO 取值/入列/建 match；web 不呼叫）
- `server/src/routes/tournament.rs`（create/join/start/results handler 主體缺失；web 不呼叫）
- `server/src/routes/leaderboard.rs`（查 PG 但 web 改讀鏈上事件）
- `server/src/routes/player.rs`（查 PG 但 web 改讀鏈上）
- `server/src/indexer/event_listener.rs`（訂閱無效 `0x0000...` package；SpinForgeEvent 列舉與合約實發事件不符）
- `server/src/indexer/processors.rs`（process_xtreme_dash/burst/spin_steal/round_resolved 為 stub，接收合約從不發出的事件）
- `server/src/routes/technique*`（不存在）

### 四、Onboarding 層（`web/app/api/claim-starter` 等）

核心結論：**onboarding 拆散於多頁、非原子、且 starter 內容與規格不符**。`claim-starter/route.ts:51-110` 僅鑄 500 SPARK + 開 1 包（`pack::open_pack` 隨機 5 件，`pack.move:96` beast 0-3 無 Koryu），**不自動組裝 Beyblade、不鑄 12 張技術卡、不鑄 Stadium**，亦不保證規格指定的 3 Blades（Seiryu/Suzaku/Byakko）/3 Ratchets（3-60,5-70,1-80）/3 Bits（Rush,Ball,Needle）分佈。`create-profile` 為獨立步驟，與 claim-starter 無原子性。zkLogin 已完整（`zklogin-verify.ts`，需設 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`/`ZKLOGIN_SALT_SECRET`）。無 `/tutorial`、無 AI 對戰、無引導序列。

**缺失檔案清單（Onboarding）**
- `web/app/api/claim-starter/route.ts`（缺 `bey::assemble` 自動組裝、缺 Stadium 鑄造、缺 12 技術卡鑄造/轉移）
- `contracts/sources/pack.move`（缺 `open_starter_pack` 確定性變體；保證 3+3+3 分佈）
- `web/app/tutorial/page.tsx` 與教學元件（見 Frontend）
- onboarding 編排頁/序列（zkLogin → sponsor → claim → 自動組裝 → tutorial → AI 對戰 → PvP）
- 缺：`onboarding.move`（或在 register/pack 內補齊 sponsored tx + 完整 starter 內容）

---

## 完整缺失檔案清單（去重，依目錄分組，可當建置 checklist）

### `contracts/sources/`
- [ ] `battle.move` — resolve_turn 物理流程（6 階段、spin steal、type/wuxing、lock tightness drain、knockback、Over/Xtreme Finish、parts stat 推導）、create_match 接 deck::validate_deck、commit/reveal 加 Zone 約束、`is_banned`、stadium 分潤、讀 admin config、新增 `RoundResolved/XtremeDashTriggered/BurstTriggered/SpinStealOccurred` 事件
- [ ] `physics.move` — 場地/賽道幾何、距離/鄰接圖、界外（Over Finish）判定
- [ ] `xtreme_dash.move` — 讀 admin `xtreme_dash_multiplier`（取代硬寫 150）
- [ ] `spirit.move` — 每場一次啟用限制、五大招效果解算器、段位門檻（Koryu→Diamond）、`is_banned`、`activate()` 加門檻
- [ ] `stadium.move` — mint 邏輯、2% owner fee 收取與分潤
- [ ] `forge.move` — 修架構（共享受權限 minter 取代 admin owned TreasuryCap）、`is_banned`
- [ ] `admin.move` — GameConfig 常數串接至 battle/xtreme_dash/physics
- [ ] `tournament.move` — GameConfig/`is_banned`、advance_round 去重 + 嚴格收斂
- [ ] `battle_record.move` — `create` 加 `is_banned`
- [ ] `bit.move` — 確保 `has_life_after_death` 被 resolve_turn 讀取
- [ ] `player_profile.move` — xp 欄位、段位列舉/計算、`record_battle_result` 改 `public(package)`（見紅隊報告 H 級）
- [ ] `marketplace.move` — 支援 Ratchet/Bit、TransferPolicy rule（fee/royalty）、接線 web
- [ ] `pack.move` — `open_starter_pack` 確定性變體（保證 3+3+3）
- [ ] `technique.move` —（新建）技術卡系統（若選擇上鏈）
- [ ] `governance.move` / `voting.move` —（新建）FORGE 治理
- [ ] Rank/XP 進度模組、鏈上 staking/wager 模組、`onboarding.move`（或併入既有模組）

### `web/components/`
- [ ] `battle/StadiumCanvas.tsx`、`battle/SpinningTop.tsx`、`battle/XtremeDashFX.tsx`、`battle/BurstExplosion.tsx`、`battle/DeathSpinWobble.tsx`、`battle/PhysicsHUD.tsx`、`battle/ScoreBar.tsx`、`battle/ZoneSelector.tsx`、`battle/TechniqueHand.tsx`、`battle/TutorialMode.tsx`
- [ ] `deck/TechniqueCardPicker.tsx`（或 `TechniqueCardSelector.tsx`）
- [ ] `spirit/`（或 `design/SpiritAvatarCard.tsx`）
- [ ] `market/StadiumListing.tsx`
- [ ] `tournament/`（BracketView / TournamentRegister / PrizePool）
- [ ] `tutorial/`（PhysicsExplainer / LockTightnessGuide / XtremeDashTutorial / AIBattle）
- [ ] `ProgressionUI.tsx`（rank 徽章）
- [ ] Spin direction 指示器、element/rarity 篩選 UI、Lock Tightness 1-5 滑桿、戰績歷史/靈獸里程碑元件

### `web/hooks/`
- [ ] `useSpirit.ts`、`useStadium.ts`、`useTournament.ts`、`useRank.ts`、`useTechniqueCards.ts`、`useTutorial.ts`、`useAIBattle.ts`、`useMarketplace.ts`（鏈上實作）

### `web/app/`
- [ ] `spirit/page.tsx`、`tutorial/page.tsx`、`battle/ai/`、`stadium/`、`governance*`
- [ ] `api/claim-starter/route.ts`（補自動組裝 + Stadium + 技術卡）
- [ ] `api/commit-action`、`api/reveal-action`、`api/battle-round`（若改採鏈上回合）
- [ ] `api/save-deck`（牌組持久化）

### `web/lib/`
- [ ] `move-calls.ts` — spirit::mint/activate、stadium::mint/set_fee、marketplace::list/purchase/delist、tournament 各函式、forge admin relay 的 tx builder
- [ ] `technique-data.ts`

### `server/src/`
- [ ] `routes/battle_relay.rs`、`routes/matchmaking.rs`、`routes/tournament.rs`、`routes/leaderboard.rs`、`routes/player.rs`（補完 handler 主體並接線 web，或正式廢棄此層）
- [ ] `indexer/event_listener.rs`（修 package 位址、對齊實發事件）、`indexer/processors.rs`（實作 processor）
- [ ] `routes/technique*`

> 註：Backend 層整體已被 web 的「KV + 鏈上查詢」架構取代。建置前應先做產品決策：**補完 Rust server，或正式廢棄 `server/` 並把 plan §4 改為 KV/serverless 架構**。
