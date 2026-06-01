// Server-only on-chain relay. Every Sui write is signed by a backend role
// (minter / recorder / custodian) — there are no per-user wallets. Mirrors the
// build->sign->execute pattern in app/api/submit-result/route.ts, factored so
// route handlers just describe the moveCalls and read back created objects.

import { Transaction } from '@mysten/sui/transactions';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { loadSigner } from './admin-signer';

const RPC = 'https://fullnode.testnet.sui.io:443';

// Platform custody address — owns every Blade/Ratchet/Bit/Bey/BattleRecord.
// Resolved once at module load from the custodian signer. Falls back to '' when
// no key is configured (e.g. `next build` with no env) so the import is safe;
// any real relay call still loads the signer and throws if it is missing.
function resolveCustody(): string {
  try {
    return loadSigner('custodian').address;
  } catch {
    return '';
  }
}

export const PLATFORM_CUSTODY: string = resolveCustody();

let cachedClient: SuiJsonRpcClient | null = null;

/** Shared read/write JSON-RPC client for the testnet fullnode. */
export function getSuiClient(): SuiJsonRpcClient {
  if (!cachedClient) {
    cachedClient = new SuiJsonRpcClient({ url: RPC, network: 'testnet' });
  }
  return cachedClient;
}

export interface RelayCreated {
  objectId: string;
  objectType: string;
}

export interface RelayResult {
  digest: string;
  status: string;
  created: RelayCreated[];
}

/**
 * Build a transaction with `build`, sign it with the given role's signer, and
 * execute it. The signer is set as the tx sender so platform-owned mutations
 * are authorized. Returns the digest, execution status, and created objects.
 * Throws on a non-success on-chain status so callers can mark the operation
 * failed / reconcile.
 */
export async function submitRelay(
  role: 'minter' | 'recorder' | 'custodian',
  build: (tx: Transaction) => void,
): Promise<RelayResult> {
  const { keypair, address } = loadSigner(role);
  const client = getSuiClient();

  const tx = new Transaction();
  tx.setSender(address);
  build(tx);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  const status = result.effects?.status?.status ?? 'unknown';
  if (status !== 'success') {
    const reason = result.effects?.status?.error ?? status;
    throw new Error(`Relay tx failed: ${reason}`);
  }

  const created: RelayCreated[] = [];
  for (const change of result.objectChanges ?? []) {
    if (change.type === 'created') {
      created.push({ objectId: change.objectId, objectType: change.objectType });
    }
  }

  return { digest: result.digest, status, created };
}
