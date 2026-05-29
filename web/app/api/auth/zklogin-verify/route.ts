import { NextRequest, NextResponse } from 'next/server';
import { verifyGoogleIdToken } from '@/lib/zklogin-verify';
import { isSameOrigin, safeError } from '@/lib/api-guard';

// Verifies a Google id_token server-side and returns the real zkLogin address.
// Replaces the old client-side fabricated address (H-11).
export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const { idToken, nonce } = await request.json();
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing id token' }, { status: 400 });
    }
    const verified = await verifyGoogleIdToken(idToken, typeof nonce === 'string' ? nonce : undefined);
    return NextResponse.json({ success: true, ...verified });
  } catch (err) {
    // Verification failures are client errors (forged/expired/misconfigured token).
    const message = err instanceof Error ? err.message : 'Verification failed';
    const status = message.includes('not configured') ? 500 : 401;
    return status === 500 ? safeError(err, 'zkLogin not configured') : NextResponse.json({ error: 'Invalid Google token' }, { status });
  }
}
