import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createHmac } from 'node:crypto';
import { jwtToAddress } from '@mysten/zklogin';

// Server-side zkLogin token verification (H-11). The old callback trusted the
// raw id_token and fabricated an address — anyone could forge a "login". Here we
// verify the JWT against Google's published keys and derive the REAL zkLogin
// address, so a session can only be created from a genuine Google token.

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

// Per-user salt, deterministic from a server secret so the same Google account
// always maps to the same Sui address without a salt database. The secret MUST
// be set in production; a missing secret throws rather than using a guessable
// default (which would let anyone recompute every user's address).
function userSalt(sub: string, aud: string): bigint {
  const secret = process.env.ZKLOGIN_SALT_SECRET;
  if (!secret) throw new Error('ZKLOGIN_SALT_SECRET not configured');
  const mac = createHmac('sha256', secret).update(`${aud}:${sub}`).digest();
  // zkLogin salt must fit in 16 bytes (128 bits).
  return BigInt('0x' + mac.subarray(0, 16).toString('hex'));
}

export interface VerifiedZkLogin {
  address: string;
  sub: string;
  email: string;
  aud: string;
}

/**
 * Verify a Google id_token and derive the user's real zkLogin Sui address.
 * Throws if the signature, issuer, audience, expiry, or nonce is invalid.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce?: string,
): Promise<VerifiedZkLogin> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('zkLogin not configured');

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: clientId,
    // jose checks exp/nbf automatically.
  });

  const sub = String(payload.sub ?? '');
  const aud = Array.isArray(payload.aud) ? payload.aud[0] : String(payload.aud ?? '');
  if (!sub) throw new Error('Token missing sub');

  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new Error('Nonce mismatch');
  }

  const address = jwtToAddress(idToken, userSalt(sub, aud));
  return { address, sub, email: String(payload.email ?? 'unknown'), aud };
}
