import { create } from 'zustand';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { getStoredSession, clearSession, type ZkLoginSession } from '@/lib/zklogin';

export type AuthMethod = 'wallet' | 'zklogin' | null;

interface AuthState {
  zkSession: ZkLoginSession | null;
  setZkSession: (session: ZkLoginSession | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  zkSession: typeof window !== 'undefined' ? getStoredSession() : null,
  setZkSession: (session) => set({ zkSession: session }),
  logout: () => {
    clearSession();
    set({ zkSession: null });
  },
}));

export function useAuth() {
  const walletAccount = useCurrentAccount();
  const { zkSession, logout } = useAuthStore();

  const authMethod: AuthMethod = walletAccount
    ? 'wallet'
    : zkSession
      ? 'zklogin'
      : null;

  const address: string | null = walletAccount?.address ?? zkSession?.address ?? null;
  const displayName: string | null = zkSession?.email
    ?? (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null);

  return {
    isAuthenticated: authMethod !== null,
    authMethod,
    address,
    displayName,
    email: zkSession?.email ?? null,
    logout,
  };
}
