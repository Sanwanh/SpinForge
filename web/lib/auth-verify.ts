import { verifyPersonalMessageSignature } from '@mysten/sui/verify';

// Stateless wallet-signature auth (C-2). The client signs a short, time-stamped
// message with its wallet; the server verifies the signature recovers to the
// claimed address. No server-side nonce store is needed, so this works on
// Vercel serverless without Redis. A determined MITM could replay within the
// freshness window; full one-time nonces require a shared store (Phase 1).

const PREFIX = 'SpinForge auth';
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/** Canonical message both client and server build identically. */
export function buildAuthMessage(address: string, ts: number): string {
  return `${PREFIX}\naddress: ${address}\nts: ${ts}`;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Verify that `address` truly authorized this request:
 * the signature must be valid for `message`, recover to `address`, the message
 * must name `address`, and its timestamp must be fresh.
 */
export async function verifyAuth(
  address: string | undefined,
  message: string | undefined,
  signature: string | undefined,
): Promise<AuthResult> {
  if (!address || !message || !signature) {
    return { ok: false, error: 'Missing wallet signature' };
  }

  const lines = message.split('\n');
  const addrLine = lines.find((l) => l.startsWith('address: '));
  const tsLine = lines.find((l) => l.startsWith('ts: '));
  if (lines[0] !== PREFIX || !addrLine || !tsLine) {
    return { ok: false, error: 'Malformed auth message' };
  }

  const msgAddr = addrLine.slice('address: '.length).trim();
  const ts = Number(tsLine.slice('ts: '.length).trim());
  if (msgAddr.toLowerCase() !== address.toLowerCase()) {
    return { ok: false, error: 'Auth address mismatch' };
  }
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_AGE_MS) {
    return { ok: false, error: 'Auth signature expired' };
  }

  try {
    // Throws if the signature is invalid for the message OR does not match address.
    await verifyPersonalMessageSignature(
      new TextEncoder().encode(message),
      signature,
      { address },
    );
    return { ok: true };
  } catch {
    return { ok: false, error: 'Invalid wallet signature' };
  }
}
