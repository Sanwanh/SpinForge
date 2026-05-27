import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY ?? '';
// PACKAGE_ID = latest upgraded version (where executable code lives, used in Move calls)
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0xcb4ae0641d8cdf704bf42e3254a3d8463256dd6e77fb005250af16702466ce48';
// ORIGINAL_PACKAGE_ID = where the SPARK_TOKEN type was first defined.
// Sui type identity is bound to the original package, never to upgraded versions —
// so balance/coin queries must use the original, even though Move calls use the latest.
const ORIGINAL_PACKAGE_ID = '0xcb4ae0641d8cdf704bf42e3254a3d8463256dd6e77fb005250af16702466ce48';
const SPARK_TYPE = `${ORIGINAL_PACKAGE_ID}::spark_token::SPARK_TOKEN`;
const SPARK_TREASURY_CAP = '0x40bcb3ceb5f8e1e19f46388f418bccf108e5cd45b9761eec3f6aa0add9c1f45a';
const SUI_RANDOM = '0x8';
const RPC_URL = 'https://fullnode.testnet.sui.io:443';
const PACK_COST = 100_000_000_000n;

async function rpc(method: string, params: unknown[]) {
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
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { secretKey } = decodeSuiPrivateKey(ADMIN_PRIVATE_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const admin = keypair.getPublicKey().toSuiAddress();

    const balRes = await rpc('suix_getBalance', [address, SPARK_TYPE]);
    const userBalance = BigInt(balRes.result?.totalBalance ?? '0');

    if (userBalance < PACK_COST) {
      return NextResponse.json({
        error: `Not enough SPARK. You have ${Number(userBalance) / 1e9}, need 100.`,
      }, { status: 400 });
    }

    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');
    const client = new SuiJsonRpcClient({ url: RPC_URL, network: 'testnet' });

    const adminCoinsRes = await rpc('suix_getCoins', [admin, SPARK_TYPE, null, 1]);
    const adminSparkCoin = adminCoinsRes.result?.data?.[0]?.coinObjectId;

    if (!adminSparkCoin) {
      return NextResponse.json({ error: 'Admin has no SPARK for pack opening' }, { status: 500 });
    }

    const tx = new Transaction();
    tx.setSender(admin);

    const [payment] = tx.splitCoins(tx.object(adminSparkCoin), [PACK_COST]);

    tx.moveCall({
      target: `${PACKAGE_ID}::pack::open_pack`,
      arguments: [
        payment,
        tx.object(SPARK_TREASURY_CAP),
        tx.object(SUI_RANDOM),
      ],
    });

    const bytes = await tx.build({ client });
    const { signature } = await keypair.signTransaction(bytes);

    const execResult = await rpc('sui_executeTransactionBlock', [
      Buffer.from(bytes).toString('base64'),
      [signature],
      { showEffects: true, showObjectChanges: true },
      'WaitForLocalExecution',
    ]);

    if (execResult.error) {
      return NextResponse.json({ error: execResult.error.message }, { status: 500 });
    }

    const status = execResult.result?.effects?.status?.status;
    if (status !== 'success') {
      return NextResponse.json({ error: `Pack open failed: ${status}` }, { status: 500 });
    }

    const createdParts: string[] = [];
    for (const change of execResult.result?.objectChanges ?? []) {
      if (change.type === 'created' && change.objectType?.includes(PACKAGE_ID)) {
        createdParts.push(change.objectId);
      }
    }

    if (createdParts.length > 0) {
      const transferTx = new Transaction();
      transferTx.setSender(admin);

      for (const partId of createdParts) {
        transferTx.transferObjects([transferTx.object(partId)], address);
      }

      const transferBytes = await transferTx.build({ client });
      const transferSig = await keypair.signTransaction(transferBytes);

      await rpc('sui_executeTransactionBlock', [
        Buffer.from(transferBytes).toString('base64'),
        [transferSig.signature],
        { showEffects: true },
        'WaitForLocalExecution',
      ]);
    }

    const burnTx = new Transaction();
    burnTx.setSender(admin);
    burnTx.moveCall({
      target: `${PACKAGE_ID}::spark_token::mint`,
      arguments: [
        burnTx.object(SPARK_TREASURY_CAP),
        burnTx.pure.u64(PACK_COST),
        burnTx.pure.address(admin),
      ],
    });

    return NextResponse.json({
      success: true,
      digest: execResult.result?.digest,
      parts: createdParts.length,
      partIds: createdParts,
      message: `Pack opened! ${createdParts.length} parts transferred to your wallet.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
