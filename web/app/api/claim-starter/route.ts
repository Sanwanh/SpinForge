import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { verifyAuth } from '@/lib/auth-verify';
import { isSameOrigin, safeError, rateLimited, requireRedis, adminBudgetExceeded, belowMinSuiBalance } from '@/lib/api-guard';
import { loadSigner } from '@/lib/admin-signer';
import { kvSetNX, kvDel } from '@/lib/kv';

const PKG = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '';
const ORIG_PKG = '0x0d072582b7058f0bc709462add402df73a36b8371ef3628840397a743ee2c377';
const SPARK_CAP = '0x026b064861338efe216e7d452736d9457f6bd2c84ddd48cc4149ed01811b4980';
const SUI_RANDOM = '0x8';
const RPC = 'https://fullnode.testnet.sui.io:443';
const CLAIM_KEY = (addr: string) => `starter_claimed:${addr}`;

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
    const limited = await rateLimited(request, 'claim-starter', 10, 3600);
    if (limited) return limited;
    // H-RT-1: refuse to mint without cross-instance dedup (Redis) in production.
    const noRedis = requireRedis();
    if (noRedis) return noRedis;
    // H-RT-2: global hourly ceiling on free-SPARK grants (faucet + starter share it).
    const overBudget = await adminBudgetExceeded('spark-grant', 300, 3600);
    if (overBudget) return overBudget;
    const { address, authMessage, authSignature } = await request.json();
    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    const auth = await verifyAuth(address, authMessage, authSignature);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
    // H-RT-2: require a funded wallet so free throwaway keypairs can't farm.
    const underfunded = await belowMinSuiBalance(address, RPC);
    if (underfunded) return underfunded;
    // H-5: atomic one-per-address; released below on failure.
    const firstClaim = await kvSetNX(CLAIM_KEY(address), 60 * 60 * 24 * 365);
    if (!firstClaim) {
      return NextResponse.json({ error: 'Already claimed starter pack.' }, { status: 400 });
    }

    // H-RT-3: minter role (SPARK TreasuryCap) once keys are split.
    const { keypair, address: admin } = loadSigner('minter');

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
      await kvDel(CLAIM_KEY(address));
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

    return NextResponse.json({
      success: true,
      spark: 500,
      parts: partIds.length,
      partIds,
      message: `Starter pack claimed! 500 SPARK + ${partIds.length} parts.`,
    });
  } catch (err) {
    return safeError(err, 'Starter claim failed');
  }
}
