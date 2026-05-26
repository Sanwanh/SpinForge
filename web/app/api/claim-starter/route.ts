import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY ?? '';
const PKG = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '';
const ORIG_PKG = '0xcb4ae0641d8cdf704bf42e3254a3d8463256dd6e77fb005250af16702466ce48';
const SPARK_CAP = '0x40bcb3ceb5f8e1e19f46388f418bccf108e5cd45b9761eec3f6aa0add9c1f45a';
const SUI_RANDOM = '0x8';
const RPC = 'https://fullnode.testnet.sui.io:443';

const claimed = new Set<string>();

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
    const { address } = await request.json();
    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    if (claimed.has(address)) {
      return NextResponse.json({ error: 'Already claimed starter pack.' }, { status: 400 });
    }

    const { secretKey } = decodeSuiPrivateKey(ADMIN_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const admin = keypair.getPublicKey().toSuiAddress();

    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');
    const client = new SuiJsonRpcClient({ url: RPC, network: 'testnet' });

    // Step 1: Mint 500 SPARK
    const tx1 = new Transaction();
    tx1.setSender(admin);
    tx1.moveCall({
      target: `${PKG}::spark_token::mint`,
      arguments: [
        tx1.object(SPARK_CAP),
        tx1.pure.u64(500_000_000_000n),
        tx1.pure.address(address),
      ],
    });
    const bytes1 = await tx1.build({ client });
    const sig1 = await keypair.signTransaction(bytes1);
    await rpc('sui_executeTransactionBlock', [
      Buffer.from(bytes1).toString('base64'), [sig1.signature],
      { showEffects: true }, 'WaitForLocalExecution',
    ]);

    // Step 2: Open a free pack (admin pays, transfer parts to user)
    const adminCoins = await rpc('suix_getCoins', [admin, `${ORIG_PKG}::spark_token::SPARK_TOKEN`, null, 1]);
    const adminCoin = adminCoins.result?.data?.[0]?.coinObjectId;
    if (!adminCoin) {
      return NextResponse.json({ error: 'Admin has no SPARK' }, { status: 500 });
    }

    const tx2 = new Transaction();
    tx2.setSender(admin);
    const [payment] = tx2.splitCoins(tx2.object(adminCoin), [100_000_000_000n]);
    tx2.moveCall({
      target: `${PKG}::pack::open_pack`,
      arguments: [payment, tx2.object(SPARK_CAP), tx2.object(SUI_RANDOM)],
    });
    const bytes2 = await tx2.build({ client });
    const sig2 = await keypair.signTransaction(bytes2);
    const packResult = await rpc('sui_executeTransactionBlock', [
      Buffer.from(bytes2).toString('base64'), [sig2.signature],
      { showEffects: true, showObjectChanges: true }, 'WaitForLocalExecution',
    ]);

    // Transfer created parts to user
    const partIds: string[] = [];
    for (const c of packResult.result?.objectChanges ?? []) {
      if (c.type === 'created' && (c.objectType?.includes('::blade::') || c.objectType?.includes('::ratchet::') || c.objectType?.includes('::bit::'))) {
        partIds.push(c.objectId);
      }
    }

    if (partIds.length > 0) {
      const tx3 = new Transaction();
      tx3.setSender(admin);
      for (const id of partIds) {
        tx3.transferObjects([tx3.object(id)], address);
      }
      const bytes3 = await tx3.build({ client });
      const sig3 = await keypair.signTransaction(bytes3);
      await rpc('sui_executeTransactionBlock', [
        Buffer.from(bytes3).toString('base64'), [sig3.signature],
        { showEffects: true }, 'WaitForLocalExecution',
      ]);
    }

    claimed.add(address);

    return NextResponse.json({
      success: true,
      spark: 500,
      parts: partIds.length,
      partIds,
      message: `Starter pack claimed! 500 SPARK + ${partIds.length} parts.`,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
