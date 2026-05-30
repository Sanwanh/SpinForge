# SpinForge 安全審計最終報告

> 方法:6 維度並行審計(合約存取控制 / 合約經濟合理性 / 合約算術安全 / API 安全 / 機密與基建 / 認證與訪客)→ 每個發現由 3 位獨立懷疑者以不同視角(可利用性 / 程式碼真實性 / 嚴重度)交叉驗證 → 僅 ≥2/3 票確認者列入。
> 規模:139 個代理,44 個原始發現 → **41 個確認、3 個剔除為誤報**。所有確認項皆對照實際原始碼逐行核對。

---

## 修復狀態(2026-05-29 更新)

新硬化套件已全新發布上鏈。**最新套件(2026-05-31,含 H-4 / M-1 修復):`0x0d072582b7058f0bc709462add402df73a36b8371ef3628840397a743ee2c377`**(testnet)。前端/Vercel 已切換,合約測試 180 passed,`register_rotor` 新簽章鏈上實測成功。舊 testnet 資料已隨全新發布重置。

| 發現 | 狀態 | 說明 |
|---|---|---|
| **C-2** 身分冒用 | ✅ 已修+上線 | 6 路由要求錢包簽名驗證;curl 實測 401/合法 200 |
| **C-3** tournament 守恆 | ✅ 已修+上鏈 | Balance 託管 + distributed 旗標 + organizer 檢查 |
| **H-1** spirit::mint 公開 | ✅ 已修+上鏈 | 改為 `&AdminCap` 閘門 |
| **H-2** 無上限鑄幣 | ✅ 已修+上鏈 | 單筆上限;鏈上實測超限 abort |
| **H-3** record_*/add_xp 自刷 | ✅ 已修+上鏈 | 改 `public(package)`,PTB 無法呼叫 |
| **H-4** battle_record 偽造 | ✅ 已修+上鏈 | `create` 改 `&AdminCap` 閘門——僅後端可鑄紀錄(後端已驗參與者+驗簽),任意玩家無法在自有 PTB 偽造;+ confirm→commit 負向/正向測試 |
| **H-5~H-8** 免費刷取 | ✅ 已修+上線 | 移除 open-pack 免付款分支(實測 402);⚠️ faucet 一址一領仍為內存(需 Redis,task #21) |
| **H-9** 匿名鑄陀螺 | ✅ 已修+上線 | register-rotor 需驗簽(401) |
| **H-10** 偽造戰績 | ✅ 已修+上線 | submit-result 需參與者驗簽 + winner/scores 驗證 |
| **H-11/M-9** zkLogin 假驗證 | ✅ 程式碼已修+上線 | 移除偽造地址;伺服器 Google JWKS 驗 JWT + 真實地址推導;secrets 改 sessionStorage。**啟用真正登入只差你提供 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `ZKLOGIN_SALT_SECRET`** |
| **M-3** advance_round | ✅ 已修+上鏈 | winners 子集驗證 + 負向測試 |
| **M-4** 無 CORS/速率限制 | ✅ 已修+上線 | 同源檢查 + per-IP 速率限制(全 admin + 社交路由);跨實例需 Redis 才完全可靠 |
| **H-12/M-5** friends/chat/battle-room 冒充 | ✅ 已修+上線 | 全部要求 actor 錢包簽名(cached sig 免每次彈窗)+ 參與者檢查;room id 改 crypto;curl 實測 401/403,讀取仍可用 |
| **L-1/L-3** deck 越界 / 溢付 | ✅ 已修+上鏈 | + 負向測試 |
| **L-4/L-5** 錯誤洩漏 / 無界輸入 | ✅ 已修+上線 | 統一淨化 + 邊界驗證 |
| **C-1/M-8** 單一熱鑰 | ⏳ 待辦 | 需金鑰輪替 / KMS / multisig(運營決策) |
| **M-1** GameConfig 裝飾 | ✅ 已修+上鏈 | 封禁已生效於 `register_rotor`(檢查 recipient)與 `open_pack`(檢查 recipient + 零件直接鑄給玩家);因 SPARK TreasuryCap 為 admin 所有、相關鑄造皆 admin 代簽,故以「玩家位址參數」而非 `ctx.sender()` 強制;`register_rotor` 鏈上實測 + 負向測試 |
| **L-2** marketplace | ⏸️ 刻意延後 | marketplace 完全未接 web;為零用戶功能建版稅強制違反 YAGNI,且版稅率/收款人屬產品決策。待接上 web 時再做 |

合約測試:**180 passed**(新增 H-4 紀錄建立/確認 + M-1 封禁正向/負向測試)。其餘待辦見下方路線圖。

**合併前審查(多代理 + 對抗式驗證 + 線上 A/B,A/B 10/10 通過)額外修復:**
- **[HIGH] open-pack 付款防重放 TOCTOU**:`verifyPayment` 原為非原子 `kvGet`→`kvSet`(中間隔 0–3.2s RPC),並發同 digest 可雙鑄。改用原子 `kvSetNX` 佔位 + 失敗 `kvDel` 釋放;並發實測一個佔位、另一個被擋。
- **[low] kvRateLimit TTL**:INCR 後若 EXPIRE 漏設會永久鎖 IP,補上 TTL 重設防護。
- **[medium] zkLogin 舊 localStorage 回退**:`getStoredSession` 改為清除而非載入殘留偽造 session。
- **[info] i18n 孤兒鍵**:移除 `featureGroup1/2/3`。
- **bey `record_*` dead code**:刻意保留(改 `public(package)` 後無 in-package 呼叫者,屬安全姿態)。

---

## 第二輪修復(2026-05-31,H-4 / M-1 全新發布)

新套件:`0x0d072582b7058f0bc709462add402df73a36b8371ef3628840397a743ee2c377`。AdminCap `0xa295…5916`、GameConfig `0x3b37…d238`、SPARK Treasury `0x026b…4980`、FORGE Treasury `0x2ceb…7406`、TransferPolicy `0x60f7…9b63`。

- **[H-4] battle_record::create 加 `&AdminCap` 閘門**:原 `public` 任何人可在自有 PTB 鑄出宣稱擊敗任意對手的紀錄。現僅後端(持 AdminCap)可建,而後端在 `submit-result` 已驗提交者為參與者 + 錢包簽名。`submit-result` route 補上 AdminCap 物件參數。
- **[M-1] GameConfig 封禁生效**:`register_rotor` 加 `&GameConfig` 並 `assert!(!is_banned(config, recipient))`;`open_pack` 同樣以 `recipient` 參數檢查並**直接把零件鑄給玩家**(移除 admin→player 轉發交易)。
  - **架構裁決**:SPARK `TreasuryCap` 為 admin 所有 ⇒ `open_pack` / `forge::*` 只能 admin 代簽 ⇒ 鏈上 `ctx.sender()` 永遠是 admin,對它做封禁檢查無效。故對 admin 代簽且帶玩家位址的入口(register / pack)以**位址參數**強制;`forge::*` 的 `ctx.sender()` 閘門因此**刻意不加**(無效且為死碼churn)。
- **驗證**:`sui move test` 180 passed;`register_rotor` 新簽章以 admin 金鑰鏈上 `sui client call` 實測 `Status: Success`;web build ✓ Compiled、生產部署成功。
- **附帶發現(超出審計範圍,未修)**:`forge::*`(evolve/fuse/retune)在 web 為玩家錢包簽署,卻引用 admin 所有的 SPARK `TreasuryCap` ⇒ 玩家簽的交易無法存取該 owned object ⇒ **forge 目前功能性失效**。屬既有功能 bug,非安全項;修法需把 TreasuryCap 移入受權限的共享 minter(同 C-1/H-2 建議)。
- **L-2 marketplace**:刻意延後(未接 web;版稅為產品決策,建造未用基建違反 YAGNI)。

---

## 1. 總體結論

> 註:以下為**原始審計當下**的結論(修復前快照)。目前的修復進度見頂部「修復狀態」表——多數 Critical/High 已修並上鏈/上線。

**結論(原始):目前狀態下不可上線(無論公開測試網大規模開放或主網)。** 本系統在「鏈上合約授權」與「後端身分驗證」兩個維度同時存在系統性破口,而非孤立缺陷。最致命的根因是:六個後端 API 路由全部用同一把熱錢包私鑰(`ADMIN_PRIVATE_KEY`,同時持有 SPARK `TreasuryCap` 與 `AdminCap`)代簽交易,且**完全以 client 請求 body 裡的 `address` 字串當作身分**——沒有任何簽名挑戰、session、CSRF 或 origin 檢查。任何人用一行 `curl` 即可:替任意地址鑄造 SPARK、用 `AdminCap` 無限鑄造 Bey 轉子、偽造任意對戰結果上鏈。防重放/防重領的去重機制在 faucet / claim-starter 用的是**進程內存 `Set`**,在 Vercel serverless 多實例與冷啟動下形同虛設,等於無限免費 SPARK + 免費卡包。鏈上層面 `spirit::mint`、`bey::record_*` 為完全公開無權限,任何玩家可自鑄傳說魂獸、自刷戰績;`tournament::distribute_prizes` 取不可變引用、可重複呼叫且鑄新幣發獎(而報名費卻被燒毀),代幣經濟的「收支守恆」根本不成立。整體風險姿態為**嚴重(Critical)**:這是一個功能可玩的 demo,但其信任模型把「全部權力集中在一把可被任意未驗證請求驅動的熱鑰」上,任一環節被觸發即等同整個遊戲經濟與資產系統被攻陷。

## 2. 嚴重度統計(僅統計 CONFIRMED,共 41 項)

| 嚴重度 | 數量 |
|--------|------|
| Critical | 3 |
| High | 15 |
| Medium | 9 |
| Low | 6 |
| Info | 8 |
| **合計** | **41** |

Critical 三項:單一熱鑰集權(secrets-infra)、伺服器信任 client 提供之 `address` 為身分(auth-session)、tournament 設計裁決下的鑄幣/發獎守恆破裂(經濟,以 critical 計於 distribute_prizes 條目)。

---

## 3. 詳細發現(依嚴重度分組)

### 🔴 Critical

#### C-1 單一熱錢包私鑰同時持有 TreasuryCap + AdminCap + Gas,無輪替、無花費上限、無職責分離
- **檔案:行** `web/app/api/{faucet,claim-starter,open-pack,register-rotor,create-profile,submit-result}/route.ts`;`contracts/sources/spark_token.move:31,36-54`
- **問題** 六個路由皆載入同一 `process.env.ADMIN_PRIVATE_KEY` 當唯一簽名者。`spark_token::mint/mint_coin/burn` 僅以「持有 `TreasuryCap` 物件」為授權,而 init(spark_token.move:31)把 cap `public_transfer` 給發布者,亦即此 cap 是該熱鑰擁有的 owned object;同一鑰又持有 `AdminCap`(register-rotor:8 硬編 `0x6aa381…`)。無任何鏈上每筆/每期鑄造上限。
- **攻擊情境** 取得該私鑰者(Vercel env 外洩、開發機 `web/.env.local` 明文、任何 route RCE)即可匯入 Sui SDK,呼叫 `spark_token::mint(cap, u64::MAX, attacker)` 無限鑄幣、用 `AdminCap` 無限鑄轉子、掃空 gas 錢包並偽造戰績。單鑰陷落 = 整個遊戲經濟全毀,且無第二簽名或輪替路徑可復原。
- **修復建議** 職責分離:低餘額 gas 中繼鑰、把 `TreasuryCap` 封進 `AdminCap` 管控的「有上限 minter」共享物件(在 Move 內 enforce `MAX_SUPPLY` 與每期上限)、用 KMS/Secret Manager 而非裸 env。主網改用 Sui multisig 控管 mint/admin 權。對熱鑰加每日鑄造/花費上限與異常告警。

#### C-2 伺服器代簽路由把 client 請求中的 `address` 直接當身分,完全可冒充
- **檔案:行** create-profile:20-44、register-rotor:20-54、submit-result:22-53、claim-starter:24-49/86-91、faucet:20-54、open-pack:95-127(全部已逐行確認)
- **問題** 每個路由從 JSON body 讀 `address`(或 `playerA/playerB/winner`)後立即用熱鑰建並簽 Sui 交易,**無簽名驗證、無 zkLogin proof、無 session cookie、無 CSRF、無 origin 檢查**(已確認 `web/` 無 `middleware.ts`)。
- **攻擊情境**
  1. `POST /api/create-profile {address: VICTIM, displayName:'pwned'}` → 違反受害者意願鑄 Profile / 洗版。
  2. `POST /api/register-rotor {address: ATTACKER, bladeName:'X'}` 迴圈 → `AdminCap` 免費無限鑄 Bey。
  3. `POST /api/submit-result {playerA:VICTIM, playerB:ATTACKER, winner:ATTACKER, scoreA:0, scoreB:7}` → 偽造任意人對任意人的上鏈戰績。
- **修復建議** 每個 mutating 路由要求對「宣稱地址」的密碼學控制證明:client 用錢包簽署伺服器發的一次性 nonce,伺服器端驗簽後才代簽。submit-result 額外需從受信任的 room state 推導參與者與勝者,並比照鏈上 `confirm()` 雙方各自簽署。**絕不接受裸 `address` 欄位作為身分。**

#### C-3 tournament::distribute_prizes 取不可變引用、可無限重呼、鑄新幣發獎(報名費卻已燒毀)
- **檔案:行** `contracts/sources/tournament.move:176-194`(發獎)、`:113-116`(報名燒費)
- **問題** `distribute_prizes(tournament: &Tournament, …)` 以不可變借用,呼叫 `spark_token::mint(cap, tournament.prize_pool, champion)`,**從不**將 tournament 標記為已發放、也不歸零 `prize_pool`;唯一守衛只有 `state == STATE_COMPLETE`。又 `register()`(:116)把報名費 `coin::burn` 銷毀卻同時累加進 `prize_pool`——進來的 SPARK 被燒、發出的獎是新鑄,守恆破裂且可重複領取造成無上限通膨。`distribute_prizes` 亦無 organizer/AdminCap 呼叫者限制。
- **攻擊情境** 任一錦標賽達 COMPLETE 後,能引用 `TreasuryCap` 者重複呼叫 `distribute_prizes`,每次鑄 `P` 枚 SPARK 給冠軍;N 次即鑄 `N*P`,遠超實收(且已燒掉)的報名費。配合 `advance_round` 無驗證(見 M-3),organizer 可指定自己為冠軍再鑄整池。
- **修復建議** 改 `&mut Tournament`,加 `distributed: bool`(首呼 `assert!(!distributed)` 後設 true)並歸零 `prize_pool`;停止在 `register()` 燒費,改以 `Balance<SPARK_TOKEN>` 託管,從託管支付而非鑄新幣;對 `distribute_prizes` 加 organizer/AdminCap 檢查。

> 透明度說明:三位獨立複核者對此條目的 severity 給出 low/medium/low,主審判斷上調為 critical——根因(可重複呼叫 + 鑄新幣 + 無守恆)在「合約是否合理」維度被三票一致認定為使代幣經濟「尚不健全」,且 secrets-infra 維度的 critical 正是同一把 cap 可達此路徑。

---

### 🟠 High(15 項,合併同源條目陳述)

#### H-1 spirit::mint 完全公開且免費 — 任何人可無限鑄傳說魂魄 Koryu(靈魂綁定)
- **檔案:行** `contracts/sources/spirit.move:50-84`
- **問題** 唯一驗證為 `beast<=4`、`tier<=3`、`beast==4` 需 `tier==3`。任何外部呼叫者可 `spirit::mint(4,3,attacker)` 免費鑄最稀有的傳說神龍。`activate()`(:89)同樣公開無門檻。對照組:blade/ratchet/bit::mint 已收緊為 `public(package)`,獨 spirit 全開。
- **修復建議** 為 mint 加 `&AdminCap` 第一參數,或改 `public(package)` 僅由付費/燒幣的鏈上發行路徑呼叫;`activate()` 限定持有者。

#### H-2 spark_token / forge_token 的 mint / mint_coin 為無上限公開函式,無供應上限
- **檔案:行** `contracts/sources/spark_token.move:36-54`;`forge_token.move:36-53`
- **問題** `mint/mint_coin` 取 `&mut TreasuryCap` 與任意 `amount: u64`,無 MAX_SUPPLY、無每筆上限、無速率限制;唯一保護是持有 cap。
- **修復建議** 將 `TreasuryCap` 包進追蹤 `total_minted` 並 enforce `MAX_SUPPLY` 的共享 `SparkMinter`,僅暴露有上限/受權限的入口;移除裸 `mint_coin` 或降為 `public(package)`。

#### H-3 bey 戰績與 ratchet/bit XP 為公開可自報 — 排行榜/數值造假
- **檔案:行** `bey.move:79-93`(`record_win/loss/xtreme_finish/burst_finish` 皆 `public`);`ratchet.move:76 add_xp` 為 `public`;`bit.move:83 add_xp` 為 `public`(對照 `blade.move:99` 為 `public(package)`)
- **問題** Bey 擁有者可對自己的 Bey 無限呼叫 `record_win` 灌數值,不需任何對戰或 AdminCap。**校正:`bit::add_xp` 實際也是 `public`,故 ratchet 與 bit 皆為可見性破口,僅 blade 已收緊。**
- **修復建議** 四個 `record_*` 改 `public(package)`,僅由受 `AdminCap` 控管的戰鬥結算流程呼叫;`ratchet::add_xp`、`bit::add_xp` 一併改 `public(package)`。

#### H-4 battle_record::create 公開、無參與者綁定 — 可偽造任意贏家的戰績
- **檔案:行** `contracts/sources/battle_record.move:43-78`
- **問題** `create()` 為 `public`,所有欄位自由參數,**無 `ctx.sender()` 為參與者之斷言**,也不連結已驗證的 Match。任何人可鑄出宣稱自己擊敗任意對手的 BattleRecord 並發事件。`confirm()`(:80-113)確有正確雙方確認門檻(僅 `committed` 才可信),但物件與事件已先存在,未檢查 `is_committed()` 的索引器會被誤導。
- **修復建議** `create()` 要求 `ctx.sender()` 為參與者之一,並由已驗證的共享 Match 推導 winner/scores;鏈下消費者僅信任 `is_committed()==true`。

#### H-5 ~ H-8 後端 faucet / claim-starter 去重為進程內存 Set(serverless 失效)+ open-pack 無付費分支
- **檔案:行** `faucet/route.ts:9,32-34,78`;`claim-starter/route.ts:13,28-30,100`;`open-pack/route.ts:117-127,132-186`;`lib/kv.ts:13-20`
- **問題**
  - faucet/claim-starter 僅以模組層 `const claimed = new Set<string>()` 去重(未 import kv)。Vercel 每個冷啟動/併發實例各有空 Set,同地址跨實例即可重領;換新地址更直接繞過。每次 faucet 鑄 500 SPARK;claim-starter 另鑄 500 SPARK + 開免費卡包。
  - open-pack 的「gas-free」分支(:117-127)在無 `paymentDigest` 時**只 `suix_getBalance` 檢查餘額 ≥ PACK_COST,從不扣款/燒幣**,接著照樣鑄 5 個零件。持有 ≥100 SPARK 一次即可永久免費開包。(對照:錢包分支 :111-116 透過 `verifyPayment` 正確驗付款 digest 並用 kv 防重放——正確範式存在卻未套用到 gas-free 分支與 faucet/claim。)
- **攻擊情境** 迴圈 `POST /api/faucet {address}` 無限鑄 500 SPARK;再以 ≥100 SPARK 餘額迴圈 `POST /api/open-pack {address}`(不帶 digest)無限免費鑄零件,並耗盡 admin gas。
- **修復建議** faucet/claim 改用 kv 的 set-if-absent(`SETNX` 語意)+ 每 IP 速率限制 + 地址控制證明;移除 open-pack 的無付費分支,或要求其同樣驗證真實燒幣/轉帳的 digest;理想上把「一地址一領」限制 enforce 到鏈上 registry 物件。

#### H-9 register-rotor 讓任意未驗證呼叫者用 AdminCap 鑄轉子到任意地址
- **檔案:行** `web/app/api/register-rotor/route.ts:20-55`
- **問題** 僅 `if(!address||!bladeName)`(:24)驗證,即用伺服器持有的 `AdminCap`(:43)簽 `register::register_rotor`。AdminCap 門檻因伺服器無條件出借而形同虛設。
- **修復建議** 要求驗證付款 digest 或地址簽名證明 + 持久化速率限制;不可把 AdminCap 代簽暴露給匿名呼叫者。

#### H-10 submit-result 寫入完全由攻擊者控制、admin 代簽的 BattleRecord,無參與者驗證
- **檔案:行** `web/app/api/submit-result/route.ts:20-53`
- **問題** 僅 `if(!playerA||!playerB||!rotorA||!rotorB||!winner)`(:24)驗證即代簽 `battle_record::create`(:38-51)。無「呼叫者為 playerA/B」檢查、無簽名、未連結 battle-room 狀態。
- **修復建議** 從 KV room state 驗證 submitter 為 `creator/opponent` 且 room 處於合法狀態,驗證 winner 為兩者之一、scores 有界,並速率限制。

#### H-11 zkLogin 回呼從不驗證 JWT 簽章 / nonce / aud / iss / exp — 可偽造 Google 登入
- **檔案:行** `web/app/auth/callback/page.tsx:29-53`;`web/lib/zklogin.ts:60-71`
- **問題** 回呼僅 `JSON.parse(atob(idToken.split('.')[1]))` 解 payload 取 `sub/email`(:29),**從不驗 RS256 簽章、aud、iss、exp,也不比對 nonce**;產出的 `address` 是捏造字串 `zklogin:${sub.slice(0,16)}`(:49),非真正 zkLogin 地址。
- **攻擊情境** 攻擊者構造 `header.<base64({"sub":"victim_sub"})>.sig` 導向 `/auth/callback#id_token=…`,app 即接受並視為已登入,無需 Google 往返或有效簽章。
- **修復建議** 伺服器端驗證 id_token:抓 Google JWKS 驗 RS256、斷言 `iss`/`aud`/`exp`/`nonce`;用 `jwtToAddress(jwt, salt)` 推導真實地址;改發 httpOnly session。

#### H-12 friends / chat / battle-room 動作僅憑 client 提供之 actor 地址授權
- **檔案:行** `friends/route.ts:34-115`、`chat/route.ts:33-55`、`battle-room/route.ts:44-131`
- **問題** 所有共享狀態 mutation 以 body 欄位(`from/me/creator/opponent/player`)識別身分,僅格式檢查無控制證明。battle-room `confirm-result`(:111-118)無任何身分檢查即翻 `confirmed`。room id 僅 8 字元 `Math.random().toString(36)`(:26)。
- **修復建議** 每個 actor 欄位綁定已驗證 session;battle-room 驗證 submitter/confirmer 為 creator/opponent 並要求雙方各自確認;room id 改 `crypto.randomUUID`。

---

### 🟡 Medium(9 項)

- **M-1 GameConfig 封禁名單與可調常數從未被任何玩法模組讀取(管理權純裝飾)** — `admin.move:62-133`。封禁無效,被封地址仍可建賽/開包/註冊;`WIN_SCORE=7` 等為硬編死配置。修:將 `&GameConfig` 串入玩法入口並 `assert!(!is_banned(...))`。
- **M-2 spark/forge mint/burn 僅靠熱鑰持有的 TreasuryCap 保護(鏈上正確,運營脆弱)** — `spark_token.move:36-63`。同 C-1,把 cap 移離熱簽鑰。
- **M-3 tournament::advance_round 接受任意未驗證 winners 清單** — `tournament.move:143-173`。organizer-gated 但不驗 winners 屬 players/上輪子集/非空。配合 C-3 可自鑄整池。
- **M-4 admin-signed 路由無 CORS / origin / auth** — 全路由,無 `middleware.ts`。修:per-IP/per-address 持久速率限制 + origin/CSRF + admin 每日上限告警。
- **M-5 battle-room mutation 無參與者驗證** — 同 H-12,以 medium 計。
- **M-6 in-memory KV fallback 靜默掩蓋 Redis 缺失,破壞防重放與房間狀態** — `kv.ts:5-20,36-52`;`.env.example` 漏列 KV 變數。若生產未配 KV,app 照常啟動但防重放僅存單實例內存。修:防重放敏感路由 fail-fast(`usingRedis` 為 false 即拒絕鑄造);把 KV 變數加入 `.env.example`。
- **M-7 submit-result 無認證/無結果驗證** — 同 H-10,以 medium 計。
- **M-8 實時 admin 私鑰以明文存於開發機 web/.env.local** — 雖正確 gitignore(從未提交),但明文躺在檔案系統,blast radius 同 C-1。**因同鑰複用為生產簽名者,本地外洩即生產淪陷。** 修:視同已外洩並輪替;生產用 KMS,本地用獨立低價值鑰。
- **M-9 zkLogin ephemeral 私鑰與完整 JWT 持久化於瀏覽器 storage** — `zklogin.ts:36-38,66-71`。XSS 可竊取簽名鑰與 id_token。修:ephemeral secret 不入持久 storage、改 httpOnly session、加嚴格 CSP。

---

### 🟢 Low(6 項)

- **L-1** battle.move `create_match`/`select_bey`:硬編長度 3 的 used 向量 vs 任意長度 deck → index 越界 abort(`battle.move:124-156,159-185`)。Match 為 owned object,僅自損。修:`create_match` 加 `assert!(length==3)`。
- **L-2** marketplace 無費用/版稅、僅支援 Blade、TransferPolicy 零規則(`marketplace.move:29-79`)。
- **L-3** pack/forge 燒掉整枚付款幣,溢付被靜默銷毀(`pack.move:36-37`)。修:`split` 精確 COST 燒之,餘額退回。
- **L-4** verbose 錯誤回應直接回傳原始 Sui SDK/RPC 錯誤,洩漏 admin 地址與內部 object id(`faucet/route.ts:86-89` 及全路由 catch)。
- **L-5** submit-result 接受任意 rotor id 與無界 scores 進上鏈紀錄(`submit-result/route.ts:22-53`)。
- **L-6** 歸於 L-1 owned-object 自損特性。

---

### ⓘ Info(8 項,確認為「正確/可接受」或設計裁決)

- **I-1 open_pack 隨機性使用正確**(`pack.move:30-139`)。私有 `entry fun` 消費 `&Random`,所有 abort 在 `random::new_generator` 之前,roll 用 `generate_*_in_range` 無模偏差。**無 test-and-abort 重抽向量。保持 entry,勿升 public。**
- **I-2 physics::compute_damage u64 乘法溢位** — 純 helper,grep 確認無任何鏈上 Move 呼叫者,無玩家可達 DoS。
- **I-3 resolve_turn 的 `am*5` 溢位受 AdminCap 控管**,非第三方可達。
- **I-4 bey::disassemble 的 dof remove 安全**;洩漏子物件的 delete 為 `#[test_only]`,不編入部署包。
- **I-5 physics 除法/減法表面安全** — 除數皆非零字面常數,減法皆在 `if (a>b)` 保護內。
- **I-6 伺服器 admin 私鑰確認未暴露給 client** — 僅在 server-only route 出現,從無 `NEXT_PUBLIC_` 前綴,未進 `'use client'` 元件。最壞的 client-leak 情境確認不存在。
- **I-7 經濟設計裁決(綜合)** — 見第 4 節。
- **I-8 open_pack 隨機性二次確認** — 與 I-1 同範圍。

---

## 4. 合約是否合理(智能合約設計與代幣經濟裁決)

**裁決:有條件的「否」(Not yet sound,需修正後才合理)。**

一個健全的遊戲代幣經濟需要三條鐵律:(1) 新增供應的水龍頭必須有界或受權限;(2) 收支守恆——sink(燒)與 source(鑄)不可被重複計算;(3) 稀缺性閘門——高階資產要有成本。

**做對的部分(實質肯定):**
- **燒幣 sink 正確**:pack(100 SPARK)、forge evolve/fuse/retune(50/200/75)、tournament register 皆 `coin::burn` 付款,是合法通縮 sink。
- **零件發行已收緊**:blade/ratchet/bit/stadium 的 `mint` 皆 `public(package)`,零件僅經「付費開包」或「AdminCap register_rotor」進入流通。
- **戰鬥/物理數學內部自洽**:`resolve_turn` 全用飽和減法防 underflow,type/wuxing 乘子為有界百分比。
- **隨機性正確**:open_pack 為 entry-only,杜絕 test-and-abort 重抽。

**不成立的部分(致命):**
- **代幣 source 端不健全**:`spark_token::mint/mint_coin` 為無上限公開鑄造,鏈上無全域天花板。
- **守恆破裂**:`tournament::distribute_prizes` 鑄新幣發獎而報名費被燒,且無雙領守衛、可無限重呼(C-3)。
- **稀缺性閘門缺失**:`spirit::mint` 完全公開免費;`bey::record_*`、`ratchet/bit::add_xp` 公開可自報數值。
- **管理權虛設**:GameConfig 封禁與調參從未被玩法讀取(M-1)。

**結論**:鏈上花費/燒幣經濟與零件發行修正是合理的骨架,但 mint/獎勵/託管端 + 公開的 spirit/stat mutator 使當前設計**尚不適合承載有真實價值的代幣**。修正優先序:(1) tournament 改 Balance 託管 + 單次發放旗標;(2) TreasuryCap 包進有上限/受權限 minter;(3) gate `spirit::mint` 與 `bey::record_*`/`add_xp`。完成後,既有的燒幣 sink 即可讓經濟自洽。

---

## 5. 上線路線圖(安全運營與正式上線)

### 第 0 階段 — 立即止血(任何公開開放前必做,對應 Critical/High)
1. **輪替已外洩的 admin 私鑰**,重發 TreasuryCap/AdminCap 至新地址(C-1、M-8)。
2. **為所有六個代簽路由加上身分驗證**:client 用錢包簽伺服器發的一次性 nonce,伺服器驗簽後才代簽(C-2、H-9、H-10)。在此之前**不可對外開放任何 mutating 端點**。
3. **gate `spirit::mint`**(加 `&AdminCap` 或改 `public(package)` + 付費路徑),gate `bey::record_*`、`ratchet::add_xp`、`bit::add_xp` 為 `public(package)`(H-1、H-3)。
4. **修 tournament**:`distribute_prizes` 改 `&mut` + `distributed` 旗標 + 歸零 pool;改 Balance 託管、停止燒報名費;`advance_round` 驗證 winners(C-3、M-3)。
5. **TreasuryCap 包進有上限 minter**,移除/降級裸 `mint_coin`(H-2、M-2)。
6. **faucet/claim 改 kv set-if-absent + open-pack 移除無付費分支**(H-5~H-8);**強制 `usingRedis`,KV 未配置即拒絕鑄造**(M-6)。
7. **zkLogin 改伺服器端驗證 JWT(JWKS/aud/iss/exp/nonce)並發 httpOnly session**(H-11、M-9)。

### 第 1 階段 — 盡快修正(公開測試網運營期間)
8. 全路由加 **per-IP / per-address 持久速率限制 + origin/CSRF 檢查**(M-4)。
9. battle-room/friends/chat 全部綁定已驗證 session(H-12);battle-room id 改 `crypto.randomUUID`。
10. 錯誤回應改通用訊息 + 伺服器端日誌(L-4)。
11. GameConfig 串入玩法入口並讓 setter 生效(M-1)。
12. pack/forge 改精確 split 找零(L-3);battle.move `create_match` 加 deck 長度斷言(L-1)。
13. submit-result 加 winner/scores/rotor 歸屬驗證(L-5)。

### 第 2 階段 — 基礎設施與運營(主網上線前)
14. **金鑰託管**:KMS/Secret Manager;職責分離(gas 中繼鑰 vs mint authority);主網用 **Sui multisig** 控管 mint/admin。
15. **鏈上供應上限**:在 Move 內 enforce `MAX_SUPPLY` 與每期鑄造上限。
16. **監控告警**:admin 每日鑄造/gas 花費上限與異常告警;faucet/領取速率儀表板。
17. **marketplace**:掛 TransferPolicy 版稅/手續費規則或明示僅 Blade(L-2)。
18. **第三方安全審計**:修完上述後,主網部署前進行外部 Move + Web 全棧審計。
19. **主網部署步驟**:重新部署合約至 mainnet → 用 multisig 接收 TreasuryCap/AdminCap → 切換前端 RPC/package id → 灰度開放(先白名單,監控鑄造/gas)→ 全量開放。

### 維持良好的部分(無需改動)
- open_pack 隨機性範式(保持 entry-only)、零件 `public(package)` 發行、physics 飽和減法數學、admin 私鑰未洩漏至 client bundle、`.env.local` 的 gitignore 紀律——這些是已做對的基石,後續迭代勿破壞。
