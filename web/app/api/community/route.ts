import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { requireGameUser } from '@/lib/server-user';
import { isSameOrigin, rateLimited, safeError } from '@/lib/api-guard';

// Community combo board, session-authenticated over Postgres. Every write is the
// session user — the author is NEVER taken from the request body. The flat combo
// fields (archetype/blade/ratchet/bit) live in community_posts.combo_data; the
// route reshapes them back into the flat post object the UI consumes.

const ARCHETYPES = ['Attack', 'Defense', 'Stamina', 'Balance'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE = 80;
const MAX_FIELD = 60; // blade / ratchet / bit
const MAX_BODY = 800;
const MAX_COMMENT = 400;
const LIST_CAP = 60;

interface ComboData {
  archetype: string;
  blade: string;
  ratchet: string;
  bit: string;
}

interface PostRow {
  id: string;
  handle: string;
  title: string;
  body: string;
  combo_data: ComboData | null;
  score: number;
  comment_count: number;
  created_at: string;
  [k: string]: unknown;
}

function cleanField(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s.length === 0 || s.length > max) return null;
  return s;
}

// Reshape a DB row into the flat post object the existing UI renders.
function shapePost(r: PostRow) {
  const combo = r.combo_data ?? { archetype: '', blade: '', ratchet: '', bit: '' };
  return {
    id: r.id,
    author: r.handle,
    title: r.title,
    archetype: combo.archetype,
    blade: combo.blade,
    ratchet: combo.ratchet,
    bit: combo.bit,
    body: r.body,
    votes: r.score,
    commentCount: r.comment_count,
    ts: new Date(r.created_at).getTime(),
  };
}

// GET /api/community           -> { posts } (newest first)
// GET /api/community?post=<id> -> { post, comments }
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('post');
    if (id) {
      if (!UUID_RE.test(id)) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
      }
      const postRows = await db.execute<PostRow>(sql`
        SELECT cp.id, p.handle AS handle, cp.title, cp.body, cp.combo_data,
               cp.score, cp.comment_count, cp.created_at
        FROM community_posts cp
        JOIN profiles p ON p.user_id = cp.author_id
        WHERE cp.id = ${id}
        LIMIT 1
      `);
      if (!postRows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const commentRows = await db.execute<{ handle: string; body: string; created_at: string }>(sql`
        SELECT p.handle AS handle, c.body AS body, c.created_at AS created_at
        FROM community_comments c
        JOIN profiles p ON p.user_id = c.author_id
        WHERE c.post_id = ${id}
        ORDER BY c.created_at ASC
        LIMIT 200
      `);
      const comments = commentRows.map((c) => ({
        author: c.handle,
        text: c.body,
        ts: new Date(c.created_at).getTime(),
      }));
      return NextResponse.json({ post: shapePost(postRows[0]), comments });
    }

    const rows = await db.execute<PostRow>(sql`
      SELECT cp.id, p.handle AS handle, cp.title, cp.body, cp.combo_data,
             cp.score, cp.comment_count, cp.created_at
      FROM community_posts cp
      JOIN profiles p ON p.user_id = cp.author_id
      ORDER BY cp.created_at DESC
      LIMIT ${LIST_CAP}
    `);
    return NextResponse.json({ posts: rows.map(shapePost) });
  } catch (err) {
    return safeError(err, 'Failed to load community');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'community', 100, 3600);
    if (limited) return limited;

    const guard = await requireGameUser(request.headers);
    if ('error' in guard) return guard.error;
    const me = guard.user;

    const body = await request.json();
    const action = body?.action;

    if (action === 'post') {
      const title = cleanField(body.title, MAX_TITLE);
      const blade = cleanField(body.blade, MAX_FIELD);
      const ratchet = cleanField(body.ratchet, MAX_FIELD);
      const bit = cleanField(body.bit, MAX_FIELD);
      const postBody = cleanField(body.body, MAX_BODY);
      const archetype = typeof body.archetype === 'string' && ARCHETYPES.includes(body.archetype as never)
        ? body.archetype
        : null;
      if (!title || !archetype || !blade || !ratchet || !bit || !postBody) {
        return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
      }
      const comboData = { archetype, blade, ratchet, bit };
      const rows = await db.execute<PostRow>(sql`
        INSERT INTO community_posts (author_id, title, body, combo_data)
        VALUES (${me.id}, ${title}, ${postBody}, ${JSON.stringify(comboData)}::jsonb)
        RETURNING id, ${me.handle} AS handle, title, body, combo_data, score, comment_count, created_at
      `);
      return NextResponse.json({ success: true, post: shapePost(rows[0]) });
    }

    if (action === 'comment') {
      const postId = typeof body.postId === 'string' ? body.postId : '';
      const text = cleanField(body.text, MAX_COMMENT);
      if (!UUID_RE.test(postId) || !text) {
        return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
      }
      const comment = await db.transaction(async (tx) => {
        const exists = await tx.execute<{ id: string }>(sql`
          SELECT id FROM community_posts WHERE id = ${postId} LIMIT 1
        `);
        if (!exists[0]) return null;
        const inserted = await tx.execute<{ created_at: string }>(sql`
          INSERT INTO community_comments (post_id, author_id, body)
          VALUES (${postId}, ${me.id}, ${text})
          RETURNING created_at
        `);
        await tx.execute(sql`
          UPDATE community_posts
          SET comment_count = comment_count + 1, updated_at = now()
          WHERE id = ${postId}
        `);
        return { author: me.handle, text, ts: new Date(inserted[0].created_at).getTime() };
      });
      if (!comment) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      return NextResponse.json({ success: true, comment });
    }

    if (action === 'vote') {
      const postId = typeof body.postId === 'string' ? body.postId : '';
      if (!UUID_RE.test(postId)) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
      }
      const result = await db.transaction(async (tx) => {
        const post = await tx.execute<{ score: number }>(sql`
          SELECT score FROM community_posts WHERE id = ${postId} LIMIT 1
        `);
        if (!post[0]) return { notFound: true as const };
        // One vote per user per post — the unique index makes a re-vote a no-op.
        const claimed = await tx.execute<{ post_id: string }>(sql`
          INSERT INTO community_votes (post_id, user_id, value)
          VALUES (${postId}, ${me.id}, 1)
          ON CONFLICT (post_id, user_id) DO NOTHING
          RETURNING post_id
        `);
        if (!claimed[0]) {
          return { votes: post[0].score, alreadyVoted: true as const };
        }
        const updated = await tx.execute<{ score: number }>(sql`
          UPDATE community_posts
          SET score = score + 1, updated_at = now()
          WHERE id = ${postId}
          RETURNING score
        `);
        return { votes: updated[0].score, alreadyVoted: false as const };
      });
      if ('notFound' in result) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, votes: result.votes, alreadyVoted: result.alreadyVoted });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return safeError(err, 'Community action failed');
  }
}
