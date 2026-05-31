# SpinForge — Key Rotation & Redeploy Runbook

> 對應紅隊發現 **H-RT-3 / C-1 / M-8**(金鑰)與 **H-RT-4 / H-RT-3**(合約)。
> 程式碼變更已在本 repo 完成並通過 `sui move test`(185 passed)與 `tsc --noEmit`。
> 本文件列出**只能由你執行的不可逆步驟**(動用真實私鑰、上鏈、改部署環境)。
> 順序重要:先輪替金鑰 → 再重部署合約 → 最後切換前端環境變數。

---

## 0. 前置:把現有明文熱鑰視為「已外洩」

`web/.env.local` 的 `ADMIN_PRIVATE_KEY` 為明文,且同鑰用於生產簽名 → 依 M-8 視同已外洩,**必須輪替**。下列步驟會產生全新金鑰並把資產移轉過去。

---

## 1. 產生新金鑰(雙鑰:minter / recorder)

```bash
# 產生兩把新地址(分別作為 minter 與 recorder)
sui client new-address ed25519 minter
sui client new-address ed25519 recorder
# 匯出私鑰(suiprivkey... 格式),稍後填入 Vercel 環境變數
sui keytool export --key-identity minter
sui keytool export --key-identity recorder
```

- **MINTER**:只持有 SPARK/FORGE 的 `TreasuryCap`(faucet / claim-starter / open-pack)。
- **RECORDER**:只持有 `AdminCap`(register-rotor / submit-result / create-profile)。
- 各給少量 testnet SUI 當 gas:`sui client faucet --address <addr>`。

---

## 2. 重新部署合約(本次合約變更需要)

本次 Move 變更**不是相容升級**(`player_profile::create` / `record_battle_result` 的 public 簽章已改、profile 改為 shared object),因此走**全新發布**(與你先前的做法一致;testnet 狀態會重置)。

```bash
cd contracts
sui move build
sui move test            # 應為 185 passed
sui client publish --gas-budget 500000000
```

發布後從輸出記下並更新 `web/lib/constants.ts`:
- `PACKAGE_ID` / `ORIGINAL_PACKAGE_ID`(新)
- `ADMIN_CAP_ID`、`GAME_CONFIG_ID`、`SPARK_TREASURY_CAP_ID`、`FORGE_TREASURY_CAP_ID`、`TRANSFER_POLICY_ID`
- 同步更新 `submit-result` / `register-rotor` / `open-pack` / `faucet` 路由內硬編的 cap 物件 id(若仍有)。

> 發布者(你的 CLI active address)會收到 `AdminCap` 與兩個 `TreasuryCap`。下一步把它們分權移轉。

本次合約已內建的保護:
- **H-RT-4**:`player_profile` 為 shared,`record_battle_result` 需 `&AdminCap`(玩家無法自刷 ELO)。
- **H-RT-3**:`spark_token` 全域 `MAX_SUPPLY = 1e18`、`forge_token = 1e17`,超量鑄造 abort。

---

## 3. 分權移轉 capabilities(H-RT-3 capability separation)

把 cap 從發布者地址拆到兩把專用鑰:

```bash
# TreasuryCap → MINTER
sui client transfer --object-id <SPARK_TREASURY_CAP_ID> --to <MINTER_ADDRESS> --gas-budget 10000000
sui client transfer --object-id <FORGE_TREASURY_CAP_ID> --to <MINTER_ADDRESS> --gas-budget 10000000
# AdminCap → RECORDER
sui client transfer --object-id <ADMIN_CAP_ID> --to <RECORDER_ADDRESS> --gas-budget 10000000
```

> 程式碼端已就緒:`web/lib/admin-signer.ts` 依角色選鑰(`minter`/`recorder`),
> 未設定 `MINTER_PRIVATE_KEY`/`RECORDER_PRIVATE_KEY` 時回退 `ADMIN_PRIVATE_KEY`。

### ⚠️ open-pack 付款收款人

`open-pack` 會驗證玩家把 SPARK 付給「簽名者(minter)地址」當作 treasury。拆鑰後:
- 確認前端付款目標(`web/lib/constants.ts` 的 `TREASURY_ADDRESS`)= **MINTER 地址**;
- 否則玩家付款驗證會失敗。

---

## 4. 切換生產環境變數(Vercel)

在 Vercel Project → Settings → Environment Variables:

| 變數 | 值 |
|---|---|
| `MINTER_PRIVATE_KEY` | 第 1 步 minter 的 `suiprivkey...` |
| `RECORDER_PRIVATE_KEY` | 第 1 步 recorder 的 `suiprivkey...` |
| `ADMIN_PRIVATE_KEY` | **刪除**(分權後不再需要單一全權鑰) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | **必填**(否則生產路由依 H-RT-1 fail-closed 回 503) |
| `NEXT_PUBLIC_PACKAGE_ID` | 第 2 步新 PACKAGE_ID |

重新部署後驗證:`/api/faucet`、`/api/open-pack`、`/api/submit-result` 正常;舊 admin 地址不再持有任何 cap。

---

## 5. 長期:KMS / HSM(消除明文私鑰)

目前私鑰仍以明文存在於 `process.env`。長期應改為 KMS/HSM 簽名,raw key 永不進環境變數:
- AWS KMS / GCP KMS / HashiCorp Vault Transit 產生簽名;
- 在 `web/lib/admin-signer.ts` 以 KMS 簽名器替換 `decodeSuiPrivateKey(env)`(該檔已是唯一載鑰點,改動集中);
- 建立輪替排程(季度)+ 鏈上鑄造監控告警(對照每小時 `adminBudgetExceeded` 上限)。

---

## 6. 仍待辦(產品決策,非本次程式碼可定)

- **H-RT-2 身分成本化**:已加「最低 SUI 餘額」門檻(`api-guard.ts::belowMinSuiBalance`,門檻 `MIN_SUI_MIST`)。若要更強(zkLogin 驗證身分 / proof-of-funding),屬產品取捨,於 faucet/claim-starter 擴充。
- **後端結算 ELO 上鏈**:`record_battle_result` 已 AdminCap-gated 待用;若要讓 profile 的 wins/elo 真正更新(而非僅靠 leaderboard 由 `BattleRecordCommitted` 聚合),需在 `submit-result` 確認流程後呼叫它並傳入雙方 shared profile id。屬功能擴充。
