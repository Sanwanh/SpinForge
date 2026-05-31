# SpinForge 紅隊滲透發現（Red-Team Findings）

> 性質：**對抗式驗證**報告。每一條都經過懷疑論者（skeptic）逐行讀碼複核，已剔除/降級不成立或被既有防護消化的指控。
> 與 `AUDIT.md` 的關係：**本報告補充而非重複**已標記 remediated 的項目。所有「既有項」皆為下列兩類之一：
> 1. **仍開放**（AUDIT 自己列為待辦，如 C-1/M-8、M-6）；
> 2. **已宣稱修復但實際可繞過/不完整**（remediation 未達其自身建議的範圍）。
> 部署現況：testnet（所有路由硬寫 `fullnode.testnet.sui.io`），故 SPARK 目前無真實經濟價值——多數嚴重度已據此調整。所有指控均以 `path:line` 佐證並經實碼確認。

---

## 本次修復狀態（2026-05-31，Claude 直接修補；第二輪含合約 + 身分閘門 + 分權 seam）

> `codeagent` skill 不可用,本次以直接編輯落地。驗證:`sui move test` **185 passed**(180→185,+player_profile×3 +token_supply×2)、web `tsc --noEmit` 通過。

| 發現 | 處置 | 說明 |
|---|---|---|
| **H-RT-1** KV 靜默降級 | ✅ 已修(web) | `api-guard.ts::requireRedis()`;production 無 Redis 時 6 條 admin 路由 **fail-closed 回 503**。dev 維持記憶體 fallback。 |
| **H-RT-2** admin gas/SPARK 枯竭 | ✅ 已修(web,多層) | (1) `adminBudgetExceeded()` 全域每小時熔斷;(2) `belowMinSuiBalance()` **身分成本化**:faucet/claim-starter 要求目標地址持有最低 SUI(`MIN_SUI_MIST=0.02`),免費離線金鑰無法再無限刷。更強身分(zkLogin/proof-of-funding)為後續產品選項。 |
| **H-RT-4** player_profile 可自刷 ELO | ✅ 已修(web + 合約) | web:`leaderboard` 改用防偽 `BattleRecordCommitted`。合約:`player_profile` 改 **shared object** + `record_battle_result` 改 **`&AdminCap` 閘門**(玩家無法自刷),`create` 修正 owner 歸屬;新增 `create_and_share`。**需重部署生效**(見 runbook)。 |
| **H-RT-3** 單一熱鑰 / 無 KMS | ✅ 程式碼就緒,⏳ 上鏈/輪替待你 | (1) 鏈上:`spark_token MAX_SUPPLY=1e18`、`forge_token=1e17` 全域上限。(2) web:`lib/admin-signer.ts` 角色化金鑰 seam(minter/recorder,回退 ADMIN)。(3) 金鑰輪替 / cap 分權移轉 / KMS / 重部署屬不可逆營運步驟 → 見 `docs/KEY_ROTATION_RUNBOOK.md`,由你執行。 |

### 你需執行的不可逆步驟(已備妥 `docs/KEY_ROTATION_RUNBOOK.md`)

1. **重部署合約**(`sui client publish`):啟用 H-RT-4 閘門 + H-RT-3 `MAX_SUPPLY`;更新 `constants.ts` 物件 id。**會變更 PACKAGE_ID 並重置 testnet**。
2. **金鑰輪替 + 分權**:產生 minter/recorder 雙鑰,把 TreasuryCap→minter、AdminCap→recorder,Vercel 設 `MINTER_PRIVATE_KEY`/`RECORDER_PRIVATE_KEY` 並刪除 `ADMIN_PRIVATE_KEY`。
3. **生產配置 Redis**:否則 H-RT-1 守衛會讓 admin 路由 fail-closed(503)。
4. **(長期)KMS/HSM**:`admin-signer.ts` 為唯一載鑰點,改 KMS 簽名器即可。

---

## 嚴重度統計（調整後）

| Severity | 數量 |
|---|---|
| Critical | 0 |
| High | 4 |
| Medium | 7 |
| Low | 6 |
| Info | 2 |
| **合計** | **19** |

### NEW vs. BYPASS-of-claimed-fix

| 類別 | 數量 | 說明 |
|---|---|---|
| NEW（全新發現） | 12 | AUDIT.md 未涵蓋的新向量 |
| BYPASS / 既有未修（既有項） | 7 | 已宣稱修復但可繞過，或 AUDIT 自列待辦 |

> 既有項（非全新）：M-6 KV fallback（高）、C-1/M-8 單一熱鑰（高）、submit-result 與房間脫鉤（中，H-10/M-7 修不完整）、M-6 in-memory（中）、auth 無 payload 綁定（中，C-2 修不完整）、zkLogin nonce 自報（中，H-11 修不完整）、GameConfig ban 不完整（低，M-1 修不完整）。
> 多數「medium 級的房間/簽章」發現本質是 **H-10/M-5/M-7/C-2 的 remediation 未達其自身建議**（AUDIT 建議「從受信任房間狀態推導 + 雙方各自確認 + 一次性 nonce」皆未落地）。

---

## High 級發現（4）

### H-RT-1 — M-6 修法從未落地：KV 層靜默降級為「每實例記憶體」，在 Vercel serverless 上瓦解所有 faucet/claim/replay 去重
- **Category**：Broken Access Control / Economic Abuse（serverless 並發）
- **Tag**：既有未修（AUDIT M-6 仍開放）
- **攻擊情境**：AUDIT.md:167 明確建議「`usingRedis` 為 false 即拒絕鑄造（fail-fast）」。此建議**從未實作**：`kv.ts:11` 導出 `usingRedis`，但全 `web/` 無任何路由/helper 讀取它（已驗證：grep 僅命中定義行）。當 `KV_REST_API_URL/TOKEN` 缺失時，`kv.ts:8` 回傳 `null` 而不拋錯，所有 KV 操作退回模組內記憶體 Map（`kv.ts:20`）；`kvSetNX` 僅檢查本實例 Map（`kv.ts:76-78`）。Vercel 多實例並發下，對同一地址同時發 N 個 `POST /api/faucet`，各落在不同實例 → 各自看到空 Map → 各自通過 → admin 每次鑄 500 SPARK（`faucet/route.ts:48,64-71`）。`claim-starter` 更糟（額外開一包 5 件）；`open-pack` 的 `used_payment:<digest>` replay guard（`open-pack/route.ts:57`）同樣崩潰，一筆真實付款可換無限包。鏈上無一址一領註冊表，`spark_token::mint` 僅有 100,000 SPARK/呼叫上限、無 per-address 上限。
- **證據**：`web/lib/kv.ts:8`（redis 為 null 不拋錯）、`kv.ts:11`（`usingRedis` 零消費）、`kv.ts:69-79`（in-memory 分支）、`web/.env.example:18-19`（KV 變數空白）、`faucet/route.ts:48`、`AUDIT.md:167,228`、`AUDIT.md:20`（專案自承 ⚠️ faucet 一址一領仍為內存）。
- **建議修法**：在每個可鑄造路由（faucet/claim-starter/open-pack/register-rotor）`import { usingRedis }` 並於簽名前 `if (!usingRedis) return 503`。更佳：`kv.ts` factory 於 `NODE_ENV==='production' && 缺 url/token` 時**啟動即拋錯**。長期：以共享 Registry 物件在鏈上強制一址一領，使 KV 故障不致重開水龍頭。
- **Confidence**：high
- **降級理由**：critical→high，因可利用性「條件性」依賴生產部署省略 Redis；若 Redis 已配置，`kvSetNX` 成為真正原子 `SET NX`，去重成立。危害在於程式**靜默降級**而非 fail-fast。

### H-RT-2 — Sybil 繞過：用免費離線生成的金鑰對破解 per-address 去重，無全域花費上限，rate limit 僅 per-IP（admin gas/SPARK 無上限耗盡）
- **Category**：Denial of Service / Resource Exhaustion
- **Tag**：NEW（C-2 remediation 不完整：證明地址控制權 ≠ 證明是「不同的、有資金的」用戶）
- **攻擊情境**：faucet/claim-starter 以 `kvSetNX(CLAIM_KEY(address))` 去重，但 `address` 由呼叫端提供（`faucet:48`、`claim-starter:38`）。唯一的所有權證明是 `verifyAuth`，它只驗 Ed25519 personal-message 簽名能還原到該地址（`auth-verify.ts:52-59`）。生成全新金鑰對並簽署固定的 `SpinForge auth` 訊息**完全免費、離線、無鏈上足跡**。因此每個請求都能呈現全新地址，一址一領對攻擊者永不觸發。剩下唯一節流是 `rateLimited(...,'faucet',10,3600)`，以 `clientIp()` 為 key（`api-guard.ts:24-27,41`），輪換來源 IP/代理即可破解；Redis 未配置時計數器更是 per-instance（`kv.ts:104-107`），Vercel fan-out 倍增有效上限。每個被接受的 faucet 呼叫強制 1 筆 admin 簽名 tx（鑄 500 SPARK + 燒 admin SUI gas，`faucet:64-84`）；claim-starter 每次最多 3 筆 admin tx（`claim-starter:51-109`）。`constants.ts` 無任何全域/每日花費上限。持續的全新地址請求可耗盡 admin 錢包 SUI gas → 所有 admin 路由失效（自費為零的熱錢包 DoS）。
- **證據**：`web/lib/api-guard.ts:24-44`、`web/lib/auth-verify.ts:27-63`、`faucet/route.ts:27,48,64-84`、`claim-starter/route.ts:51-109`、`kv.ts:104-107`；`constants.ts` 無全域上限（grep 確認）。
- **建議修法**：把 faucet/starter 資格綁到「鑄造成本高」之物（要求目標地址已持有最低 SUI 餘額、或經驗證的 social/zkLogin 身分、或一筆小額 proof-of-funding tx）。新增全域 admin 花費預算（每小時 SUI + SPARK 鑄造上限）存於 Redis，超出即硬停所有 admin 鑄造，與 per-address 去重解耦。rate limit 改跨實例（生產強制 Redis）並加全域請求預算。claim-starter 收斂為單一 tx。
- **Confidence**：high
- **降級理由**：high（非 critical），因影響為「自費為零的熱錢包 gas DoS + 無上限 testnet SPARK 通膨」，但為 testnet、需持續流量，花費上限/熱鑰根因已歸入仍開放的 C-1。

### H-RT-3 — C-1/M-8 仍開放：單一熱 `ADMIN_PRIVATE_KEY` 明文存於 env，簽署全部 6 條路由並持有所有 TreasuryCap + AdminCap（最大爆炸半徑，無輪替/KMS）
- **Category**：Key Management / Secret Management
- **Tag**：既有未修（AUDIT C-1/M-8 列為待辦）
- **攻擊情境**：單一 Ed25519 金鑰（`process.env.ADMIN_PRIVATE_KEY`）簽署 faucet/claim-starter/open-pack/register-rotor/submit-result/create-profile，且為 SPARK TreasuryCap（`0x026b...4980`）與 AdminCap（`0xa295...5916`）的擁有者。此金鑰一旦外洩（Vercel env 經依賴 RCE 外流、部署日誌洩漏、內鬼、任何 SSRF/log-leak 暴露 `process.env`），攻擊者即取得：SPARK 鑄造、無限免費開包、偽造**任意** battle_record（`battle_record::create` 由 `&AdminCap` 把關 → cap 即金鑰）、註冊任意 rotor、封禁/解禁任意玩家。無金鑰輪替、無 KMS/HSM、無 per-capability 分離、無提領/鑄造上限——單次外洩即全遊戲經濟總淪陷且不可逆。金鑰同時也是唯一 gas 簽名者，把經濟權限與 DoS 面耦合。
- **證據**：六路由載入同一金鑰：`faucet/route.ts:6`、`submit-result/route.ts:8`、`open-pack/route.ts:8`、`register-rotor/route.ts:8`、`claim-starter/route.ts:9`、`create-profile/route.ts:8`；caps：`faucet:8`、`open-pack:15`、`submit-result:12`、`register-rotor:10`；`battle_record.move:48-49`（`public fun create(_admin: &AdminCap, ...)`）；`AUDIT.md:29,82-86`（自列待辦）。
- **建議修法**：把 `ADMIN_PRIVATE_KEY` 遷至 KMS/HSM-backed signer（AWS/GCP KMS 或 Vault Transit），raw key 永不進 `process.env`。職責分離：低價值「minter」鑰（faucet/starter）與只持 AdminCap 的「recorder」鑰分離。加鏈上鑄造上限/時間鎖提領，使被竊 TreasuryCap 無法瞬間抽乾。建立輪替 runbook，疑似外洩即輪替。
- **Confidence**：high
- **修正（降低指控強度）**：claim 的「無限/單筆鑄造無上限」**部分錯誤**——`spark_token.move:14,53,65` 有 `MAX_MINT_PER_CALL = 100,000 SPARK/呼叫`（H-2 修），單筆有界，抽乾需多筆連續 tx；全域 `MAX_SUPPLY` 仍缺。加上 testnet 現況無真實價值，據此給 HIGH（mainnet 真值上線則為 critical）。

### H-RT-4 — `player_profile::record_battle_result` 為 public 且可自呼叫 → 排行榜/ELO 完全可偽造（H-3 修法漏掉 PlayerProfile）
- **Category**：Access Control / Stat Forgery
- **Tag**：NEW（H-3 強化了 bey/ratchet/bit 的 mutator，卻漏掉同類的 PlayerProfile）
- **攻擊情境**：(1) 攻擊者正常建立 profile（`POST /api/create-profile`），取得 owner-held `PlayerProfile`。(2) 自建 PTB 呼叫 `${PKG}::player_profile::record_battle_result(profile, true, true, true)`，傳入自己的 profile。因該函式為 `public`（非 `public(package)`），且只收 `&mut PlayerProfile` + 純 bool（無 AdminCap、無 Match、無 winner 推導），owner 可直接呼叫。(3) 每次呼叫 wins+1、elo+25、xtreme/burst+1 並發 `ProfileUpdated`。(4) 在一個或多個 PTB 中迴圈數千次把 elo 推到任意高。公開排行榜（`leaderboard/route.ts`）純以 `ProfileUpdated.elo` 排序（`leaderboard/route.ts:39`），攻擊者**不用打任何一場**即登頂並擁有完美戰績。鏈上無任何合法 caller（`submit-result` 只寫 battle_record，從不碰 PlayerProfile），故 ELO 來源完全由此可控函式獨佔。
- **證據**：`contracts/sources/player_profile.move:60`（`public fun record_battle_result`）、`:66-86`（wins/elo 遞增 + 發事件）、`:7`（`has key, store`）、`create-profile/route.ts:59`（transfer 給玩家）；零 in-package/test caller（grep 僅命中定義）；`leaderboard/route.ts:17,39`（純以 elo 排序）。對照：H-3 把 `bey::record_*`、`ratchet/bit::add_xp` 改 `public(package)`，獨漏 PlayerProfile。
- **建議修法**：將 `record_battle_result` 改 `public(package)`（比照 H-3），並只從 AdminCap-gated、Match-derived 的結算流程呼叫；或像 `battle_record::create` 以 `&AdminCap` 為首參把關。鏈下排行消費者不得信任任何 owner 可自鑄的 ELO。
- **Confidence**：high
- **降級理由**：high（非 critical），可被任何 profile owner 輕易利用並完全偽造鏈下消費的排行/ELO，但不抽資金、不鑄代幣、不危及鏈上資產或 admin 金鑰；影響限於可偽造的排名指標。

---

## Medium 級發現（7）

### M-RT-1 — submit-result 與房間狀態完全脫鉤：單一參與者即可對任意受害者偽造任意 BattleRecord（H-10/M-7 修法不完整）
- **Category**：Broken Access Control / Insufficient Authorization　**Tag**：BYPASS（H-10/M-7 宣稱已修，但 remediation 未達其自身建議）
- **攻擊情境**：攻擊者取得自己地址的有效簽名（`buildAuthMessage` 只簽 `address`+`ts`，與比賽無關），直接 `curl POST /api/submit-result {playerA: ATTACKER, playerB: 任意受害者, winner: ATTACKER, scoreA:7, submitter: ATTACKER, ...}`。路由僅檢查：簽名有效（`:40`）、submitter ∈ {playerA,playerB}（`:42`）、winner ∈ {playerA,playerB}（`:47`）、分數界限（`:50-55`）。**從不讀 roomId、從不呼叫 getRoom、從不比對房間的 result.winner、不要求對手存在或同意**。admin 金鑰隨即簽 `battle_record::create`，鑄出宣稱 ATTACKER 擊敗 VICTIM 的鏈上記錄。可對數千個受害者地址迴圈。
- **證據**：`web/app/api/submit-result/route.ts:32`（直接取 body）、`:40-44`、`:47-49`（唯一 authz）、全檔無 roomId/getRoom（grep 確認 `getRoom` 僅存在於 battle-room）。`AUDIT.md:95` 要求「從受信任房間狀態推導參與者與勝者並比照鏈上 confirm() 雙方各自簽署」——未落地。
- **建議修法**：要求 roomId；從 KV 載入房間；playerA/B/rotorA/B 一律取自受信任房間物件（非 body）；除非 `room.status==='confirmed'` 且 `room.result.winner===winner` 否則拒絕；要求 creator 與 opponent 各自獨立 wallet-sign 確認（房間記錄每位確認者的已驗證地址）。
- **Confidence**：high　**降級理由**：high→medium，偽造記錄為 `committed:false`（`battle_record.move:73`），無受害者鏈上 `confirm()` 永遠無法 committed=true；正確消費者只信 `is_committed()`。影響為鏈上 spam/污染與「若 UI/indexer 誤讀未 commit 記錄」的假戰績，且 30/hr 節流。

### M-RT-2 — battle-room confirm-result 允許「任一單一參與者」翻轉 status 為 'confirmed'：無雙方同意，違背鏈上 dual-confirm 模型
- **Category**：Broken Access Control / Business Logic　**Tag**：BYPASS（H-12/M-5 宣稱已修，雙方確認子需求被丟棄）
- **攻擊情境**：攻擊者為房主，先以 action `submit-result` 自報有利結果（`:121-135`，只要 submitter/winner ∈ 參與者，可設 winner=self），再以同一錢包呼叫 action `confirm-result`（`:137-148`），唯一檢查是 `confirmer===creator || opponent`（`:141`）——攻擊者即 creator，通過，status 變 'confirmed'。對手同意從不被要求。
- **證據**：`web/app/api/battle-room/route.ts:137-148`（單一 confirmer 檢查、無追蹤哪方確認、無雙方要求）；`BattleRoom` interface（`:7-23`）無 `confirmedByCreator/confirmedByOpponent` 欄位 → 結構上無法強制雙方確認。對照 `contracts/sources/battle_record.move:86-119` confirm() 分別追蹤 `confirmed_by_a/b`、雙方皆 true 才 committed。
- **建議修法**：房間加 `confirmedByCreator/confirmedByOpponent` 布林；confirm-result 只設呼叫方旗標並要求兩者皆 true 才轉 'confirmed'；拒絕「提交結果的同一方」確認，或要求非提交方確認。
- **Confidence**：high　**附註**：紅隊原述「翻 KV status 即驅動鏈上」不精確——`battle/page.tsx:145-172` 的 handleConfirm 是無條件呼叫 submit-result，且 submit-result 根本不讀 KV（見 M-RT-1）。Medium 符合 AUDIT 自身 M-5 評級。

### M-RT-3 — 錢包簽章未綁定 action payload：5 分鐘窗內一個簽名可重放於多個不同的偽造提交
- **Category**：Authentication / Replay　**Tag**：BYPASS（C-2 remediation 不完整）
- **攻擊情境**：`buildAuthMessage` 只簽 `SpinForge auth\naddress\nts`——無 roomId、無 opponent、無 winner、無分數、無 rotor、無 per-request nonce。`verifyAuth` 只驗簽名還原到 address + 訊息命名 address + ts 在 5 分鐘內（`auth-verify.ts:48`）。攻擊者用同一 authMessage/authSignature 連發數十次 submit-result，每次帶**不同**的 playerB/winner/rotor，全被接受為真。簽名只授權「此地址在行動」，從不授權「此地址同意此特定結果」。
- **證據**：`web/lib/auth-verify.ts:13-15`（只含 address+ts）、`:27-63`（無 nonce store，註解自承可重放）、`submit-result/route.ts:40`（只把 submitter/authMessage/authSignature 傳入 verifyAuth，結果欄位不在簽署材料內）。
- **建議修法**：把結果綁定欄位（roomId, playerA, playerB, winner, scoreA, scoreB, finishType + 伺服器發放的一次性 nonce）納入簽署訊息，伺服器重建並重驗該標準字串。已用 nonce 以 `kvSetNX` 持久化，使每個簽名只授權一次特定提交。
- **Confidence**：high　**降級理由**：high→medium，影響限於鏈下決定的戰績完整性（假戰績/排行操弄），由有界的 admin 金鑰簽署；無用戶資金/資產被竊。

### M-RT-4 — per-IP rate limit 可由 X-Forwarded-For 偽造完全繞過（四條經濟路由）
- **Category**：Rate Limiting Bypass / Anti-Automation　**Tag**：NEW（M-4 修法不完整：只做 per-IP、未做 XFF 正規化與 per-wallet 維度）
- **攻擊情境**：`clientIp()` 取 `x-forwarded-for` 的**最左**值（`api-guard.ts:24-27`）。Vercel 會把真實 edge IP **附加**到客戶端送的 XFF 右側，產生 `<attacker>, <realIP>`；程式讀 index [0] → bucket key `rl:<bucket>:<attacker-supplied>` 完全由攻擊者控制。每請求送全新隨機 `X-Forwarded-For: <uuid>` → 各自獨立計數器 → 永不觸限。這使 faucet(10/hr)、claim-starter(10/hr)、open-pack(30/hr)、register-rotor(30/hr) 的唯一量控失效。無 `web/middleware.ts` 做受信任代理正規化（已確認不存在）。
- **證據**：`web/lib/api-guard.ts:24-28`、`:41`；呼叫點 `faucet/route.ts:27`、`claim-starter/route.ts:31`、`open-pack/route.ts:112`、`register-rotor/route.ts:29`；無 `web/middleware.ts`。
- **建議修法**：勿信最左 XFF。Vercel 上用平台提供的可信 client IP（取最右 XFF 或 `request.ip`）。更佳：privileged 路由改以**已驗證錢包地址**（簽名綁定、不可偽造）+ 全域上限做 rate limit。
- **Confidence**：high　**降級理由**：high→medium，因 faucet/claim-starter 另有永久 per-address `kvSetNX` 鎖、open-pack 另有鏈上付款 digest（單次使用）——IP 繞過不會倍增 per-wallet 配額；唯 `register-rotor` 無 per-address 去重，是真正殘留向量（每錢包無限免費鑄 Bey + 燒 admin gas）。

### M-RT-5 — 錢包簽章無 route/action/nonce 綁定：一個被擷取的簽名可在 5 分鐘窗內重放於每一條 gated 路由（跨路由提權）
- **Category**：Authentication / Replay（Broken Authentication）　**Tag**：NEW（C-2 殘留弱點，僅在程式註解中半承認）
- **攻擊情境**：攻擊者擷取受害者 V 為某低價值動作（如 chat POST）產生的單一 `{address, authMessage, authSignature}`（經惡意瀏覽器擴充、共用裝置、XSS 或非 TLS 擷取）。因 authMessage 僅含 `address`+`ts`、不含 route/action/參數/nonce，且 `verifyAuth` 不帶情境，攻擊者在 5 分鐘內把同一三元組重放到任何其他 gated 路由作為 V：submit-result（寫鏈上 battle_record 命名 V）、friends（以 V 接受/移除/邀請）、community、register-rotor、battle-room 等。每條路由都從 body 欄位取行為者（`body.me`/`body.from`/`submitter`/`creator`）並餵給同一 `verifyAuth`。`useCachedAuthSig`（`use-auth-sig.ts:35-49`）把一個簽名快取 4 分鐘並跨 social 路由重用，刻意擴大外洩窗。
- **證據**：`auth-verify.ts:13-15`、`:48`（唯一防重放是 5 分鐘窗）、`:52-58`；同一 `verifyAuth` 重用於 `submit-result:40`、`friends:50`、`chat:49`、`battle-room:62`、`community:93`、`create-profile:39`、`faucet:37`、`claim-starter:35`、`register-rotor:38`；`use-auth-sig.ts:35-47`。
- **建議修法**：每個簽名綁定其 action 並一次性化：簽署訊息含 route/action 名 + 伺服器發放（或客戶端隨機、伺服器存一次）的 nonce；伺服器拒絕 action 行不符的請求，並以 `kvSetNX` 原子消費 nonce。縮短 `MAX_AGE_MS`（如 60s），移除 `useCachedAuthSig` 的跨路由重用（至少以 action 為快取 key）。
- **Confidence**：high　**降級理由**：high→medium，需先取得受害者有效三元組（HTTPS 已大幅防護被動竊聽 → 前提為既有立足點如 XSS/裝置妥協），且最高價值後果（submit-result）仍有 submitter-是-參與者檢查；核心利刃是「低價值簽名事件可重用於高價值動作」的跨路由提權。

### M-RT-6 — zkLogin nonce 檢查既可選又由呼叫端自報：等同無防重放，被竊 Google id_token 可換取受害者 zkLogin 地址
- **Category**：Authentication / zkLogin JWT Verification（修法不完整）　**Tag**：BYPASS（H-11 修了簽名/aud/iss/exp，但 nonce 設計性失效）
- **攻擊情境**：H-11 宣稱 nonce 綁定。實則：(1) nonce **可選**——`zklogin-verify.ts:53` 僅 `if (expectedNonce && payload.nonce !== expectedNonce)`；(2)「expected」nonce 由**同一個不受信任的請求**提供——路由從 body 讀 `{idToken, nonce}`（`route.ts:12,16`），客戶端直接送 sessionStorage 的 nonce（`callback/page.tsx:36-43`）。伺服器從不獨立知道自己發過什麼 nonce。攻擊者取得受害者有效 id_token，把 `nonce` 設為 token 自身內嵌的 nonce claim，相等檢查必過。伺服器回傳 `{success:true, address, sub, email}` 為受害者的**真實 zkLogin 地址**（salt 由 `ZKLOGIN_SALT_SECRET` 決定性導出，`zklogin-verify.ts:17-23`）→ 應用層帳號接管。亦未斷言 `email_verified`（`:58`）。
- **證據**：`web/lib/zklogin-verify.ts:53`（nonce 可選）、`route.ts:12,16`、`callback/page.tsx:43`、`zklogin-verify.ts:58`（無條件取 email）；無伺服器端發放-nonce store（grep 確認，`auth-verify.ts:5-7` 自承延後）。
- **建議修法**：nonce 改為**伺服器權威且強制**：OAuth 啟動時伺服器端生成 nonce（或依 zkLogin 規範 commit 臨時鑰+亂數+maxEpoch 之 hash），以 session cookie 為 key 用 `kvSetNX` 儲存；verify 時從伺服器 store 查 expected nonce（**非 body**），要求等於 `payload.nonce` 並原子消費。並斷言 `payload.email_verified === true`。
- **Confidence**：high　**降級理由**：high→medium，前提需攻擊者持有對**本 app exact client_id**的存活 id_token（`audience:clientId` 於 `:45` 拒其他 RP；token 在 URL fragment 不送 Referer/伺服器 → 「referer 洩漏」「同 aud 惡意 RP」向量大多不成立，實際向量為 XSS/共用裝置）；影響為應用層 session 冒充，非鏈上接管（簽名仍需臨時鑰，僅存受害者 sessionStorage）。

### M-RT-7 — battle-room 結果可由單一參與者鏈上定案，無對手確認：玩家可自封勝者
- **Category**：Broken Access Control / Business Logic　**Tag**：BYPASS（H-10/H-12 修法的「自封勝者」維度未被涵蓋）
- **攻擊情境**：與 M-RT-1 同源，從房間角度看：`submit-result/route.ts` 只要 submitter 證明地址控制權且是兩參與者之一（`:40-44`），即用 admin 金鑰鏈上寫 `battle_record` 命名任意 `winner`（`:67-93`），不要求對手同意、不交叉比對房間 `confirmed` 狀態（鏈上寫路徑與 KV `confirm-result` 各自獨立）。且 KV `confirm-result` 不要求 `confirmer !== 結果提交者`（`battle-room/route.ts:141`），同一人可自提交自確認。
- **證據**：`web/app/api/submit-result/route.ts:42-44,47-49`（無對手同意、無讀 room.status）、`:67-93`（直接鏈上鑄）；`web/app/api/battle-room/route.ts:121-148`（submit/confirm 皆接受任一參與者，confirm 無 `confirmer !== submitter` 守衛）。
- **建議修法**：任何鏈上寫前要求源自受信任房間狀態的雙方確認：submit-result 載入房間、要求 `room.status==='confirmed'` 且結果與 room.result 相符、要求確認者為「非提交結果」的那位（在房間物件持久化「誰提交了結果」）。
- **Confidence**：high　**降級理由**：medium，偽造記錄為 cosmetic、無代幣/NFT/可轉移價值（`route.ts:83` 轉給 admin），戰鬥結算為鏈下、無鏈上 stake/prize 綁定此記錄；30/hr 節流。影響為以 admin AdminCap 造成的資料完整性/排行污染。

---

## Low 級發現（6，含 2 條 Info）

### L-RT-1 — M-6 仍開放（中→低面向）：per-address 去重與 rate limiting 在 Redis 未設時退回 per-instance 記憶體（serverless-unsafe）
- **Category**：Broken Access Control / Resource Exhaustion　**Tag**：既有未修（AUDIT M-6）　**Severity**：medium（同 H-RT-1 之放大面向；此處記錄其防禦縱深維度）
- **攻擊情境**：`kv.ts:8` 僅在 KV 變數存在時建 Redis，否則退記憶體 Map（`kv.ts:20`）。Vercel 各實例獨立記憶體 → `kvSetNX`（faucet/claim-starter/profile 守衛）與 `kvRateLimit` 不跨實例共享。M 個 warm 實例下，per-address claim 守衛失敗 M 次、per-IP limit 放行 M 倍。無啟動斷言 Redis 已配置 → 誤設的生產部署靜默以不安全模式運行。
- **證據**：`web/lib/kv.ts:5-11,20,76-78,104-107`；消費點 `faucet:48`、`claim-starter:38`、`open-pack:57`、`api-guard.ts:41`；無啟動斷言（無 middleware.ts/instrumentation.ts）。
- **建議修法**：生產 fail-closed——模組載入時 `if (NODE_ENV==='production' && !usingRedis) throw`。文件化 Redis 為生產硬依賴。此為 gas-drain rate-limit 與 faucet replay 防護實際成立的前置條件。
- **Confidence**：high

### L-RT-2 — 共謀/雙錢包刷取無上限的偽造鏈上勝場；無 per-pair / per-day 勝場或記錄上限
- **Category**：Business Logic / Anti-Abuse　**Tag**：NEW　**Severity**：low
- **攻擊情境**：攻擊者控制 A、B 兩錢包（或兩真人共謀）。迴圈：直接 spam submit-result（因其直接收 body 參數，房間流程可跳過），交替 winner=A / winner=B 灌兩帳號戰績。唯一節流是 `rateLimited(...,'submit-result',30,3600)`（per-IP，可 XFF 繞過），無 per-pair/per-winner/per-day 上限。
- **證據**：`web/app/api/submit-result/route.ts:30`（唯一 limiter、per-IP）；無 (playerA,playerB) pair 或 winner address 的 KV 計數；`battle-room.ts:94`（join 擋自打但 submit-result 忽略房間）。
- **建議修法**：submit-result 綁定 confirmed 房間後，再以排序後 (playerA,playerB) pair 與 winner address 為 key 加每日上限；rate limit 改以已驗證錢包地址；以 `kvSetNX(roomId)` 去重。
- **Confidence**：high　**降級理由**：medium→low，`battle_record::create` 僅鑄 cosmetic 物件（轉給 admin），無 SPARK/代幣獎勵綁定勝場；影響為排行/戰績污染 + 輕微 griefing（admin 每筆付 gas）。

### L-RT-3 — per-IP rate limit 以可偽造的 X-Forwarded-For 首跳為 key（與 M-RT-4 同根，社交路由面向）
- **Category**：Rate Limiting Bypass　**Tag**：NEW　**Severity**：low
- **攻擊情境**：`clientIp()` 取首個 XFF token（`api-guard.ts:24-28`）。攻擊者每請求輪換隨機 `X-Forwarded-For` → 每請求落入新 bucket，使 faucet/claim-starter/submit-result/open-pack/chat 等的 per-IP 限額失效。
- **證據**：`web/lib/api-guard.ts:25-26`。
- **建議修法**：勿信最左 XFF（用平台可信 client IP / 最右可信跳）；privileged 路由改以已驗證錢包地址 + 全域上限。
- **Confidence**：high　**降級理由**：low，高價值 admin-花費路由另有簽名/付款綁定主控（faucet 永久 per-address 鎖、open-pack 鏈上付款）；真正殘留影響在無守衛的社交路由（chat/friends/community/battle-room）之 spam / KV 寫放大。

### L-RT-4 — friends `request` 允許任一已驗證用戶向任意目標的 pending-request set 寫入未經請求的條目（KV 寫放大 / 騷擾）
- **Category**：Broken Access Control / Spam　**Tag**：NEW　**Severity**：low
- **攻擊情境**：`request` action 的 actor 綁 `body.from`（`friends/route.ts:49-53`），然後對任意通過 `ADDR_RE` 的 `to` 執行 `kvSAdd(reqKey(to), from)`（`:56-70`）。簽名僅證明攻擊者控制 `from`；無 per-target 數量/速率限制。攻擊者（或自有地址殭屍網）把自己寫入數千受害者的 `friend_req:<victim>` set；GET（`:28-33`）無上限回傳整個 set，劣化 UX 並膨脹 KV 儲存/出口成本。per-IP 限額（60/hr）為唯一煞車且可被 XFF 繞過。
- **證據**：`web/app/api/friends/route.ts:56-70`、`:28-33`。
- **建議修法**：限制每用戶 incoming request set 大小（超出拒絕/截斷）；以 sender 地址（非僅 IP）做 rate limit；GET 回應加上限。
- **Confidence**：high

### L-RT-5 — Gas-coin equivocation DoS：並發 admin tx 共用自動選取的 gas coin，可能鎖死熱錢包至 epoch 結束
- **Category**：Denial of Service / Infrastructure　**Tag**：NEW（C-1 之 liveness 子情境）　**Severity**：low
- **攻擊情境**：所有 admin 路由皆 `tx.build({client})` 而**從不** `setGasPayment()`（repo-wide grep 確認無 gas 設定）；SDK 自單一 admin 地址自動選 gas coin。並發請求下兩筆 tx 可能選到同一 coin object，先到者鎖定 → 其餘以 object-locked 拒絕。理論上若 validator quorum 在同一 version 分裂於兩筆有效簽名 tx，owned object 可被鎖至 epoch 結束（testnet ~24h），癱瘓全部 admin 寫路徑。
- **證據**：`faucet/route.ts:61-77`、`open-pack/route.ts:147-165`、`register-rotor/route.ts:50-72`、`submit-result/route.ts:64-86`、`create-profile/route.ts:49-62`、`claim-starter/route.ts:51-66,76-83,99-105`；grep 無 `setGasPayment/setGasBudget/gasCoin`。
- **建議修法**：所有 admin 簽名走單一 single-flight 佇列（每簽名者同時僅 1 筆在途）；或維護 distinct gas coin pool，以 mutex/lease 為每個並發請求指派一枚 `tx.setGasPayment([...])`。設明確 `tx.setGasBudget()`。加 object-locked 重試。長期由 C-1（多簽名鑰/KMS）一併解決。
- **Confidence**：medium　**降級理由**：high→low，常見失敗模式其實是「version 過期」transient 錯誤（下次請求即可重用），真正 epoch 級鎖死需亞秒共識窗內 quorum 分裂（機率性）；per-IP 限額亦約束突發；與已開放的 C-1「抽乾 gas 錢包」高度重疊。

### L-RT-6 — L-4 回歸：四條路由在 `result.error` 分支直接回傳原始 Sui RPC 執行錯誤字串，繞過 `safeError`，洩漏 admin 地址 / object IDs / abort codes
- **Category**：Information Disclosure　**Tag**：NEW（L-4 remediation 不一致套用）　**Severity**：low
- **攻擊情境**：L-4 引入 `safeError()`（`api-guard.ts:48-53`）以遮蔽 SDK/RPC 細節。但四路由在 `result.error` 分支直接回傳原始字串：`submit-result:95-97`、`register-rotor:81-83`、`open-pack:174-176`、`create-profile:71-73`。攻擊者以會在執行期失敗的輸入（如 submit-result 帶不存在的 rotor ID）讀取逐字 JSON-RPC 錯誤，其中常含簽名者（admin）地址、相關 object IDs、鎖/version 狀態。`faucet:86-88` 為對照——同分支正確回傳通用訊息（證明修法已存在但套用不一致）。
- **證據**：`submit-result/route.ts:95-97`、`register-rotor/route.ts:81-83`、`open-pack/route.ts:174-176`、`create-profile/route.ts:71-73`；對照 `faucet/route.ts:86-88`、`api-guard.ts:48-53`。
- **建議修法**：四路由把 `return NextResponse.json({error: result.error.message},{status:500})` 改為 `return safeError(result.error, "<route> failed")`；並把 `Transaction failed: ${status}` 分支也通用化。
- **Confidence**：high　**附註**：object IDs 本就硬寫於 client-shipped 原始碼，增量洩漏主要是 admin 地址 + 即時鎖/version 狀態，故 low。

### Info-RT-1 — GameConfig ban 強制不完整：forge / tournament / spirit / battle_record / spirit::activate 皆可被 banned 地址觸及（M-1 僅覆蓋 register_rotor + open_pack）
- **Category**：authorization / ban-evasion　**Tag**：NEW（M-1 不完整 + 修正 AUDIT 一處錯誤理由）　**Severity**：info（防禦縱深缺口；現況近零可利用）
- **攻擊情境**：M-1 僅在 `pack.move:44`、`register.move:34` 檢查 `is_banned`。其餘經濟/資產入口全缺：`forge::*`、`tournament::*`、`spirit::mint`（AdminCap-gated 但不查 recipient ban）、`spirit::activate`、`battle_record::create` 皆無 ban 檢查。
- **證據**：`forge.move`（無 admin/GameConfig import）、`tournament.move:2-5`（無 admin import）、`spirit.move:53-66`、`battle_record.move:48-84`；對照 `pack.move:44`、`register.move:34`。
- **修正（重要）**：AUDIT.md:50 稱「forge 為 admin-relayed，ctx.sender() 恆為 admin」**事實錯誤**——`useForge.ts` 以玩家錢包簽 forge tx。但 forge 本就因 TreasuryCap 為**死碼**（見 GAP 報告），tournament/spirit 在 web 完全未接線，battle_record 僅鑄 cosmetic 記錄 → 實際可利用面近零。
- **建議修法**：把 `&GameConfig` 串入各資產授予入口並斷言 `!is_banned(...)`（forge 對 ctx.sender()、spirit::mint 對 recipient、battle_record::create 對 player_a/b、tournament::register 對 ctx.sender()）。並更正 AUDIT.md:50 的錯誤理由。
- **Confidence**：high

### Info-RT-2 — `spirit::activate` 完全公開且無門檻 → soulbound avatar 的 activation-count 可被無限免費灌水；`advance_round` winners 子集檢查未去重/未要求收斂
- **Category**：authorization / state-integrity；economic-integrity / tournament-logic　**Tag**：NEW　**Severity**：info
- **攻擊情境（activate）**：`spirit.move:93-99 activate(avatar: &mut SpiritAvatar)` 無 AdminCap、無 ban 檢查、無計數上限；任一 avatar owner 可迴圈遞增 `activated_count`。目前無任何鏈上/鏈下消費者讀此計數（grep 確認），故僅自燒 gas + log 噪音；若未來有獎勵/排名讀它則成免費自灌。
- **攻擊情境（advance_round）**：`tournament.move:170-176` 以 `vector::contains` 逐元素檢查，允許重複（`advance_round([A,A])` 在前輪 `[A,B]` 時通過），且用 `<=` 不要求嚴格收斂 → organizer 可無限 `advance_round([A,B])` 永不收斂至單一冠軍。因 organizer 為受信任 bracket 仲裁者、每個 winner 經歸納皆回溯至已註冊玩家，**不破壞獎池守恆**（M-1/C-3 的真正修復成立）；影響限於事件日誌完整性與 organizer 自我癱瘓。
- **證據**：`contracts/sources/spirit.move:93-99`（對照 `:53` mint 為 AdminCap-gated）；`contracts/sources/tournament.move:170-176`。
- **建議修法**：若 `activated_count` 供遊戲邏輯消費，把 `activate()` 綁 capability 或 per-battle/turn 情境；否則文件化其為不可信 cosmetic state 並確保無獎勵路徑讀它。advance_round 加重複檢查與嚴格收斂（`assert!(w_len < prev_len)`，單人終局例外）。
- **Confidence**：high

---

## 第 0 階段：立即止血（Critical / High 排序行動清單）

> 無 Critical 項。以下為 High 級的最小止血順序（testnet 現況；mainnet 真值上線前必須全數完成）：

1. **強制 `usingRedis` fail-fast（H-RT-1、L-RT-1）**：在 faucet / claim-starter / open-pack / register-rotor 加 `if (!usingRedis) return 503`；並讓 `kv.ts` 於 `NODE_ENV==='production' && 缺 KV 變數`時啟動即拋錯。這是其餘所有去重/限速/防重放成立的前置條件。
2. **修補 `player_profile::record_battle_result`（H-RT-4）**：改 `public(package)` 或加 `&AdminCap` 首參，只從受信任結算流程呼叫；在修復前，排行榜應停止信任 `ProfileUpdated.elo` 或改以 committed battle_record 推導。
3. **遏止 admin 金鑰耗盡（H-RT-2）**：新增全域 admin 花費預算（每小時 SUI gas + SPARK 鑄造上限，存 Redis，超出硬停），與 per-address 去重解耦；faucet/starter 資格改綁「鑄造成本高」之證明（最低 SUI 餘額 / zkLogin 身分）；register-rotor 補 per-address 去重；rate limit 改跨實例 + per-wallet 維度。
4. **拆分並下放 admin 金鑰（H-RT-3）**：遷至 KMS/HSM-backed signer；分離低價值 minter 鑰與只持 AdminCap 的 recorder 鑰；加鏈上鑄造上限 / 全域 `MAX_SUPPLY` 與時間鎖提領；建立輪替 runbook，疑似外洩即輪替（含目前明文存於開發機的 M-8 金鑰）。

> 後續（High 修復後）優先處理 Medium 群的根因：把 submit-result 綁定到「受信任房間狀態 + 雙方各自簽署確認 + 一次性 nonce」（一次解決 M-RT-1/2/3/5/7），並修正 XFF 正規化（M-RT-4）與 zkLogin 伺服器權威 nonce（M-RT-6）。
