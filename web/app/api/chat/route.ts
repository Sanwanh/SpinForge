import { NextRequest, NextResponse } from 'next/server';
import { kvRPush, kvLRange, kvSMembers } from '@/lib/kv';
import { verifyAuth } from '@/lib/auth-verify';
import { isSameOrigin, rateLimited } from '@/lib/api-guard';

const ADDR_RE = /^0x[0-9a-fA-F]{2,64}$/;
const CHAT_TTL = 60 * 60 * 24 * 3; // threads kept 3 days
const MAX_TEXT = 500;

interface ChatMessage {
  from: string;
  text: string;
  ts: number;
}

function isAddr(v: unknown): v is string {
  return typeof v === 'string' && ADDR_RE.test(v);
}

// Same key regardless of who queries, so both participants share one thread.
function threadKey(a: string, b: string): string {
  return `chat:${[a, b].sort().join('__')}`;
}

export async function GET(request: NextRequest) {
  const me = request.nextUrl.searchParams.get('me');
  const friend = request.nextUrl.searchParams.get('friend');
  if (!isAddr(me) || !isAddr(friend)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }
  const messages = await kvLRange<ChatMessage>(threadKey(me, friend), -50, -1);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }
  const limited = await rateLimited(request, 'chat', 120, 3600);
  if (limited) return limited;

  const body = await request.json();
  const { from, to, text } = body;

  if (!isAddr(from) || !isAddr(to)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }
  // Sender must prove control of `from` — no posting as someone else.
  const auth = await verifyAuth(from, body.authMessage, body.authSignature);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  if (typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  // Only allow chatting with confirmed friends.
  const friends = await kvSMembers(`friends:${from}`);
  if (!friends.includes(to)) {
    return NextResponse.json({ error: 'Not friends' }, { status: 403 });
  }

  const msg: ChatMessage = { from, text: text.trim(), ts: Date.now() };
  await kvRPush(threadKey(from, to), msg, CHAT_TTL);
  return NextResponse.json({ success: true, message: msg });
}
