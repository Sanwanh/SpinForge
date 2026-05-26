import { generateNonce, generateRandomness } from '@mysten/zklogin';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SUI_NETWORK } from './constants';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const ZK_PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';
const FULLNODE_URL = (SUI_NETWORK as string) === 'mainnet'
  ? 'https://fullnode.mainnet.sui.io:443'
  : 'https://fullnode.testnet.sui.io:443';

export interface ZkLoginSession {
  ephemeralKeypair: string;
  randomness: string;
  nonce: string;
  maxEpoch: number;
  jwt: string;
  sub: string;
  email: string;
  address: string;
}

const SESSION_KEY = 'spinforge_zklogin_session';

export function getStoredSession(): ZkLoginSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZkLoginSession;
  } catch {
    return null;
  }
}

export function storeSession(session: ZkLoginSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function getCurrentEpoch(): Promise<number> {
  const res = await fetch(FULLNODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'suix_getLatestSuiSystemState', params: [] }),
  });
  const json = await res.json();
  return Number(json.result.epoch);
}

export async function beginZkLogin(): Promise<string> {
  const ephemeralKeypair = new Ed25519Keypair();
  const randomness = generateRandomness();
  const currentEpoch = await getCurrentEpoch();
  const maxEpoch = currentEpoch + 2;

  const nonce = generateNonce(
    ephemeralKeypair.getPublicKey(),
    maxEpoch,
    randomness,
  );

  sessionStorage.setItem('zklogin_ephemeral', JSON.stringify({
    secretKey: ephemeralKeypair.getSecretKey(),
    randomness,
    nonce,
    maxEpoch,
  }));

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function isZkLoginConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0;
}
