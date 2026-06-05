import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

// H-RT-3 / C-1 / M-8: capability-separation seam for the backend signer.
//
// Today a single ADMIN_PRIVATE_KEY signs every admin route AND holds every
// TreasuryCap + the AdminCap, so one leak compromises the whole economy. This
// module is the single place key material is loaded, so the split can be rolled
// out by provisioning two keys and transferring the caps on-chain — no route
// code changes:
//
//   MINTER_PRIVATE_KEY   — holds ONLY the SPARK/FORGE TreasuryCaps
//                          (faucet, claim-starter, open-pack)
//   RECORDER_PRIVATE_KEY — holds ONLY the AdminCap
//                          (register-rotor, submit-result, create-profile)
//
// Until those env vars are set, both roles fall back to ADMIN_PRIVATE_KEY, so
// behavior is unchanged. Long-term, replace `decodeSuiPrivateKey(env)` here with
// a KMS/HSM-backed signer so the raw key never enters process.env at all.
export type SignerRole = 'minter' | 'recorder' | 'custodian';

function rawKey(role: SignerRole): string {
  const specific =
    role === 'minter'
      ? process.env.MINTER_PRIVATE_KEY
      : role === 'recorder'
        ? process.env.RECORDER_PRIVATE_KEY
        : process.env.CUSTODIAN_PRIVATE_KEY;
  return specific ?? process.env.ADMIN_PRIVATE_KEY ?? '';
}

export interface Signer {
  keypair: Ed25519Keypair;
  address: string;
}

/**
 * Load the backend signer for a given capability role. Throws if no key is
 * configured (callers let it bubble to the route's catch -> safeError 500).
 */
export function loadSigner(role: SignerRole): Signer {
  const key = rawKey(role);
  if (!key) throw new Error(`Signer not configured for role: ${role}`);
  const { secretKey } = decodeSuiPrivateKey(key);
  const keypair = Ed25519Keypair.fromSecretKey(secretKey);
  return { keypair, address: keypair.getPublicKey().toSuiAddress() };
}
