import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-verify';
import { isSameOrigin, safeError, rateLimited } from '@/lib/api-guard';
import { kvSetNX, kvDel } from '@/lib/kv';

const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY ?? '';
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0x4f2b01b4c287e0b670600eb8074049635f60761146936ca9a14f650b24e60790';
const SPARK_TREASURY_CAP = '0x92e420d720485efa629681a15852d236fa31732b1d98e97b96a9a8f7749fa558';
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

    const { address, authMessage, authSignature } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    // C-2: prove the caller controls `address` before the admin mints to it.
    const auth = await verifyAuth(address, authMessage, authSignature);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (!ADMIN_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Faucet not configured' }, { status: 500 });
    }

    // H-5: atomic one-claim-per-address (cross-instance once Redis is configured).
    // Reserve first; release below if the mint fails.
    const firstClaim = await kvSetNX(CLAIM_KEY(address), 60 * 60 * 24 * 365);
    if (!firstClaim) {
      return NextResponse.json({ error: 'Already claimed. One faucet grant per address.' }, { status: 400 });
    }

    const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
    const { decodeSuiPrivateKey } = await import('@mysten/sui/cryptography');
    const { Transaction } = await import('@mysten/sui/transactions');

    const { secretKey } = decodeSuiPrivateKey(ADMIN_PRIVATE_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const sender = keypair.getPublicKey().toSuiAddress();

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
