import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY ?? '';
const PKG = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '';
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

    const tx = new Transaction();
    tx.setSender(admin);

    // Mint Blade (using real Beyblade X part names)
    const [blade] = tx.moveCall({
      target: `${PKG}::blade::mint`,
      arguments: [
        tx.pure.string(bladeName),
        tx.pure.u8(spiritBeast ?? 0),
        tx.pure.u8(beyType ?? 0),
        tx.pure.u8(spinDirection ?? 0),
        tx.pure.u16(70), // base ATK
        tx.pure.u16(30), // base recoil
        tx.pure.u8(1),   // Rare (registered = verified)
      ],
    });

    // Mint Ratchet
    const [ratchet] = tx.moveCall({
      target: `${PKG}::ratchet::mint`,
      arguments: [
        tx.pure.u8(ratchetProng ?? 3),
        tx.pure.u8(ratchetHeight ?? 60),
        tx.pure.u16(120), // weight
        tx.pure.u16(300), // burst resistance
        tx.pure.u8(1),    // Rare
      ],
    });

    // Mint Bit
    const [bit] = tx.moveCall({
      target: `${PKG}::bit::mint`,
      arguments: [
        tx.pure.string(bitName ?? 'Flat'),
        tx.pure.u8(bitCategory ?? 0),
        tx.pure.u16(40), // friction
        tx.pure.u16(3),  // mobility
        tx.pure.u8(0),   // no gear
        tx.pure.bool(false),
        tx.pure.u8(1),   // Rare
      ],
    });

    // Assemble into Bey
    const [bey] = tx.moveCall({
      target: `${PKG}::bey::assemble`,
      arguments: [blade, ratchet, bit, tx.pure.string(`${bladeName} ${ratchetProng ?? 3}-${ratchetHeight ?? 60} ${bitName ?? 'Flat'}`)],
    });

    // Transfer assembled Bey to user
    tx.transferObjects([bey], address);

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
      name: `${bladeName} ${ratchetProng ?? 3}-${ratchetHeight ?? 60} ${bitName ?? 'Flat'}`,
      message: `Rotor registered on-chain! Your ${bladeName} now has a digital passport.`,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
