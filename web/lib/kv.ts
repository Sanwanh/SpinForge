import { Redis } from '@upstash/redis';

// Accept either Vercel-KV-style or Upstash-style env var names so the same code
// works regardless of which integration provisioned the store.
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

/** True when a real Redis store is configured (production). */
export const usingRedis = !!redis;

// ---- In-memory fallback (local dev / store not yet provisioned) ----
// Each serverless instance gets its own copy, so this is NOT shared across
// instances — fine for local dev, but production must use Redis for multi-player.
interface MemEntry {
  value: unknown;
  expiresAt: number | null;
}
const memKV = new Map<string, MemEntry>();
const memSet = new Map<string, Set<string>>();
const memList = new Map<string, unknown[]>();

function memAlive(key: string): MemEntry | null {
  const e = memKV.get(key);
  if (!e) return null;
  if (e.expiresAt !== null && e.expiresAt < Date.now()) {
    memKV.delete(key);
    return null;
  }
  return e;
}

// ---- Key/value (objects) ----

export async function kvGet<T>(key: string): Promise<T | null> {
  if (redis) return (await redis.get<T>(key)) ?? null;
  const e = memAlive(key);
  return e ? (e.value as T) : null;
}

export async function kvSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  if (redis) {
    if (ttlSeconds) await redis.set(key, value, { ex: ttlSeconds });
    else await redis.set(key, value);
    return;
  }
  memKV.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

export async function kvDel(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }
  memKV.delete(key);
}

// ---- Atomic claim-once (H-5) ----

/**
 * Set `key` only if it does not exist. Returns true if WE set it (first caller),
 * false if it already existed. Atomic on Redis (SET NX). The in-memory fallback
 * is per-instance only — provision Redis for cross-instance guarantees.
 */
export async function kvSetNX(key: string, ttlSeconds?: number): Promise<boolean> {
  if (redis) {
    const res = ttlSeconds
      ? await redis.set(key, 1, { nx: true, ex: ttlSeconds })
      : await redis.set(key, 1, { nx: true });
    return res === 'OK';
  }
  if (memAlive(key)) return false;
  memKV.set(key, { value: 1, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
  return true;
}

// ---- Rate limiting (M-4) ----

/**
 * Fixed-window counter. Returns {ok, remaining}. ok=false once `limit` is
 * exceeded within `windowSeconds`. Atomic-ish on Redis (INCR + EXPIRE).
 */
export async function kvRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number }> {
  if (redis) {
    const n = await redis.incr(key);
    if (n === 1) {
      await redis.expire(key, windowSeconds);
    } else {
      // Guard against a dropped EXPIRE on the creating call: if the key somehow
      // has no TTL (-1) it would count forever and lock the IP out — re-arm it.
      const ttl = await redis.ttl(key);
      if (ttl < 0) await redis.expire(key, windowSeconds);
    }
    return { ok: n <= limit, remaining: Math.max(0, limit - n) };
  }
  const e = memAlive(key);
  const n = ((e?.value as number) ?? 0) + 1;
  memKV.set(key, { value: n, expiresAt: e?.expiresAt ?? Date.now() + windowSeconds * 1000 });
  return { ok: n <= limit, remaining: Math.max(0, limit - n) };
}

// ---- Sets (friend lists, pending requests) ----

export async function kvSAdd(key: string, member: string): Promise<void> {
  if (redis) {
    await redis.sadd(key, member);
    return;
  }
  const s = memSet.get(key) ?? new Set<string>();
  s.add(member);
  memSet.set(key, s);
}

export async function kvSRem(key: string, member: string): Promise<void> {
  if (redis) {
    await redis.srem(key, member);
    return;
  }
  memSet.get(key)?.delete(member);
}

export async function kvSMembers(key: string): Promise<string[]> {
  if (redis) return await redis.smembers(key);
  return Array.from(memSet.get(key) ?? []);
}

// ---- Lists (chat threads) ----

export async function kvRPush<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  if (redis) {
    await redis.rpush(key, value as never);
    if (ttlSeconds) await redis.expire(key, ttlSeconds);
    return;
  }
  const l = memList.get(key) ?? [];
  l.push(value);
  memList.set(key, l);
}

export async function kvLRange<T>(key: string, start: number, stop: number): Promise<T[]> {
  if (redis) return (await redis.lrange<T>(key, start, stop)) ?? [];
  const l = (memList.get(key) ?? []) as T[];
  // Mirror Redis semantics: negative indices count from the end, stop inclusive.
  const len = l.length;
  const s = start < 0 ? Math.max(len + start, 0) : start;
  const e = stop < 0 ? len + stop : stop;
  return l.slice(s, e + 1);
}
