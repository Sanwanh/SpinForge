// Drizzle schema for the web2-hybrid architecture.
// - Better Auth core tables (user/session/account/verification) — shapes match
//   Better Auth v1.6 so the drizzle adapter maps cleanly.
// - App tables: profiles, ownership (user <-> on-chain object_id), an off-chain
//   currency ledger, entitlements, and the chain-write transactional outbox.
// Social tables (friends/chat/community/battle) are added when those routes
// migrate off KV (plan phase 4).

import { sql } from 'drizzle-orm';
import {
  pgTable, text, boolean, timestamp, integer, bigint, uuid, jsonb, uniqueIndex, index, check,
} from 'drizzle-orm/pg-core';

// ===== Better Auth core =====

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (t) => ({ userIdx: index('session_user_idx').on(t.userId, t.expiresAt) }));

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({ userIdx: index('account_user_idx').on(t.userId) }));

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({ identIdx: index('verification_identifier_idx').on(t.identifier) }));

// ===== App tables =====

// One game profile per user; chain_subject is a deterministic pseudonymous
// Sui-formatted address used only for on-chain event attribution (never signs).
export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  handle: text('handle').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  chainSubject: text('chain_subject').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Maps which user owns which platform-custodied on-chain object.
export const ownership = pgTable('ownership', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id),
  objectId: text('object_id').notNull(),
  objectType: text('object_type').notNull(), // blade|ratchet|bit|bey|battle_record
  kind: text('kind').notNull(),              // asset|record_attribution|legacy_external
  status: text('status').notNull(),          // reserved|active|embedded|consumed|burned|external|reconcile_needed
  parentObjectId: text('parent_object_id'),
  chainOwnerAddress: text('chain_owner_address').notNull(),
  acquiredVia: text('acquired_via').notNull(),
  txDigest: text('tx_digest'),
  operationId: uuid('operation_id'),
  objectVersion: bigint('object_version', { mode: 'number' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  // one active row per asset object
  activeAssetIdx: uniqueIndex('ownership_active_asset_idx').on(t.objectId),
  inventoryIdx: index('ownership_inventory_idx').on(t.userId, t.status, t.objectType),
}));

// Off-chain $SPARK / $FORGE ledger (authoritative; not minted on-chain per action).
export const currencyAccounts = pgTable('currency_accounts', {
  userId: text('user_id').notNull().references(() => user.id),
  currency: text('currency').notNull(),
  balance: bigint('balance', { mode: 'number' }).notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  pk: uniqueIndex('currency_accounts_pk').on(t.userId, t.currency),
  // Final overdraft guard — balance can never go negative (see lib/economy.ts).
  balanceNonNeg: check('currency_accounts_balance_nonneg', sql`${t.balance} >= 0`),
}));

export const currencyLedger = pgTable('currency_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id),
  currency: text('currency').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  state: text('state').notNull(), // reserved|settled|released
  reason: text('reason').notNull(),
  operationId: uuid('operation_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const entitlements = pgTable('entitlements', {
  userId: text('user_id').notNull().references(() => user.id),
  kind: text('kind').notNull(),
  claimedAt: timestamp('claimed_at').notNull().defaultNow(),
}, (t) => ({ pk: uniqueIndex('entitlements_pk').on(t.userId, t.kind) }));

// Off-chain photo for a registered Bey ("rotor"), NFT-style. The Bey itself
// lives on-chain (name + stats only); the real-world photo is stored off-chain
// and keyed by the Bey's on-chain object_id — same pattern as `ownership`.
// One photo per Bey; replacing it overwrites the row.
export const beyImages = pgTable('bey_images', {
  objectId: text('object_id').primaryKey(), // Bey on-chain object id
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),               // public blob URL
  blobPath: text('blob_path'),              // storage key, for replace/delete
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({ userIdx: index('bey_images_user_idx').on(t.userId) }));

// Transactional outbox for Postgres <-> Sui consistency.
export const chainOperations = pgTable('chain_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  userId: text('user_id').references(() => user.id),
  action: text('action').notNull(),
  state: text('state').notNull(), // reserved|submitted|db_applied|failed|reconcile_needed
  request: jsonb('request').notNull(),
  txDigest: text('tx_digest').unique(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({ pendingIdx: index('chain_operations_pending_idx').on(t.state, t.createdAt) }));

export const chainIndexerCursors = pgTable('chain_indexer_cursors', {
  stream: text('stream').primaryKey(),
  cursor: jsonb('cursor'),
  checkpoint: bigint('checkpoint', { mode: 'number' }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ===== Social tables (migrated off KV — plan phase 4) =====

// Friendship is stored once per pair with a canonical ordering
// (userLowId < userHighId) so a unique index dedupes both directions.
export const friendships = pgTable('friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userLowId: text('user_low_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  userHighId: text('user_high_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  requestedBy: text('requested_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // pending|accepted|blocked
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  pairIdx: uniqueIndex('friendships_pair_idx').on(t.userLowId, t.userHighId),
  lowIdx: index('friendships_low_idx').on(t.userLowId, t.status),
  highIdx: index('friendships_high_idx').on(t.userHighId, t.status),
}));

// A 1:1 direct-message thread, also keyed by the canonical (low, high) pair.
export const directChatThreads = pgTable('direct_chat_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userLowId: text('user_low_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  userHighId: text('user_high_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  pairIdx: uniqueIndex('direct_chat_threads_pair_idx').on(t.userLowId, t.userHighId),
}));

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').notNull().references(() => directChatThreads.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  body: text('body').notNull(), // 1..500 chars (enforced at the route boundary)
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  threadIdx: index('chat_messages_thread_idx').on(t.threadId, t.createdAt),
}));

export const communityPosts = pgTable('community_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: text('author_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  comboData: jsonb('combo_data'), // shared blade/ratchet/bit combo payload
  score: integer('score').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  authorIdx: index('community_posts_author_idx').on(t.authorId, t.createdAt),
  scoreIdx: index('community_posts_score_idx').on(t.score),
}));

export const communityComments = pgTable('community_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  postIdx: index('community_comments_post_idx').on(t.postId, t.createdAt),
}));

// One vote per user per post; value is +1 / -1.
export const communityVotes = pgTable('community_votes', {
  postId: uuid('post_id').notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  value: integer('value').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  pk: uniqueIndex('community_votes_pk').on(t.postId, t.userId),
}));

// A negotiated battle lobby. result is the canonical jsonb agreed by both sides;
// version guards optimistic concurrency on the room state machine.
export const battleRooms = pgTable('battle_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  creatorId: text('creator_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  opponentId: text('opponent_id').references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // open|active|reporting|settled|cancelled
  result: jsonb('result'),
  version: integer('version').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('battle_rooms_status_idx').on(t.status, t.createdAt),
}));

// Each participant signs off on a canonical result hash; the on-chain record is
// only relayed once BOTH confirmations agree.
export const battleConfirmations = pgTable('battle_confirmations', {
  roomId: uuid('room_id').notNull().references(() => battleRooms.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  resultHash: text('result_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  pk: uniqueIndex('battle_confirmations_pk').on(t.roomId, t.userId),
}));

// A settled match. chain_record_id / tx_digest are unique once the committed
// record is minted on-chain (nullable until then).
export const battles = pgTable('battles', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => battleRooms.id),
  playerAId: text('player_a_id').notNull().references(() => user.id),
  playerBId: text('player_b_id').notNull().references(() => user.id),
  winnerId: text('winner_id').references(() => user.id),
  finishType: integer('finish_type').notNull().default(0),
  scoreA: integer('score_a').notNull().default(0),
  scoreB: integer('score_b').notNull().default(0),
  // Match duration in seconds, agreed by both players (part of the confirm hash).
  durationSeconds: integer('duration_seconds').notNull().default(0),
  // The Bey object id each side used — lets us derive per-Bey W/L stats.
  rotorA: text('rotor_a'),
  rotorB: text('rotor_b'),
  season: text('season'),
  chainRecordId: text('chain_record_id').unique(),
  txDigest: text('tx_digest').unique(),
  chainStatus: text('chain_status').notNull(), // pending|committed|reconcile_needed
  operationId: uuid('operation_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  playerAIdx: index('battles_player_a_idx').on(t.playerAId, t.createdAt),
  playerBIdx: index('battles_player_b_idx').on(t.playerBId, t.createdAt),
}));

export const leaderboardEntries = pgTable('leaderboard_entries', {
  season: text('season').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  elo: integer('elo').notNull().default(1000),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  xtremeFinishes: integer('xtreme_finishes').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  pk: uniqueIndex('leaderboard_entries_pk').on(t.season, t.userId),
  rankIdx: index('leaderboard_entries_rank_idx').on(t.season, t.elo),
}));
