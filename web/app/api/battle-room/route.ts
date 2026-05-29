import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';

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
  return Math.random().toString(36).substring(2, 10).toUpperCase();
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
  const body = await request.json();
  const { action } = body;

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
      const { roomId, winner, finishType, scoreA, scoreB } = body;
      const room = await getRoom(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      room.result = { winner, finishType, scoreA, scoreB };
      room.status = 'submitted';
      await saveRoom(room);
      return NextResponse.json({ success: true, room });
    }

    case 'confirm-result': {
      const { roomId } = body;
      const room = await getRoom(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
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
