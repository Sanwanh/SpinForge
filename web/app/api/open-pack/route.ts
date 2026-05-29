import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { kvGet, kvSet } from '@/lib/kv';
import { isSameOrigin, safeError, rateLimited } from '@/lib/api-guard';

const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY ?? '';
// Latest upgraded package (where executable Move code lives).
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0x4f2b01b4c287e0b670600eb8074049635f60761146936ca9a14f650b24e60790';
// SPARK_TOKEN type identity is bound to the original defining package, so balance
// queries use the original even though Move calls use the latest version.
const ORIGINAL_PACKAGE_ID = '0x4f2b01b4c287e0b670600eb8074049635f60761146936ca9a14f650b24e60790';
const SPARK_TYPE = `${ORIGINAL_PACKAGE_ID}::spark_token::SPARK_TOKEN`;
const SPARK_TREASURY_CAP = '0x92e420d720485efa629681a15852d236fa31732b1d98e97b96a9a8f7749fa558';
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

function isPart(objectType: string | undefined): boolean {
  return (
    !!objectType &&
    (objectType.includes('::blade::') ||
      objectType.includes('::ratchet::') ||
      objectType.includes('::bit::'))
  );
}

interface BalanceChange {
  owner?: { AddressOwner?: string };
  coinType?: string;
  amount?: string;
}

// Verify a wallet player's SPARK payment to the treasury, with replay protection.
async function verifyPayment(
  digest: string,
  payer: string,
  treasury: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const usedKey = `used_payment:${digest}`;
  if (await kvGet<boolean>(usedKey)) {
    return { ok: false, error: 'This payment was already used.' };
  }

  // The tx may not be indexed for query the instant it executes — retry briefly.
  let tx: Record<string, unknown> | null = null;
  for (let i = 0; i < 4; i++) {
    const res = await rpc('sui_getTransactionBlock', [
      digest,
      { showBalanceChanges: true, showInput: true, showEffects: true },
    ]);
    if (res.result) {
      tx = res.result;
      break;
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  if (!tx) return { ok: false, error: 'Payment transaction not found.' };

  const effects = tx.effects as { status?: { status?: string } } | undefined;
  if (effects?.status?.status !== 'success') {
    return { ok: false, error: 'Payment transaction did not succeed.' };
  }

  const sender = (tx.transaction as { data?: { sender?: string } })?.data?.sender;
  if (sender !== payer) {
    return { ok: false, error: 'Payment sender does not match.' };
  }

  const changes = (tx.balanceChanges as BalanceChange[]) ?? [];
  const paid = changes.some(
    (c) =>
      c.coinType === SPARK_TYPE &&
      c.owner?.AddressOwner === treasury &&
      BigInt(c.amount ?? '0') >= PACK_COST,
  );
  if (!paid) {
    return { ok: false, error: 'Payment did not reach the treasury.' };
  }

  // Mark used (7 days) so the same payment can't open multiple packs.
  await kvSet(usedKey, true, 60 * 60 * 24 * 7);
  return { ok: true };
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'open-pack', 30, 3600);
    if (limited) return limited;
    const { address, paymentDigest } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    if (!ADMIN_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { secretKey } = decodeSuiPrivateKey(ADMIN_PRIVATE_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const admin = keypair.getPublicKey().toSuiAddress();

    // H-5~H-8: a verified on-chain payment is REQUIRED for every pack. The old
    // "gas-free" branch only checked balance and never deducted, so anyone
    // holding >=100 SPARK could open unlimited free packs. verifyPayment also
    // proves the payer == address (signed the transfer) and blocks replay.
    if (typeof paymentDigest !== 'string' || paymentDigest.length === 0) {
      return NextResponse.json({ error: 'Payment required to open a pack.' }, { status: 402 });
    }
    const v = await verifyPayment(paymentDigest, address, admin);
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');
    const client = new SuiJsonRpcClient({ url: RPC_URL, network: 'testnet' });

    // Mint the pack cost fresh and feed it straight into open_pack, which burns it.
    // Net effect on the admin treasury is zero, so packs never deplete the admin.
    const tx = new Transaction();
    tx.setSender(admin);
    const payment = tx.moveCall({
      target: `${PACKAGE_ID}::spark_token::mint_coin`,
      arguments: [tx.object(SPARK_TREASURY_CAP), tx.pure.u64(PACK_COST)],
    });
    tx.moveCall({
      target: `${PACKAGE_ID}::pack::open_pack`,
      arguments: [payment, tx.object(SPARK_TREASURY_CAP), tx.object(SUI_RANDOM)],
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
      if (change.type === 'created' && isPart(change.objectType)) {
        createdParts.push(change.objectId);
      }
    }

    // open_pack transfers parts to the sender (admin); forward them to the player.
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

    return NextResponse.json({
      success: true,
      digest: execResult.result?.digest,
      parts: createdParts.length,
      partIds: createdParts,
      message: `Pack opened! ${createdParts.length} parts transferred to your wallet.`,
    });
  } catch (err) {
    return safeError(err, 'Pack open failed');
  }
}
