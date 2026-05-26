import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY ?? '';
const PKG = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '';
const RPC = 'https://fullnode.testnet.sui.io:443';
const SUI_CLOCK = '0x6';

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
    const { playerA, playerB, rotorA, rotorB, winner, finishType, scoreA, scoreB } = await request.json();

    if (!playerA || !playerB || !rotorA || !rotorB || !winner) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { secretKey } = decodeSuiPrivateKey(ADMIN_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const admin = keypair.getPublicKey().toSuiAddress();

    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');
    const client = new SuiJsonRpcClient({ url: RPC, network: 'testnet' });

    const tx = new Transaction();
    tx.setSender(admin);

    const [record] = tx.moveCall({
      target: `${PKG}::battle_record::create`,
      arguments: [
        tx.pure.address(playerA),
        tx.pure.address(playerB),
        tx.pure.id(rotorA),
        tx.pure.id(rotorB),
        tx.pure.address(winner),
        tx.pure.u8(finishType ?? 0),
        tx.pure.u8(scoreA ?? 7),
        tx.pure.u8(scoreB ?? 0),
        tx.object(SUI_CLOCK),
      ],
    });

    tx.transferObjects([record], admin);

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

    let recordId = '';
    for (const c of result.result?.objectChanges ?? []) {
      if (c.type === 'created' && c.objectType?.includes('battle_record::BattleRecord')) {
        recordId = c.objectId;
      }
    }

    return NextResponse.json({
      success: true,
      recordId,
      digest: result.result?.digest,
      message: 'Battle record created on-chain.',
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
