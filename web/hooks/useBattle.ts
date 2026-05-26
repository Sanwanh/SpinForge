'use client';

import { create } from 'zustand';
import type { Zone } from '@/lib/constants';

export interface BattlePlayer {
  address: string;
  beyId: string;
  angularMomentum: number;
  burstIntegrity: number;
  zone: Zone | null;
  wobble: number;
}

export interface BattleState {
  matchId: string | null;
  roundId: string | null;
  scoreA: number;
  scoreB: number;
  turn: number;
  playerA: BattlePlayer | null;
  playerB: BattlePlayer | null;
  phase: 'waiting' | 'bey-select' | 'commit' | 'reveal' | 'resolving' | 'complete';
  log: string[];

  setMatch: (matchId: string) => void;
  setRound: (roundId: string) => void;
  setScores: (a: number, b: number) => void;
  setPhase: (phase: BattleState['phase']) => void;
  setPlayers: (a: BattlePlayer, b: BattlePlayer) => void;
  updatePlayer: (side: 'A' | 'B', updates: Partial<BattlePlayer>) => void;
  addLog: (message: string) => void;
  nextTurn: () => void;
  reset: () => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  matchId: null,
  roundId: null,
  scoreA: 0,
  scoreB: 0,
  turn: 1,
  playerA: null,
  playerB: null,
  phase: 'waiting',
  log: [],

  setMatch: (matchId) => set({ matchId }),
  setRound: (roundId) => set({ roundId }),
  setScores: (scoreA, scoreB) => set({ scoreA, scoreB }),
  setPhase: (phase) => set({ phase }),

  setPlayers: (a, b) => set({ playerA: a, playerB: b }),

  updatePlayer: (side, updates) =>
    set((state) => {
      const key = side === 'A' ? 'playerA' : 'playerB';
      const current = state[key];
      if (!current) return state;
      return { [key]: { ...current, ...updates } };
    }),

  addLog: (message) =>
    set((state) => ({ log: [...state.log, `[T${state.turn}] ${message}`] })),

  nextTurn: () => set((state) => ({ turn: state.turn + 1 })),

  reset: () =>
    set({
      matchId: null,
      roundId: null,
      scoreA: 0,
      scoreB: 0,
      turn: 1,
      playerA: null,
      playerB: null,
      phase: 'waiting',
      log: [],
    }),
}));

export function useBattle() {
  return useBattleStore();
}
