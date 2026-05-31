import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-verify';
import { isSameOrigin, safeError, rateLimited, requireRedis, adminBudgetExceeded, belowMinSuiBalance } from '@/lib/api-guard';
import { loadSigner } from '@/lib/admin-signer';
import { kvSetNX, kvDel } from '@/lib/kv';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0x79e8552bfb9b9cf61b3534a03061b222f022671be4b384efa55d557586ed2110';
const SPARK_TREASURY_CAP = '0x095b18a88100dc11f9f1ec3047adf5ac0e497e03d1f7e3b5f50fc2dad9569e69';
const RPC_URL = 'https://fullnode.testnet.sui.io:443';
const FAUCET_AMOUNT = '500000000000';
const CLAIM_KEY = (addr: string) => `faucet_claimed:${addr}`;

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
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'faucet', 10, 3600);
    if (limited) return limited;
    // H-RT-1: refuse to mint without cross-instance dedup (Redis) in production.
    const noRedis = requireRedis();
    if (noRedis) return noRedis;
    // H-RT-2: global hourly ceiling on free-SPARK grants (faucet + starter share it).
    const overBudget = await adminBudgetExceeded('spark-grant', 300, 3600);
    if (overBudget) return overBudget;

    const { address, authMessage, authSignature } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    // C-2: prove the caller controls `address` before the admin mints to it.
    const auth = await verifyAuth(address, authMessage, authSignature);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    // H-RT-2: require a funded wallet so free throwaway keypairs can't farm.
    const underfunded = await belowMinSuiBalance(address, RPC_URL);
    if (underfunded) return underfunded;

    // H-5: atomic one-claim-per-address (cross-instance once Redis is configured).
    // Reserve first; release below if the mint fails.
    const firstClaim = await kvSetNX(CLAIM_KEY(address), 60 * 60 * 24 * 365);
    if (!firstClaim) {
      return NextResponse.json({ error: 'Already claimed. One faucet grant per address.' }, { status: 400 });
    }

    const { Transaction } = await import('@mysten/sui/transactions');
    // H-RT-3: minter role holds only the SPARK TreasuryCap once keys are split.
    const { keypair, address: sender } = loadSigner('minter');

    const tx = new Transaction();
    tx.setSender(sender);

    tx.moveCall({
      target: `${PACKAGE_ID}::spark_token::mint`,
      arguments: [
        tx.object(SPARK_TREASURY_CAP),
        tx.pure.u64(BigInt(FAUCET_AMOUNT)),
        tx.pure.address(address),
      ],
    });

    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');
    const client = new SuiJsonRpcClient({ url: RPC_URL, network: 'testnet' });

    const bytes = await tx.build({ client });
    const { signature } = await keypair.signTransaction(bytes);

    const result = await rpc('sui_executeTransactionBlock', [
      Buffer.from(bytes).toString('base64'),
      [signature],
      { showEffects: true },
      'WaitForLocalExecution',
    ]);

    if (result.error) {
      await kvDel(CLAIM_KEY(address));
      return NextResponse.json({ error: 'Faucet transaction failed' }, { status: 500 });
    }

    const status = result.result?.effects?.status?.status;
    if (status !== 'success') {
      await kvDel(CLAIM_KEY(address));
      return NextResponse.json({ error: `Transaction failed: ${status}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      digest: result.result?.digest,
      spark: 500,
      message: 'Claimed 500 SPARK! You can now open 5 packs.',
    });
  } catch (err) {
    return safeError(err, 'Faucet request failed');
  }
}
