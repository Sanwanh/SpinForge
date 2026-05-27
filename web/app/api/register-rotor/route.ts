import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY ?? '';
const PKG = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '';
const ADMIN_CAP = '0x6aa381e305390071088b576812732f934722fd11951b702ee42d1c0e2c774078';
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
    const { address, bladeName, spiritBeast, beyType, spinDirection, ratchetProng, ratchetHeight, bitName, bitCategory } = await request.json();

    if (!address || !bladeName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { secretKey } = decodeSuiPrivateKey(ADMIN_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const admin = keypair.getPublicKey().toSuiAddress();

    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');
    const client = new SuiJsonRpcClient({ url: RPC, network: 'testnet' });

    const rotorName = `${bladeName} ${ratchetProng ?? 3}-${ratchetHeight ?? 60} ${bitName ?? 'Flat'}`;

    const tx = new Transaction();
    tx.setSender(admin);

    tx.moveCall({
      target: `${PKG}::register::register_rotor`,
      arguments: [
        tx.object(ADMIN_CAP),
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
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
