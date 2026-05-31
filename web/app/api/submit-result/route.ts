import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { verifyAuth } from '@/lib/auth-verify';
import { isSameOrigin, safeError, rateLimited, requireRedis, adminBudgetExceeded } from '@/lib/api-guard';
import { loadSigner } from '@/lib/admin-signer';

const PKG = process.env.NEXT_PUBLIC_PACKAGE_ID ?? '';
// H-4: battle_record::create is now &AdminCap-gated so only the backend can mint
// records (the participant check already happened above via wallet signature).
const ADMIN_CAP = '0xa295ba12fb7bada3856be0075b374f66325b36f4561af9ee662834db2bec5916';
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
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
    const limited = await rateLimited(request, 'submit-result', 30, 3600);
    if (limited) return limited;
    // H-RT-1/H-RT-2: refuse to admin-sign records without Redis in prod, and cap
    // total admin-signed record mints per hour as a circuit breaker.
    const noRedis = requireRedis();
    if (noRedis) return noRedis;
    const overBudget = await adminBudgetExceeded('submit-result', 600, 3600);
    if (overBudget) return overBudget;
    const { playerA, playerB, rotorA, rotorB, winner, finishType, scoreA, scoreB, submitter, authMessage, authSignature } = await request.json();

    if (!playerA || !playerB || !rotorA || !rotorB || !winner) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // C-2/H-10: the submitter must prove control of their address AND be one of
    // the two participants — you cannot file a result for a match you're not in.
    const auth = await verifyAuth(submitter, authMessage, authSignature);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
    if (submitter !== playerA && submitter !== playerB) {
      return NextResponse.json({ error: 'Submitter is not a participant' }, { status: 403 });
    }

    // L-5: winner must be one of the two players; scores bounded to a sane range.
    if (winner !== playerA && winner !== playerB) {
      return NextResponse.json({ error: 'Winner must be a participant' }, { status: 400 });
    }
    const sA = Number(scoreA ?? 7);
    const sB = Number(scoreB ?? 0);
    const ft = Number(finishType ?? 0);
    if (![sA, sB].every((s) => Number.isInteger(s) && s >= 0 && s <= 15) || !Number.isInteger(ft) || ft < 0 || ft > 3) {
      return NextResponse.json({ error: 'Invalid scores or finish type' }, { status: 400 });
    }

    // H-RT-3: recorder role holds only the AdminCap once keys are split.
    const { keypair, address: admin } = loadSigner('recorder');

    const { SuiJsonRpcClient } = await import('@mysten/sui/jsonRpc');
    const client = new SuiJsonRpcClient({ url: RPC, network: 'testnet' });

    const tx = new Transaction();
    tx.setSender(admin);

    const [record] = tx.moveCall({
      target: `${PKG}::battle_record::create`,
      arguments: [
        tx.object(ADMIN_CAP),
        tx.pure.address(playerA),
        tx.pure.address(playerB),
        tx.pure.id(rotorA),
        tx.pure.id(rotorB),
        tx.pure.address(winner),
        tx.pure.u8(ft),
        tx.pure.u8(sA),
        tx.pure.u8(sB),
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
    return safeError(err, 'Result submission failed');
  }
}
