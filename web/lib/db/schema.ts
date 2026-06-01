// Drizzle schema for the web2-hybrid architecture.
// - Better Auth core tables (user/session/account/verification) — shapes match
//   Better Auth v1.6 so the drizzle adapter maps cleanly.
// - App tables: profiles, ownership (user <-> on-chain object_id), an off-chain
//   currency ledger, entitlements, and the chain-write transactional outbox.
// Social tables (friends/chat/community/battle) are added when those routes
// migrate off KV (plan phase 4).

import {
  pgTable, text, boolean, timestamp, integer, bigint, uuid, jsonb, uniqueIndex, index,
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
}, (t) => ({ pk: uniqueIndex('currency_accounts_pk').on(t.userId, t.currency) }));

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
