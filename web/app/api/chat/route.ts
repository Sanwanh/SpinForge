import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser } from '@/lib/server-user';
import { isSameOrigin, rateLimited, safeError } from '@/lib/api-guard';

// 1:1 direct chat, session-authenticated over Postgres. The sender is ALWAYS the
// session user — never a body field. Threads are keyed by the canonical (low,
// high) user-id pair so both participants share one row. Chatting is gated on an
// accepted friendship.

const HANDLE_RE = /^[A-Za-z0-9_-]{2,40}$/;
const MAX_TEXT = 500;
const PAGE = 50;

interface ProfileRow { user_id: string; handle: string; [k: string]: unknown }

function isHandle(v: unknown): v is string {
  return typeof v === 'string' && HANDLE_RE.test(v);
}

function pair(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

async function findUserByHandle(handle: string): Promise<ProfileRow | null> {
  const rows = await db.execute<ProfileRow>(sql`
    SELECT user_id, handle FROM profiles WHERE handle = ${handle} LIMIT 1
  `);
  return rows[0] ?? null;
}

async function areFriends(low: string, high: string): Promise<boolean> {
  const rows = await db.execute<{ id: string; [k: string]: unknown }>(sql`
    SELECT id FROM friendships
    WHERE user_low_id = ${low} AND user_high_id = ${high} AND status = 'accepted'
    LIMIT 1
  `);
  return !!rows[0];
}

// GET /api/chat?friend=<handle> -> { messages } (oldest..newest, last 50)
export async function GET(request: NextRequest) {
  try {
    const guard = await requireGameUser(request.headers);
    if ('error' in guard) return guard.error;
    const me = guard.user.id;

    const friendHandle = request.nextUrl.searchParams.get('friend');
    if (!isHandle(friendHandle)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }
    const friend = await findUserByHandle(friendHandle);
    if (!friend) return NextResponse.json({ messages: [] });

    const { low, high } = pair(me, friend.user_id);
    if (!(await areFriends(low, high))) {
      return NextResponse.json({ messages: [] });
    }

    const rows = await db.execute<{ handle: string; body: string; created_at: string; [k: string]: unknown }>(sql`
      SELECT p.handle AS handle, m.body AS body, m.created_at AS created_at
      FROM chat_messages m
      JOIN direct_chat_threads t ON t.id = m.thread_id
      JOIN profiles p ON p.user_id = m.sender_id
      WHERE t.user_low_id = ${low} AND t.user_high_id = ${high}
      ORDER BY m.created_at DESC
      LIMIT ${PAGE}
    `);
    const messages = rows
      .reverse()
      .map((r) => ({ from: r.handle, text: r.body, ts: new Date(r.created_at).getTime() }));
    return NextResponse.json({ messages });
  } catch (err) {
    return safeError(err, 'Failed to load chat');
  }
}

// POST /api/chat { to: <handle>, text } -> { success, message }
export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'chat', 120, 3600);
    if (limited) return limited;

    const guard = await requireGameUser(request.headers);
    if ('error' in guard) return guard.error;
    const me = guard.user;

    const body = await request.json();
    if (!isHandle(body.to)) {
      return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
    }
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (text.length === 0) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }
    if (text.length > MAX_TEXT) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const friend = await findUserByHandle(body.to);
    if (!friend) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { low, high } = pair(me.id, friend.user_id);
    if (!(await areFriends(low, high))) {
      return NextResponse.json({ error: 'Not friends' }, { status: 403 });
    }

    const message = await db.transaction(async (tx) => {
      await tx.execute(sql`
        INSERT INTO direct_chat_threads (user_low_id, user_high_id)
        VALUES (${low}, ${high})
        ON CONFLICT (user_low_id, user_high_id) DO NOTHING
      `);
      const threadRows = await tx.execute<{ id: string; [k: string]: unknown }>(sql`
        SELECT id FROM direct_chat_threads WHERE user_low_id = ${low} AND user_high_id = ${high} LIMIT 1
      `);
      const threadId = threadRows[0].id;
      const inserted = await tx.execute<{ created_at: string; [k: string]: unknown }>(sql`
        INSERT INTO chat_messages (thread_id, sender_id, body)
        VALUES (${threadId}, ${me.id}, ${text})
        RETURNING created_at
      `);
      await tx.execute(sql`
        UPDATE direct_chat_threads SET last_message_at = now() WHERE id = ${threadId}
      `);
      return { from: me.handle, text, ts: new Date(inserted[0].created_at).getTime() };
    });

    return NextResponse.json({ success: true, message });
  } catch (err) {
    return safeError(err, 'Failed to send message');
  }
}
