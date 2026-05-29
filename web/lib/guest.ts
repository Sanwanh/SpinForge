import { create } from 'zustand';

interface GuestState {
  isGuest: boolean;
  enter: () => void;
  exit: () => void;
  hydrate: () => void;
}

// Guest = "browse without a wallet". Ephemeral (session-scoped), no on-chain
// identity — personal data stays empty and write actions prompt to connect.
export const useGuest = create<GuestState>((set) => ({
  isGuest: false,
  enter: () => {
    try { sessionStorage.setItem('sf_guest', '1'); } catch { /* ignore */ }
    set({ isGuest: true });
  },
  exit: () => {
    try { sessionStorage.removeItem('sf_guest'); } catch { /* ignore */ }
    set({ isGuest: false });
  },
  hydrate: () => {
    try {
      if (sessionStorage.getItem('sf_guest') === '1') set({ isGuest: true });
    } catch { /* ignore */ }
  },
}));
