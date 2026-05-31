import { NextRequest, NextResponse } from 'next/server';
import { kvRateLimit, usingRedis } from '@/lib/kv';

// Same-origin check (M-4). Blocks cross-site browser-driven calls to the
// admin-signed routes. Not a substitute for the wallet-signature auth — a raw
// curl can forge the Origin header — but defense-in-depth against CSRF-style
// abuse from other sites.
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  if (!host) return false;
  // No Origin/Referer (e.g. server-to-server) — allow; the wallet signature is
  // the real gate. We only reject when a DIFFERENT origin is explicitly present.
  const candidate = origin ?? referer;
  if (!candidate) return true;
  try {
    return new URL(candidate).host === host;
  } catch {
    return false;
  }
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Per-IP rate limit for an admin-signed route (M-4). Returns a 429 response when
 * the caller exceeds `limit` requests per `windowSeconds`, otherwise null.
 * Robust across instances once Redis is configured; in-memory fallback otherwise.
 */
export async function rateLimited(
  request: NextRequest,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<NextResponse | null> {
  const { ok } = await kvRateLimit(`rl:${bucket}:${clientIp(request)}`, limit, windowSeconds);
  if (ok) return null;
  return NextResponse.json({ error: 'Too many requests — slow down.' }, { status: 429 });
}

/**
 * H-RT-1: fail-closed when no Redis is configured in production. The per-address
 * dedup (faucet/starter), payment-replay guard (open-pack) and rate limits all
 * collapse to a per-instance in-memory Map when Redis is absent — on Vercel's
 * multi-instance serverless that defeats every cross-instance guarantee. Refuse
 * to mint rather than mint without protection. Local dev (NODE_ENV !== production)
 * keeps the in-memory fallback so single-instance development still works.
 */
export function requireRedis(): NextResponse | null {
  if (process.env.NODE_ENV === 'production' && !usingRedis) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable.' },
      { status: 503 },
    );
  }
  return null;
}

/**
 * H-RT-2: global circuit breaker on admin-signed minting. Independent of any
 * per-address/per-IP dedup (which a free offline keypair or instance hop can
 * bypass), this caps the TOTAL number of admin mint operations per `bucket`
 * across ALL callers within `windowSeconds`, hard-stopping a drain of the hot
 * wallet's gas/SPARK. The key is global (not keyed on IP or address). Returns a
 * 503 once the ceiling is hit, otherwise null. Tune the ceilings to real demand.
 */
export async function adminBudgetExceeded(
  bucket: string,
  max: number,
  windowSeconds: number,
): Promise<NextResponse | null> {
  const { ok } = await kvRateLimit(`budget:${bucket}`, max, windowSeconds);
  if (ok) return null;
  return NextResponse.json(
    { error: 'Service temporarily unavailable.' },
    { status: 503 },
  );
}

/**
 * H-RT-2: Sybil-cost gate. A free, offline-generated keypair defeats per-address
 * dedup, so require the claiming address to already hold a minimum SUI balance.
 * On mainnet this is a real funding cost per Sybil identity; on testnet it forces
 * a separate (rate-limited) Sui-faucet claim per address — meaningful friction.
 * Fails CLOSED: if the balance lookup errors we refuse rather than grant.
 */
const MIN_SUI_MIST = 20_000_000n; // 0.02 SUI

export async function belowMinSuiBalance(
  address: string,
  rpcUrl: string,
): Promise<NextResponse | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getBalance',
        params: [address, '0x2::sui::SUI'],
      }),
    });
    const json = await res.json();
    const total = BigInt(json?.result?.totalBalance ?? '0');
    if (total < MIN_SUI_MIST) {
      return NextResponse.json(
        { error: 'Fund your wallet with a little SUI before claiming.' },
        { status: 403 },
      );
    }
    return null;
  } catch {
    return NextResponse.json({ error: 'Could not verify wallet — try again.' }, { status: 503 });
  }
}

// L-4: never leak raw SDK/RPC errors (admin address, object ids, abort codes).
// Log the detail server-side; return a generic message + opaque id to the client.
export function safeError(err: unknown, publicMessage = 'Request failed'): NextResponse {
  const detail = err instanceof Error ? err.message : String(err);
  const ref = Math.random().toString(36).slice(2, 10);
  console.error(`[api-error ${ref}]`, detail);
  return NextResponse.json({ error: publicMessage, ref }, { status: 500 });
}
