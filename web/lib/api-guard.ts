import { NextRequest, NextResponse } from 'next/server';
import { kvRateLimit } from '@/lib/kv';

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

// L-4: never leak raw SDK/RPC errors (admin address, object ids, abort codes).
// Log the detail server-side; return a generic message + opaque id to the client.
export function safeError(err: unknown, publicMessage = 'Request failed'): NextResponse {
  const detail = err instanceof Error ? err.message : String(err);
  const ref = Math.random().toString(36).slice(2, 10);
  console.error(`[api-error ${ref}]`, detail);
  return NextResponse.json({ error: publicMessage, ref }, { status: 500 });
}
