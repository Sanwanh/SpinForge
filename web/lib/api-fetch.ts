'use client';

// Thin client fetch wrapper for the session-authenticated API. Always sends the
// session cookie (credentials:'include'); identity comes from that cookie, never
// from the request body. POSTs JSON when a body is given, otherwise GETs.
export async function api(path: string, body?: unknown): Promise<Response> {
  const init: RequestInit = {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  };
  if (body !== undefined) {
    init.method = 'POST';
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  } else {
    init.method = 'GET';
  }
  return fetch(path, init);
}
