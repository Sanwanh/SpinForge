import { NextResponse } from 'next/server';
import { auth } from './auth';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Resolve the authenticated user from the request's session cookie, or null.
 * API routes call this internally — identity comes from the session, NEVER from
 * a client-supplied `address`/`author`/`submitter` field.
 */
export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name };
}

/** Throwable guard: returns the user or a 401 NextResponse. */
export async function requireUser(
  headers: Headers,
): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await getSessionUser(headers);
  if (!user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  return { user };
}
