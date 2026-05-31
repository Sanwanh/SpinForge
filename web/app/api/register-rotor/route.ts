import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { verifyAuth } from '@/lib/auth-verify';
import { isSameOrigin, safeError, rateLimited, adminBudgetExceeded } from '@/lib/api-guard';
import { loadSigner } from '@/lib/admin-signer';

const PKG = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0x79e8552bfb9b9cf61b3534a03061b222f022671be4b384efa55d557586ed2110';
const ADMIN_CAP = '0xe6f16e912dbd2a9ee58bc8207648e9225dfe00d95e4888ddcafa1b8239383090';
// M-1: register_rotor now asserts the recipient is not on the GameConfig ban list.
const GAME_CONFIG = '0xa72dad0e0757d98fad022feae4dd64f5281ad89db246c4377f714080e26ab41a';
const RPC = 'https://fullnode.testnet.sui.io:443';

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
    const limited = await rateLimited(request, 'register-rotor', 30, 3600);
    if (limited) return limited;
    // H-RT-2: cap total admin-signed rotor mints per hour as a circuit breaker.
    const overBudget = await adminBudgetExceeded('register-rotor', 400, 3600);
    if (overBudget) return overBudget;
    const { address, bladeName, spiritBeast, beyType, spinDirection, ratchetProng, ratchetHeight, bitName, bitCategory, authMessage, authSignature } = await request.json();

    if (!address || !bladeName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // C-2: the AdminCap-signed mint goes to `address` — require that the caller
    // controls it, so anonymous callers can't mint rotors to arbitrary wallets.
    const auth = await verifyAuth(address, authMessage, authSignature);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

    // H-RT-3: recorder role holds only the AdminCap once keys are split.
    const { keypair, address: admin } = loadSigner('recorder');

    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');
    const client = new SuiJsonRpcClient({ url: RPC, network: 'testnet' });

    const rotorName = `${bladeName} ${ratchetProng ?? 3}-${ratchetHeight ?? 60} ${bitName ?? 'Flat'}`;

    const tx = new Transaction();
    tx.setSender(admin);

    tx.moveCall({
      target: `${PKG}::register::register_rotor`,
      arguments: [
        tx.object(ADMIN_CAP),
        tx.object(GAME_CONFIG),
        tx.pure.string(bladeName),
        tx.pure.u8(spiritBeast ?? 0),
        tx.pure.u8(beyType ?? 0),
        tx.pure.u8(spinDirection ?? 0),
        tx.pure.u8(ratchetProng ?? 3),
        tx.pure.u8(ratchetHeight ?? 60),
        tx.pure.string(bitName ?? 'Flat'),
        tx.pure.u8(bitCategory ?? 0),
        tx.pure.string(rotorName),
        tx.pure.address(address),
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

    const status = result.result?.effects?.status?.status;
    if (status !== 'success') {
      return NextResponse.json({ error: `Transaction failed: ${status}` }, { status: 500 });
    }

    let beyId = '';
    for (const c of result.result?.objectChanges ?? []) {
      if (c.type === 'created' && c.objectType?.includes('::bey::Bey')) {
        beyId = c.objectId;
      }
    }

    return NextResponse.json({
      success: true,
      beyId,
      digest: result.result?.digest,
      name: rotorName,
      message: `Rotor registered on-chain! Your ${bladeName} now has a digital passport.`,
    });
  } catch (err) {
    return safeError(err, 'Rotor registration failed');
  }
}
