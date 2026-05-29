import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers } from '@/lib/kv';
import { verifyAuth } from '@/lib/auth-verify';
import { isSameOrigin, rateLimited } from '@/lib/api-guard';

const ADDR_RE = /^0x[0-9a-fA-F]{2,64}$/;
const INVITE_TTL = 60 * 10; // battle invites live 10 minutes

const friendsKey = (a: string) => `friends:${a}`;
const reqKey = (a: string) => `friend_req:${a}`;
const inviteKey = (a: string) => `battle_invite:${a}`;

interface BattleInvite {
  from: string;
  roomId: string;
  at: number;
}

function isAddr(v: unknown): v is string {
  return typeof v === 'string' && ADDR_RE.test(v);
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!isAddr(address)) {
    return NextResponse.json({ error: 'Missing or invalid address' }, { status: 400 });
  }
  const [friends, requests, invite] = await Promise.all([
    kvSMembers(friendsKey(address)),
    kvSMembers(reqKey(address)),
    kvGet<BattleInvite>(inviteKey(address)),
  ]);
  return NextResponse.json({ friends, requests, invite: invite ?? null });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }
  const limited = await rateLimited(request, 'friends', 60, 3600);
  if (limited) return limited;

  const body = await request.json();
  const { action } = body;

  // The acting address is `me` (accept/decline/remove/clear-invite) or `from`
  // (request/invite-battle). Require a wallet signature proving control of it so
  // nobody can act as another address. (audit: chat/friends spoofing)
  const actor = body.me ?? body.from;
  const auth = await verifyAuth(actor, body.authMessage, body.authSignature);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  switch (action) {
    case 'request': {
      const { from, to } = body;
      if (!isAddr(from) || !isAddr(to)) {
        return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
      }
      if (from === to) {
        return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 });
      }
      // Already friends? no-op success.
      const existing = await kvSMembers(friendsKey(from));
      if (existing.includes(to)) {
        return NextResponse.json({ success: true, alreadyFriends: true });
      }
      await kvSAdd(reqKey(to), from);
      return NextResponse.json({ success: true });
    }

    case 'accept': {
      const { me, from } = body;
      if (!isAddr(me) || !isAddr(from)) {
        return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
      }
      const pending = await kvSMembers(reqKey(me));
      if (!pending.includes(from)) {
        return NextResponse.json({ error: 'No such request' }, { status: 404 });
      }
      await Promise.all([
        kvSAdd(friendsKey(me), from),
        kvSAdd(friendsKey(from), me),
        kvSRem(reqKey(me), from),
      ]);
      return NextResponse.json({ success: true });
    }

    case 'decline': {
      const { me, from } = body;
      if (!isAddr(me) || !isAddr(from)) {
        return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
      }
      await kvSRem(reqKey(me), from);
      return NextResponse.json({ success: true });
    }

    case 'remove': {
      const { me, friend } = body;
      if (!isAddr(me) || !isAddr(friend)) {
        return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
      }
      await Promise.all([
        kvSRem(friendsKey(me), friend),
        kvSRem(friendsKey(friend), me),
      ]);
      return NextResponse.json({ success: true });
    }

    case 'invite-battle': {
      const { from, to, roomId } = body;
      if (!isAddr(from) || !isAddr(to) || typeof roomId !== 'string') {
        return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
      }
      const invite: BattleInvite = { from, roomId, at: Date.now() };
      await kvSet(inviteKey(to), invite, INVITE_TTL);
      return NextResponse.json({ success: true });
    }

    case 'clear-invite': {
      const { me } = body;
      if (!isAddr(me)) {
        return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
      }
      await kvDel(inviteKey(me));
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
