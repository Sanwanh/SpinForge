# Implementation Plan: Web2-First Hybrid Architecture

> Goal: cut wallet friction. Keep **only the valuable data on-chain** (asset NFTs + battle records); move **everything else** (login, sessions, social, profiles, currency, leaderboard, game state) to a conventional web2 stack. All on-chain objects are owned by **one platform address**; Postgres attributes which user owns what. The backend signs every on-chain write (extends the existing admin-relay).

- Authored: 2026-06-01 via `/everything-claude-code:multi-plan`
- Backend analysis: **Codex** (`CODEX_SESSION` below). Frontend/UX: **Claude** (gemini backend was unavailable).
- **Planning only — no production code was modified.**

## Task Type
- [x] Fullstack (auth + DB + API + Move contracts + frontend)

---

## Locked Requirements (from user)
1. **On-chain identity = platform single address + DB attribution.** Every NFT / battle record is owned by ONE platform address; a Postgres `ownership` table maps `user_id ↔ object_id`. On-chain = canonical public store + audit; attribution = DB.
2. **On-chain scope = asset NFTs (Blade/Ratchet/Bit/Bey) + battle records.** Everything else → Postgres. (Tokens $SPARK/$FORGE become an **off-chain DB ledger** — see note.)
3. **Traditional auth** = Google/Apple OAuth **+** email/password **+** email magic link. Cookie session. No wallet for normal play.
4. **Reuse the existing admin-relay signer** for all on-chain writes; no per-user wallets/keys.
5. Migrate KV social state → Postgres.

---

## Technical Solution (synthesis)

### A. Auth — Better Auth + Drizzle + Postgres
- **Better Auth** (not Lucia — deprecated Mar 2025; not Auth.js — its Credentials provider forces JWT sessions, which conflicts with DB-authoritative sessions). Better Auth natively covers email/password, Google, Apple, magic link, **database sessions**, and Next.js App Router.
- Session = **opaque token** in a `Secure; HttpOnly; SameSite=Lax` cookie. Admin/asset routes validate the **DB session** directly (no long-lived stateless JWT for asset writes).
- One server helper `requireUser(request)` → resolves the session user or throws 401. Every API route calls it internally; middleware only does page redirects.
- **Never trust `address`/`author`/`from`/`submitter`/`playerA` from request JSON again** — identity comes from the session.

### B. Custody & on-chain attribution
- Add `PLATFORM_CUSTODY_ADDRESS` — owns every Blade/Ratchet/Bit/Bey/BattleRecord.
- Add a `custodian` role to `web/lib/admin-signer.ts` (`SignerRole = 'minter'|'recorder'|'custodian'`). Initially `custodian` reuses `ADMIN_PRIVATE_KEY` — **do not casually split caps**: forge consumes platform-owned assets AND needs treasury caps in the same tx. Long-term: Sui multisig / vault contract + KMS/HSM signing.
- `player_subject` = deterministic pseudonymous Sui-formatted address derived from `server_secret + user_id`. Used only for **on-chain event attribution**; it never signs and is not a wallet.

### C. Data split
| On-chain (Sui, platform-owned) | Postgres (authoritative) |
|---|---|
| Blade/Ratchet/Bit/Bey NFTs | users, sessions, oauth accounts, verifications |
| Committed battle records | profiles, ownership map, currency ledger |
| (events carry `operation_id`) | friends, chat, community, battle rooms, battles, leaderboard, chain_operations (outbox), indexer cursors |

> **Token note:** $SPARK/$FORGE move to a **DB ledger** (`currency_accounts`/`currency_ledger`), authoritative off-chain. Avoid per-action on-chain mint/burn (gas + contention). On-chain token modules can remain dormant; pack cost becomes a DB debit, not an on-chain SPARK burn.

### D. Mandatory Move contract changes (NOT backend-only)
Current blockers:
- `pack::open_pack(... recipient ...)` uses `recipient` for **both** mint custody **and** the ban check → if everything is platform-owned it would ban-check the *platform*, not the user. (`contracts/sources/pack.move:33`)
- `battle_record::confirm()` requires `ctx.sender()` == a player wallet. (`contracts/sources/battle_record.move:86`)
- assemble/disassemble/discard/forge are still wallet-signed client mutations. (`web/lib/move-calls.ts`)

Add admin-relayed `_for` functions that take explicit `platform_custody`, `player_subject`, `operation_id`:
```move
open_pack_for(admin, config, platform_custody, player_subject, operation_id, random)
register_rotor_for(admin, config, platform_custody, player_subject, operation_id, ...)
assemble_for(platform_custody, player_subject, operation_id, blade, ratchet, bit, name)
create_committed_record(admin, platform_custody, operation_id, player_a_subject, player_b_subject, winner, finish, scores, clock)
```
`create_committed_record` emits participants, rotor IDs, result, timestamp, `operation_id`; Postgres records **both** session-auth confirmations before this tx is submitted. → **requires a fresh package publish** (signature changes are upgrade-incompatible, same as before).

### E. Consistency — transactional outbox (Postgres ⇄ Sui)
Postgres and Sui can't share a transaction. Per mutation:
1. Reserve DB resources with `SELECT … FOR UPDATE` row locks.
2. Insert a `chain_operations` row (`idempotency_key`, `state='reserved'`).
3. **Compute & persist the Sui tx digest before RPC submission.**
4. Submit outside the DB transaction.
5. On success: finalize `ownership`/`ledger` rows, `state='db_applied'`.
6. On definite failure: release reservations.
7. On timeout/unknown: leave `state='reconcile_needed'` — **never blindly re-mint.**
Guards: `version` columns, partial unique indexes, idempotency keys; Sui object-version conflict is the final chain-level guard.

---

## Postgres Schema (Drizzle, forward-only migrations)
Keep Upstash KV only for rate limits / short locks / cache.

Core tables (full DDL preserved from the backend analysis):
- `users`, `sessions(token_hash, expires_at, …)`, `auth_accounts(provider_id, provider_account_id, password_hash, …)`, `verifications`
- `profiles(user_id, handle, display_name, chain_subject UNIQUE, …)`
- `ownership(user_id, object_id, object_type CHECK in blade|ratchet|bit|bey|battle_record, kind in asset|record_attribution|legacy_external, status in reserved|active|embedded|consumed|burned|external|reconcile_needed, parent_object_id, chain_owner_address, tx_digest, operation_id, object_version)` — partial unique index on active assets; inventory index on `(user_id, status, object_type)`
- `currency_accounts(user_id, currency, balance CHECK ≥ 0)`, `currency_ledger(amount, state in reserved|settled|released, reason, operation_id)`, `entitlements(user_id, kind)`
- `friendships(user_low_id<user_high_id, status)`, `direct_chat_threads`, `chat_messages(body 1..500)`
- `community_posts/comments/votes`
- `battle_rooms(code, creator_id, opponent_id, status, result jsonb, version)`, `battle_confirmations(room_id,user_id,result_hash)`, `battles(chain_record_id UNIQUE, tx_digest UNIQUE, chain_status, …)`
- `leaderboard_entries(season, user_id, elo, wins, losses, xtreme_finishes)`
- `chain_operations(idempotency_key UNIQUE, action, state, request jsonb, tx_digest UNIQUE, attempts)`, `chain_indexer_cursors(stream, cursor, checkpoint)`
- Temporary `legacy_wallet_links(user_id, address UNIQUE)` during migration only.

(Full SQL is in the Codex session output / will be expanded into Drizzle schema files during execution.)

---

## Existing route changes
| Route | Change |
|---|---|
| `/api/faucet` | Replace wallet payout with a one-time **DB ledger credit**; later rename `/api/economy/claim`. |
| `/api/claim-starter` | Session user + entitlement uniqueness + DB ledger grant + relay starter mint to custody + insert `ownership` rows. |
| `/api/open-pack` | Drop wallet payment-digest verification; **reserve DB SPARK**, relay mint to custody, finalize ownership. |
| `/api/register-rotor` | Drop wallet signature; pass custody + `chain_subject`; insert Bey ownership. |
| `/api/create-profile` | Becomes a **DB profile upsert**; stop minting on-chain profiles (not in the on-chain retention list). |
| `/api/submit-result` | Resolve participants + Bey IDs from `battle_rooms` + `ownership`; record two DB confirmations, then relay **one** committed on-chain record. |
| `/api/leaderboard` | Read `leaderboard_entries` (derived from chain-confirmed battles). |
| `/api/battle-history` | Query `battles` by session user / public profile. |
| **new** | session-protected relay endpoints: `/api/assets/assemble`, `/api/assets/:id/disassemble`, `/api/assets/:id/discard`, `/api/forge/*`, `/api/inventory`. |

All mutations keep: same-origin check, **+ CSRF**, body validation, per-user + per-IP rate limits, **`Idempotency-Key`**.

---

## Core data flows (pseudo-code)
```ts
// open-pack
user = requireUser(req)
db.tx(() => { acct = SELECT currency_accounts FOR UPDATE; assert(acct.balance>=100)
              INSERT chain_operations(state="reserved", idempotency_key)
              INSERT currency_ledger(amount=-100, state="reserved") })
tx = relay.openPackFor(platformCustody, user.chainSubject, operationId)
saveDigest(operationId, computeDigestBeforeSubmit(tx))
effects = submitWith(loadSigner("minter"), tx)
db.tx(() => { for(nft of effects.createdParts) INSERT ownership(user.id,nft,"asset","active")
              settleLedger(operationId); markOperation("db_applied") })

// assemble  — FOR UPDATE on the 3 parts, reserve, relay assembleFor, mark inputs embedded, insert Bey ownership
// submit-result — FOR UPDATE room+version; verify participant & Bey ownership; canonical result hash;
//                 UPSERT battle_confirmations; when BOTH confirm same hash → relay createCommittedRecord → INSERT battles + record_attribution ownership + update leaderboard
// inventory — SELECT ownership WHERE user_id AND status in(active,embedded) → sui.multiGetObjects → assert still owned by platformCustody → merge
```

---

## Frontend / UX plan (Claude-authored)
1. **`/login` page** (design-system styled — panels/Corners/gold): Google + Apple buttons, email/password form, "email me a link" (magic link). Better Auth client (`authClient.signIn.social` / `.signUp.email` / `magicLink.send`). Keep **guest browse** (`web/lib/guest.ts`) untouched.
2. **`useAuth()` → `useSession()`** (Better Auth client). `web/hooks/useAuth.ts` rewritten to return `{ user, status }`. Pages gate on session, not `useCurrentAccount()`.
3. **Navbar**: `WalletButton` → `AccountMenu` (logged-out: "登入"→`/login`; logged-in: avatar/handle + Logout). Drop dapp-kit ConnectButton from the shell.
4. **Strip wallet-signature plumbing**: remove `useCachedAuthSig` + `authMessage/authSignature`/`...auth` spreads from `friends`, `community`, `chat`, `battle`, `register`, and the workshop/packs flows. Client fetches just send the session cookie (`credentials:'include'`).
5. **Inventory**: `useInventory` → fetch `/api/inventory` (DB ownership → `sui.multiGetObjects`) instead of querying wallet-owned objects. `collection`/`workshop`/`passport` read from server APIs.
6. **Packs**: remove the client wallet SPARK-transfer step; `open-pack` is a session call against the DB SPARK ledger; UI polls `operationId` for the slow chain write (return `202 {operationId}`).
7. **Assemble/forge/discard**: client calls the new session-protected relay endpoints (no wallet signing).
8. **Onboarding**: one-click OAuth → server grants starter (`claim-starter`) → redirect to `/workshop`. Keep the existing Mythic-Industrial visuals + the new Workshop redesign.
9. **Providers**: keep `SuiClientProvider` for read-only on-chain object fetches; remove `WalletProvider` gating from normal play (optionally retain behind a feature flag for future wallet-link).

---

## Phased migration (no big-bang)
1. Add Postgres + Better Auth + Drizzle + feature flags + chain outbox — no behavior change to current reads.
2. Enable traditional login; require a session to play; wallets stop being login credentials.
3. One-time legacy wallet linking; testnet re-mint assets to custody (mainnet: explicit deposit / migration contract).
4. Dual-write KV social mutations into Postgres; backfill `friends:* / friend_req:* / chat:* / community:* / room:*`.
5. Shadow-read Postgres, compare, cut reads route-by-route (community → friends → chat → rooms → leaderboard).
6. Deploy upgraded relay Move package; cut pack/starter/register/assemble/disassemble/discard/forge/result to platform custody.
7. Replace frontend wallet inventory + dapp-kit mutations with session APIs.
8. Remove zkLogin + wallet-signature auth from normal play; Upstash → rate-limiting only.
9. Disable/redesign marketplace (direct P2P transfer conflicts with platform custody).

---

## Key Files
| File | Operation | Description |
|---|---|---|
| `web/lib/admin-signer.ts:20` | Modify | add `'custodian'` role |
| `web/lib/auth-verify.ts` | Replace | retire wallet-sig gate → `requireUser()` (new `web/lib/auth.ts`) |
| `web/hooks/useAuth.ts` | Replace | → `useSession()` |
| `web/hooks/useInventory.ts:24` | Replace | DB `/api/inventory` instead of wallet objects |
| `web/lib/move-calls.ts` | Modify | server-relay calls; drop client wallet mutations |
| `web/app/api/*` (8 routes) | Modify | session auth + outbox + ownership (table above) |
| `web/app/api/{assets,forge,inventory}/*` | Create | new session-protected relay endpoints |
| `web/app/login/page.tsx` | Create | OAuth + email/password + magic link |
| `web/components/shared/Navbar.tsx` | Modify | WalletButton → AccountMenu |
| `contracts/sources/{pack,register,bey,battle_record}.move` | Modify | `_for` admin-relayed functions + custody/subject/operation_id → fresh publish |
| `web/lib/db/*` (Drizzle) | Create | schema + migrations |
| `web/lib/kv.ts` | Keep | demote to rate-limit/cache only |

---

## Risks & Mitigation
| Risk | Mitigation |
|---|---|
| **Single custody address compromise** = total asset loss | Sui multisig / vault contract, KMS-HSM signing, tx allowlists, spend ceilings, role separation, offline recovery keys, alerts |
| Shared-cap contention (treasury + assets in one tx) | DB currency authoritative; avoid per-action on-chain SPARK; serialize forge via a worker |
| OAuth account takeover via linking | never auto-link unverified email; require existing session to link a provider |
| Chain success + HTTP timeout | persist digest before submit; reconcile by digest; `202 {operationId}` + UI poll |
| Attribution drift (DB vs chain) | `operation_id` in events; Vercel-Cron indexer + daily full reconciliation; never auto-remint |
| Vercel function time limits on chain writes | async `202 {operationId}` + operation-state polling |
| Loss of "true ownership" (platform custody) | accepted per requirement; future path = optional wallet-link / per-user custodial (phase 3) |

---

## Open notes / decisions to confirm during execution
- Confirm **DB-ledger SPARK** (off-chain) vs keeping on-chain SPARK burns — plan assumes DB ledger (simpler, matches "tokens not in on-chain scope").
- Apple OAuth needs an Apple Developer account + Services ID + key; Google needs OAuth client ID/secret; magic link needs an email provider (Resend/SES) — credentials required before phase 2.
- Postgres host (Vercel Postgres / Neon / Supabase) — pick one for `DATABASE_URL`.
- Marketplace (`marketplace.move`) is shelved under platform custody (phase 9).

---

## SESSION_ID (for `/ccg:execute`)
- CODEX_SESSION: `019e8134-11c8-7842-9fc7-1cab13945ccf`
- GEMINI_SESSION: _none — gemini backend failed on multi-line prompts; frontend section authored by Claude._
