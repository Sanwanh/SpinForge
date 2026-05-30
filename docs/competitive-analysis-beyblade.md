# SpinForge vs. 官方 Beyblade 數位產品 — 競品分析與定位

> 用途:簡報 / 募資 / 官網定位的素材庫。日期:2026-05-31。
> 方法:對照當前(2024–2026)官方 Beyblade 數位產品的公開資料,逐維度比較 SpinForge 的設計。所有外部事實附來源於文末。

---

## TL;DR(一句話定位)

> **SpinForge 不是「又一款 Beyblade 遊戲」,而是「唯一讓玩家真正擁有零件與戰績、並能自由交易的鏈上陀螺對戰經濟」。**

官方產品在**玩法、打磨、品牌、通路**上全面領先;SpinForge 唯一、且真正不可替代的護城河是 **web3 的資產所有權與開放經濟**。最大威脅不是技術,而是**未授權使用 Beyblade X 名稱與機制的 IP 風險**。

---

## 1. 為什麼要做這份分析

確認三件事:
1. SpinForge 和官方產品**是否在同一條賽道競爭**(答:否)。
2. 我們的**真正差異化**在哪一層(答:所有權/經濟,而非玩法)。
3. 最大的**存活風險**是什麼(答:IP 侵權,非技術)。

---

## 2. 現在的官方 Beyblade 數位產品全景

| 產品 | 開發 / 發行 | 形態 | 商業模式 | 上線時間 |
|---|---|---|---|---|
| **Beyblade X App** | Hasbro(美版)/ Takara Tomy(日版) | 手機連動 + 對戰 App | 免費 + 選擇性 IAP | 持續更新;2024/10 加入 BATTLE LEAGUE 賽事 [5] |
| **Beyblade Burst App** | Hasbro | 前代連動 App | 免費 | 線上功能於 **2026/3** 移除,導向新 App [4] |
| **BEYBLADE X: EvoBattle** | FuRyu(Takara Tomy 授權) | 家機 / PC 買斷遊戲(Switch + Steam) | 買斷;實體版附贈實體陀螺 | 2025/11/13;Switch 2 版 2025/12/18 [1][2] |
| **BEYBLADE X: Xone** | 街機 → Switch 移植 | 家機 / 街機 | 買斷 | Switch 實體版 2025/12/12 [6] |

**共同點:全部官方授權、內容綁定帳號、無玩家間交易、無二級市場、不上鏈。**
- 連動 App 的「數位獎勵」只是帳號內升級點數;EvoBattle 的客製是收集素材改色 / 強化 / 選「X Skill」。[3][5]
- 官方核心黏著點是**實體↔數位**:掃描實體陀螺上的 QR(Bey Code)→ 變成 App 內數位收藏。[5]

---

## 3. SpinForge 是什麼(對照基準)

Sui Move 上的鏈上對戰卡牌遊戲:
- **零件 NFT**(Blade / Ratchet / Bit)→ 用 `dynamic_object_field` 組成 Bey,玩家真正持有。
- **鏈上物理**:角動量、爆裂值、Xtreme Dash 由 `sui::random` 上鏈計算;對戰用 commit-reveal。
- **雙代幣經濟**:$SPARK(遊玩)/ $FORGE(治理);卡包、熔煉 sink、Kiosk 市場、錦標賽代幣獎金。
- **四聖獸 / 五行**、靈魂綁定 Spirit Avatar;zkLogin 登入。

---

## 4. 核心差異(逐維度)

| 維度 | 官方 Beyblade 軟體 | SpinForge | 差異本質 |
|---|---|---|---|
| **所有權** | 帳號內授權內容,不可轉移,服務關停即消失 [4] | NFT 自託管,可賣可轉,獨立於發行方存續 | 🔑 **根本差異** |
| **經濟** | 無真實經濟;免費+IAP 或買斷;真正營收靠賣**實體玩具** | 可交易代幣經濟 + 玩家市場 + 鏈上獎金 | 商業模式根本不同 |
| **邏輯 / 物理位置** | 客戶端 / 伺服器,快、順、不可驗證 | 鏈上確定性物理 + 可驗證 RNG;可審計但受 gas/延遲限制 | 可驗證性 vs 流暢度 |
| **IP / 正當性** | 官方授權、品牌、動畫、玩具連動 | 未授權衍生,沿用 Beyblade X 名稱機制 | 🔑 **法律風險** |
| **實體連動** | 掃實體陀螺 QR → 數位分身(殺手鐧)[5] | 無實體連動 | 官方的護城河 |
| **通路 / 觸及** | App Store / Google Play / eShop / Steam,大眾 | Web dapp + 錢包;且 App 商店常拒 NFT 遊戲 | 觸及量級差距 |
| **受眾** | 兒童 / 家庭 / 收藏者 / 競技 Blader(真實社群) | web3 玩家 / 投機者;與核心 Beyblade 迷重疊度未知 | 市場不同 |

---

## 5. 玩法重疊:官方已經做了什麼

EvoBattle 與 SpinForge 在**玩法骨架上幾乎一致**:[3][5]
- 四型相剋(Attack / Stamina / Defense / Balance)
- 最多 **3 顆陀螺**的 1v1 / 對戰
- **Xtreme / Extreme Dash 連段**(官方有 Dash Double / Infinite / Buster)
- 零件客製、線上對戰與賽事

> **結論:你想做的「忠於 Beyblade X 的玩法」官方已經做了、而且更精緻。SpinForge 的新意不在玩法,而在「所有權 + 經濟 + 鏈上可驗證」這一層。**

---

## 6. 風險與第一性結論

1. **🔴 不可迴避的 IP 風險(最高優先)**
   沿用 `"Beyblade X"`、`"Xtreme Dash"`、ratchet 命名(`3-60`)、四聖獸——屬未授權衍生。官方生態 2025 年連發數款遊戲 [1][6],侵權物更易被 C&D。
   **第一性結論:把 Beyblade 專屬命名 / 世界觀「序號磨掉」,保留你真正的創新(鏈上物理 + 所有權 + 開放經濟),改用原創 IP。這比任何技術修補都重要。**

2. **🟠 市場是交集,不是聯集**
   可觸及市場 ≈「轉陀螺遊戲愛好者 ∩ 加密用戶」,本就不大;官方買斷遊戲已佔住「深度玩法」位置。SpinForge 的賣點必須**單押所有權 / 經濟**,而非「更好玩的 Beyblade」。

3. **🟢 可佐證的正面論據(把它寫進敘事)**
   舊的 Beyblade Burst App 於 2026/3 移除全部線上與還原碼功能,玩家進度 / 連動消失。[4]
   → 這是「**為什麼要上鏈**」最具體的現實案例:**鏈上資產與戰績不會因為某公司關伺服器而蒸發。**

4. **🟡 「鏈上物理」的取捨**
   可驗證、防作弊是真優點,但 gas / 延遲讓即時戰鬥難敵官方客戶端。plan 裡的 commit-reveal + 樂觀 UI + 贊助交易方向正確,需實測延遲是否可接受。

---

## 7.「為什麼要上鏈」定位敘事(可直接用於簡報 / 官網)

**短標語(三選一):**
- 「你的陀螺,真正屬於你。」
- 「會關服的遊戲,留不住你的戰績;鏈上的不會。」
- 「不是玩遊戲賺道具,是擁有一個你能交易的對戰經濟。」

**一段式敘事:**
> 傳統陀螺遊戲——包括官方 App——你投入的時間與「收藏」都綁在某家公司的帳號裡。當伺服器關閉(如 2026 年 3 月 Beyblade Burst App 的線上功能被移除),你的進度就蒸發了。SpinForge 把零件、戰績與賽事獎勵全部放上 Sui 區塊鏈:零件是你錢包裡可自由買賣的 NFT,對戰物理與隨機數可被任何人驗證,沒有人能偷偷竄改數值或沒收你的資產。我們不做「更好玩的陀螺遊戲」——那是大廠的主場;我們做的是**第一個玩家真正擁有、且能自由交易的陀螺對戰經濟**。

---

## 8. 建議的 PPT 投影片大綱(逐頁)

| # | 標題 | 內容要點 | 建議視覺 |
|---|---|---|---|
| 1 | 封面 | SpinForge:玩家真正擁有的鏈上陀螺對戰經濟 | Logo + 一句定位 |
| 2 | 問題 | 你在官方 App 的收藏與戰績,公司關服就消失(舉 Burst App 2026/3 例) | 「伺服器關閉」示意 |
| 3 | 市場現況 | 官方四款數位產品全景表(§2) | 對照表 |
| 4 | 它們的共同限制 | 綁帳號、不可交易、不上鏈、靠賣玩具 | 三個 ✗ 圖示 |
| 5 | SpinForge 是什麼 | NFT 零件 + 鏈上物理 + 雙代幣經濟(§3) | 架構圖 |
| 6 | 核心差異 | 逐維度對照表(§4),高亮「所有權 / IP」兩個 🔑 | 對照表 |
| 7 | 我們不跟官方拚玩法 | 玩法重疊說明 + 我們的賽道是「所有權層」(§5) | 賽道分流圖 |
| 8 | 為什麼上鏈 | 定位敘事(§7)+ Burst App 關服案例 | 大字標語 |
| 9 | 風險與對策 | IP 風險最高 → 原創 IP 化;市場是交集(§6) | 風險矩陣 |
| 10 | 下一步 | 原創 IP 重塑 + 經濟 / 市場驗證 | 路線圖 |

---

## 9. 來源

- [1] [Beyblade X: EvoBattle announced for Switch — Nintendo Everything](https://nintendoeverything.com/beyblade-x-evo-battle-announced-for-nintendo-switch/) / [ComicBook](https://comicbook.com/gaming/news/new-beyblade-video-game-beyblade-x-evobattle-release-date-details/)(FuRyu、2025/11/13、Switch+Steam;遊戲媒體)
- [2] [EvoBattle Switch 2 Edition — Nintendo Life](https://www.nintendolife.com/news/2025/12/beyblade-x-evobattle-switch-2-edition-out-this-week-includes-paid-upgrade-path-for-switch-players)(2025/12/18、付費升級)
- [3] [EvoBattle Review — Noisy Pixel](https://noisypixel.net/beyblade-x-evobattle-review/) / [Game Critix](https://gamecritix.co.uk/beyblade-x-evobattle-review/)(EVOSTORY / EVOCUSTOMIZE、X Skills、Extreme Dash Double/Infinite/Buster、1v1 最多 3 顆、本地+線上)
- [4] [Beyblade Burst App — Beyblade Wiki](https://beyblade.fandom.com/wiki/Beyblade_Burst_App)(QR 掃描、90+ 國線上、RC 藍牙;2026/3 移除線上;社群 wiki)
- [5] [Beyblade X App — Google Play](https://play.google.com/store/apps/details?id=com.hasbro.BeybladeX) / [Hasbro](https://apps.hasbro.com/en-US/beyblade-x-app)(建立 / 客製 / 對戰、X-Celerator Rail / High Gear / X-Dash、全球多人、BATTLE LEAGUE 2024/10、賺數位獎勵、免費+IAP、Bey Code 掃描入收藏)
- [6] [BEYBLADE X: XONE comes to Switch Dec 12, 2025 — GoNintendo](https://gonintendo.com/contents/53322-beyblade-x-xone-comes-to-switch-dec-12th-2025) / [Wikipedia](https://en.wikipedia.org/wiki/Beyblade_X:_Xone)(街機→Switch)

---

## 10. 仍待釐清 / 下一步研究

- EvoBattle / X App 是否有任何二級交易或跨帳號轉移(目前查無,幾乎可確定沒有,但未見官方明文)。
- 官方 App 的 IAP 具體賣什麼(影響營收模式對比精細度)。
- Takara Tomy / Hasbro 對衍生 / 同人數位遊戲的歷史執法態度(評估 IP 風險的關鍵)。
- web3 陀螺 / 收藏對戰賽道是否已有競品(若要做市場定位值得補一輪)。
