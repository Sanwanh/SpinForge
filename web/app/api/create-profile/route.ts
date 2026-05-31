import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { verifyAuth } from '@/lib/auth-verify';
import { isSameOrigin, safeError, rateLimited, adminBudgetExceeded } from '@/lib/api-guard';
import { loadSigner } from '@/lib/admin-signer';

const PKG = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '';
const RPC = 'https://fullnode.testnet.sui.io:443';
const SUI_CLOCK = '0x6';
const MAX_NAME_LEN = 32;

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'create-profile', 20, 3600);
    if (limited) return limited;
    // H-RT-2: global hourly ceiling on admin-signed profile mints.
    const overBudget = await adminBudgetExceeded('create-profile', 400, 3600);
    if (overBudget) return overBudget;
    const { address, displayName, authMessage, authSignature } = await request.json();
    if (!address || !displayName) {
      return NextResponse.json({ error: 'Missing address or displayName' }, { status: 400 });
    }
    // L-5: bound the display name (the profile is minted to the caller's address).
    if (typeof displayName !== 'string' || displayName.length > MAX_NAME_LEN) {
      return NextResponse.json({ error: 'Invalid display name' }, { status: 400 });
    }
    // C-2: only the address owner may create their own profile.
    const auth = await verifyAuth(address, authMessage, authSignature);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

    // H-RT-3: recorder role (no cap needed — create_and_share is public).
    const { keypair, address: admin } = loadSigner('recorder');

    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');
    const client = new SuiJsonRpcClient({ url: RPC, network: 'testnet' });

    const tx = new Transaction();
    tx.setSender(admin);

    // H-RT-4: create the profile as a SHARED object owned-by-record (`address`),
    // so battle standings can only be settled by the AdminCap-gated backend.
    tx.moveCall({
      target: `${PKG}::player_profile::create_and_share`,
      arguments: [
        tx.pure.string(displayName),
        tx.pure.address(address),
        tx.object(SUI_CLOCK),
      ],
    });

    const bytes = await tx.build({ client });
    const { signature } = await keypair.signTransaction(bytes);

    const result = await rpc('sui_executeTransactionBlock', [
      Buffer.from(bytes).toString('base64'),
      [signature],
      { showEffects: true, showObjectChanges: true },
      'WaitForLocalExecution',
    ]);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    let profileId = '';
    for (const c of result.result?.objectChanges ?? []) {
      if (c.type === 'created' && c.objectType?.includes('player_profile::PlayerProfile')) {
        profileId = c.objectId;
      }
    }

    return NextResponse.json({ success: true, profileId, digest: result.result?.digest });
  } catch (err) {
    return safeError(err, 'Profile creation failed');
  }
}
