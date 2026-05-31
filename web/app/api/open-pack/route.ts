import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { kvSetNX, kvDel } from '@/lib/kv';
import { isSameOrigin, safeError, rateLimited, requireRedis, adminBudgetExceeded } from '@/lib/api-guard';
import { loadSigner } from '@/lib/admin-signer';

// Latest upgraded package (where executable Move code lives).
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '0x0d072582b7058f0bc709462add402df73a36b8371ef3628840397a743ee2c377';
// SPARK_TOKEN type identity is bound to the original defining package, so balance
// queries use the original even though Move calls use the latest version.
const ORIGINAL_PACKAGE_ID = '0x0d072582b7058f0bc709462add402df73a36b8371ef3628840397a743ee2c377';
const SPARK_TYPE = `${ORIGINAL_PACKAGE_ID}::spark_token::SPARK_TOKEN`;
const SPARK_TREASURY_CAP = '0x026b064861338efe216e7d452736d9457f6bd2c84ddd48cc4149ed01811b4980';
// M-1: open_pack asserts the recipient is not banned and mints parts directly to them.
const GAME_CONFIG = '0x3b372a7a4f94e9b7e517a38aaaa6592b50ae2e67a343f0e8c56462d2226bd238';
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
  // Atomically reserve the digest BEFORE the (0–3.2s) RPC window, so two
  // concurrent requests with the same digest can't both pass. Release the
  // reservation on any verification failure so a legit payment that hit a
  // transient RPC error isn't permanently locked out. (TOCTOU fix)
  if (!(await kvSetNX(usedKey, 60 * 60 * 24 * 7))) {
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
  if (!tx) {
    await kvDel(usedKey);
    return { ok: false, error: 'Payment transaction not found.' };
  }

  const effects = tx.effects as { status?: { status?: string } } | undefined;
  if (effects?.status?.status !== 'success') {
    await kvDel(usedKey);
    return { ok: false, error: 'Payment transaction did not succeed.' };
  }

  const sender = (tx.transaction as { data?: { sender?: string } })?.data?.sender;
  if (sender !== payer) {
    await kvDel(usedKey);
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
    await kvDel(usedKey);
    return { ok: false, error: 'Payment did not reach the treasury.' };
  }

  // Reservation already holds the digest for 7 days — no second write needed.
  return { ok: true };
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'open-pack', 30, 3600);
    if (limited) return limited;
    // H-RT-1: the payment-replay guard (used_payment:<digest>) is per-instance
    // without Redis — refuse to open packs without it in production.
    const noRedis = requireRedis();
    if (noRedis) return noRedis;
    // H-RT-2: global hourly ceiling on admin-signed pack mints.
    const overBudget = await adminBudgetExceeded('open-pack', 600, 3600);
    if (overBudget) return overBudget;
    const { address, paymentDigest } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    // H-RT-3: minter role (SPARK TreasuryCap) once keys are split. NOTE: the pack
    // payment is verified to have reached this signer's address (treasury), so if
    // MINTER_PRIVATE_KEY is provisioned, the frontend payment target must point to
    // the minter address too — see docs/KEY_ROTATION_RUNBOOK.md.
    const { keypair, address: admin } = loadSigner('minter');

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
    // open_pack mints the 5 parts directly to `address` (the verified payer), so
    // no second admin->player forwarding tx is needed.
    const tx = new Transaction();
    tx.setSender(admin);
    const payment = tx.moveCall({
      target: `${PACKAGE_ID}::spark_token::mint_coin`,
      arguments: [tx.object(SPARK_TREASURY_CAP), tx.pure.u64(PACK_COST)],
    });
    tx.moveCall({
      target: `${PACKAGE_ID}::pack::open_pack`,
      arguments: [
        payment,
        tx.object(SPARK_TREASURY_CAP),
        tx.object(GAME_CONFIG),
        tx.pure.address(address),
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
      if (change.type === 'created' && isPart(change.objectType)) {
        createdParts.push(change.objectId);
      }
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
