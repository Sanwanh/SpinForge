import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY ?? '';
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0xcb4ae0641d8cdf704bf42e3254a3d8463256dd6e77fb005250af16702466ce48';
const SPARK_TREASURY_CAP = '0x40bcb3ceb5f8e1e19f46388f418bccf108e5cd45b9761eec3f6aa0add9c1f45a';
const RPC_URL = 'https://fullnode.testnet.sui.io:443';

const claimed = new Set<string>();

async function rpcCall(method: string, params: unknown[]) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    if (!ADMIN_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Faucet not configured' }, { status: 500 });
    }

    if (claimed.has(address)) {
      return NextResponse.json({ error: 'Already claimed. One starter pack per address.' }, { status: 400 });
    }

    const { secretKey } = decodeSuiPrivateKey(ADMIN_PRIVATE_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const sender = keypair.getPublicKey().toSuiAddress();

    const tx = new Transaction();
    tx.setSender(sender);
    tx.setGasOwner(sender);

    tx.moveCall({
      target: `${PACKAGE_ID}::spark_token::mint`,
      arguments: [
        tx.object(SPARK_TREASURY_CAP),
        tx.pure.u64(500_000_000_000n),
        tx.pure.address(address),
      ],
    });

    const builtTx = await tx.build({ client: { getReferenceGasPrice: async () => 1000n, getCoins: async () => ({ data: [], nextCursor: null, hasNextPage: false }) } as never });

    const { signature } = await keypair.signTransaction(builtTx);

    const result = await rpcCall('sui_executeTransactionBlock', [
      Buffer.from(builtTx).toString('base64'),
      [signature],
      { showEffects: true },
      'WaitForLocalExecution',
    ]);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    claimed.add(address);

    return NextResponse.json({
      success: true,
      digest: result.result?.digest,
      spark: 500,
      message: 'Claimed 500 SPARK! You can now open 5 packs.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
