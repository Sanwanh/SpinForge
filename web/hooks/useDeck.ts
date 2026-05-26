'use client';

import { create } from 'zustand';

export interface DeckBey {
  beyId: string;
  name: string;
  bladeId: string;
  ratchetId: string;
  bitId: string;
}

export interface DeckState {
  beys: (DeckBey | null)[];
  techniques: string[];
  hasDuplicates: boolean;

  setBey: (slot: number, bey: DeckBey | null) => void;
  setTechniques: (techs: string[]) => void;
  clear: () => void;
}

function checkDuplicates(beys: (DeckBey | null)[]): boolean {
  const partIds = new Set<string>();
  for (const bey of beys) {
    if (!bey) continue;
    for (const id of [bey.bladeId, bey.ratchetId, bey.bitId]) {
      if (partIds.has(id)) return true;
      partIds.add(id);
    }
  }
  return false;
}

export const useDeckStore = create<DeckState>((set) => ({
  beys: [null, null, null],
  techniques: [],
  hasDuplicates: false,

  setBey: (slot, bey) =>
    set((state) => {
      const next = [...state.beys];
      next[slot] = bey;
      return { beys: next, hasDuplicates: checkDuplicates(next) };
    }),

  setTechniques: (techniques) => set({ techniques }),

  clear: () => set({ beys: [null, null, null], techniques: [], hasDuplicates: false }),
}));

export function useDeck() {
  return useDeckStore();
}
