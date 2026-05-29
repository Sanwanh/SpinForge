import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { kvGet, kvSet } from '@/lib/kv';
import { verifyAuth } from '@/lib/auth-verify';
import { isSameOrigin, rateLimited } from '@/lib/api-guard';

interface BattleRoom {
  id: string;
  creator: string;
  creatorRotor: string | null;
  creatorRotorName: string | null;
  opponent: string | null;
  opponentRotor: string | null;
  opponentRotorName: string | null;
  status: 'waiting' | 'ready' | 'in_progress' | 'submitted' | 'confirmed' | 'completed';
  result: {
    winner: string;
    finishType: number;
    scoreA: number;
    scoreB: number;
  } | null;
  createdAt: number;
}

const ROOM_TTL = 60 * 60; // rooms live 1 hour
const roomKey = (id: string) => `room:${id}`;

function generateId(): string {
  // Cryptographically random room code (not Math.random, which is guessable).
  return randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}

async function getRoom(id: string): Promise<BattleRoom | null> {
  if (!id) return null;
  return kvGet<BattleRoom>(roomKey(id));
}

async function saveRoom(room: BattleRoom): Promise<void> {
  await kvSet(roomKey(room.id), room, ROOM_TTL);
}

// Lobby browse is not supported on serverless (no shared index); the UI joins by
// code, so this just returns an empty list.
export async function GET() {
  return NextResponse.json({ rooms: [] });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }
  const limited = await rateLimited(request, 'battle-room', 120, 3600);
  if (limited) return limited;

  const body = await request.json();
  const { action } = body;

  // 'get' is a read; everything else mutates the room as a specific actor who
  // must prove control of their address. (audit: battle-room tamper)
  if (action !== 'get') {
    const actor = body.creator ?? body.opponent ?? body.player ?? body.submitter ?? body.confirmer;
    const auth = await verifyAuth(actor, body.authMessage, body.authSignature);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
  }

  switch (action) {
    case 'create': {
      const { creator } = body;
      if (!creator) return NextResponse.json({ error: 'Missing creator' }, { status: 400 });
      const id = generateId();
      const room: BattleRoom = {
        id,
        creator,
        creatorRotor: null,
        creatorRotorName: null,
        opponent: null,
        opponentRotor: null,
        opponentRotorName: null,
        status: 'waiting',
        result: null,
        createdAt: Date.now(),
      };
      await saveRoom(room);
      return NextResponse.json({ success: true, roomId: id, room });
    }

    case 'join': {
      const { roomId, opponent } = body;
      const room = await getRoom(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      if (room.status !== 'waiting') return NextResponse.json({ error: 'Room not available' }, { status: 400 });
      if (room.creator === opponent) return NextResponse.json({ error: 'Cannot join your own room' }, { status: 400 });
      room.opponent = opponent;
      room.status = 'ready';
      await saveRoom(room);
      return NextResponse.json({ success: true, room });
    }

    case 'select-rotor': {
      const { roomId, player, rotorId, rotorName } = body;
      const room = await getRoom(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      const nameStr = typeof rotorName === 'string' ? rotorName : null;
      if (player === room.creator) {
        room.creatorRotor = rotorId;
        room.creatorRotorName = nameStr;
      } else if (player === room.opponent) {
        room.opponentRotor = rotorId;
        room.opponentRotorName = nameStr;
      } else {
        return NextResponse.json({ error: 'Not a participant' }, { status: 400 });
      }

      if (room.creatorRotor && room.opponentRotor) room.status = 'in_progress';
      await saveRoom(room);
      return NextResponse.json({ success: true, room });
    }

    case 'submit-result': {
      const { roomId, submitter, winner, finishType, scoreA, scoreB } = body;
      const room = await getRoom(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      if (submitter !== room.creator && submitter !== room.opponent) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
      }
      if (winner !== room.creator && winner !== room.opponent) {
        return NextResponse.json({ error: 'Winner must be a participant' }, { status: 400 });
      }
      room.result = { winner, finishType, scoreA, scoreB };
      room.status = 'submitted';
      await saveRoom(room);
      return NextResponse.json({ success: true, room });
    }

    case 'confirm-result': {
      const { roomId, confirmer } = body;
      const room = await getRoom(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      if (confirmer !== room.creator && confirmer !== room.opponent) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
      }
      if (!room.result) return NextResponse.json({ error: 'No result to confirm' }, { status: 400 });
      room.status = 'confirmed';
      await saveRoom(room);
      return NextResponse.json({ success: true, room });
    }

    case 'get': {
      const { roomId } = body;
      const room = await getRoom(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      return NextResponse.json({ room });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
