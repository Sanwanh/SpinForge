import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { kvGet, kvSet, kvRPush, kvLRange, kvSetNX } from '@/lib/kv';
import { verifyAuth } from '@/lib/auth-verify';
import { isSameOrigin, rateLimited, safeError } from '@/lib/api-guard';

// Community combo board: players post their builds and discuss. Off-chain social
// state (KV), but every write is wallet-signature authenticated (same posture as
// chat/friends/battle-room — audit H-12) so nobody can post as another address.

const ADDR_RE = /^0x[0-9a-fA-F]{2,64}$/;
const ARCHETYPES = ['Attack', 'Defense', 'Stamina', 'Balance'] as const;
const MAX_TITLE = 80;
const MAX_FIELD = 60; // blade / ratchet / bit
const MAX_BODY = 800;
const MAX_COMMENT = 400;
const LIST_CAP = 60;

const IDS_KEY = 'community:post_ids';
const postKey = (id: string) => `community:post:${id}`;
const commentsKey = (id: string) => `community:comments:${id}`;
const votedKey = (id: string, addr: string) => `community:voted:${id}:${addr}`;

interface Post {
  id: string;
  author: string;
  title: string;
  archetype: string;
  blade: string;
  ratchet: string;
  bit: string;
  body: string;
  votes: number;
  commentCount: number;
  ts: number;
}

interface Comment {
  author: string;
  text: string;
  ts: number;
}

function isAddr(v: unknown): v is string {
  return typeof v === 'string' && ADDR_RE.test(v);
}

function cleanField(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s.length === 0 || s.length > max) return null;
  return s;
}

// GET /api/community            -> { posts } (newest first)
// GET /api/community?post=<id>  -> { post, comments }
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('post');
  if (id) {
    if (!/^[a-f0-9]{4,32}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const post = await kvGet<Post>(postKey(id));
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const comments = await kvLRange<Comment>(commentsKey(id), -200, -1);
    return NextResponse.json({ post, comments });
  }

  const ids = await kvLRange<string>(IDS_KEY, -LIST_CAP, -1);
  const posts: Post[] = [];
  for (const pid of ids.reverse()) {
    const p = await kvGet<Post>(postKey(pid));
    if (p) posts.push(p);
  }
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'community', 100, 3600);
    if (limited) return limited;

    const body = await request.json();
    const { action, author } = body;

    if (!isAddr(author)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }
    // Every write proves control of `author` — no posting/voting as someone else.
    const auth = await verifyAuth(author, body.authMessage, body.authSignature);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

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
      const id = randomUUID().replace(/-/g, '').slice(0, 10);
      const post: Post = {
        id, author, title, archetype, blade, ratchet, bit, body: postBody,
        votes: 0, commentCount: 0, ts: Date.now(),
      };
      await kvSet(postKey(id), post);
      await kvRPush(IDS_KEY, id);
      return NextResponse.json({ success: true, post });
    }

    if (action === 'comment') {
      const postId = typeof body.postId === 'string' ? body.postId : '';
      const text = cleanField(body.text, MAX_COMMENT);
      if (!/^[a-f0-9]{4,32}$/.test(postId) || !text) {
        return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
      }
      const post = await kvGet<Post>(postKey(postId));
      if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      const comment: Comment = { author, text, ts: Date.now() };
      await kvRPush(commentsKey(postId), comment);
      await kvSet(postKey(postId), { ...post, commentCount: post.commentCount + 1 });
      return NextResponse.json({ success: true, comment });
    }

    if (action === 'vote') {
      const postId = typeof body.postId === 'string' ? body.postId : '';
      if (!/^[a-f0-9]{4,32}$/.test(postId)) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
      }
      const post = await kvGet<Post>(postKey(postId));
      if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      // One vote per address — atomic claim.
      const fresh = await kvSetNX(votedKey(postId, author));
      if (!fresh) {
        return NextResponse.json({ success: true, votes: post.votes, alreadyVoted: true });
      }
      const updated = { ...post, votes: post.votes + 1 };
      await kvSet(postKey(postId), updated);
      return NextResponse.json({ success: true, votes: updated.votes });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return safeError(err, 'Community action failed');
  }
}
