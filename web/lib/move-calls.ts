import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID } from './constants';

/**
 * Move transaction builders for all contract interactions.
 * Each function returns a Transaction that can be signed and executed.
 */

export function assembleBey(
  bladeId: string,
  ratchetId: string,
  bitId: string,
  name: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::bey::assemble`,
    arguments: [
      tx.object(bladeId),
      tx.object(ratchetId),
      tx.object(bitId),
      tx.pure.string(name),
    ],
  });
  return tx;
}

export function disassembleBey(beyId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::bey::disassemble`,
    arguments: [tx.object(beyId)],
  });
  return tx;
}

export function createDeck(
  bey1Id: string,
  bey2Id: string,
  bey3Id: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::deck::create`,
    arguments: [
      tx.object(bey1Id),
      tx.object(bey2Id),
      tx.object(bey3Id),
    ],
  });
  return tx;
}

export function openPack(packId: string, randomId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::pack::open`,
    arguments: [tx.object(packId), tx.object(randomId)],
  });
  return tx;
}

export function buyPack(
  paymentCoinId: string,
  shopId: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::pack::buy`,
    arguments: [tx.object(paymentCoinId), tx.object(shopId)],
  });
  return tx;
}

export function evolve(
  part1Id: string,
  part2Id: string,
  part3Id: string,
  sparkCoinId: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::forge::evolve`,
    arguments: [
      tx.object(part1Id),
      tx.object(part2Id),
      tx.object(part3Id),
      tx.object(sparkCoinId),
    ],
  });
  return tx;
}

export function fuse(
  part1Id: string,
  part2Id: string,
  sparkCoinId: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::forge::fuse`,
    arguments: [
      tx.object(part1Id),
      tx.object(part2Id),
      tx.object(sparkCoinId),
    ],
  });
  return tx;
}

export function retune(
  partId: string,
  statIndex: number,
  sparkCoinId: string,
  randomId: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::forge::retune`,
    arguments: [
      tx.object(partId),
      tx.pure.u8(statIndex),
      tx.object(sparkCoinId),
      tx.object(randomId),
    ],
  });
  return tx;
}

export function commitZone(
  matchId: string,
  roundId: string,
  commitHash: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::battle::commit_zone`,
    arguments: [
      tx.object(matchId),
      tx.object(roundId),
      tx.pure.vector('u8', Array.from(Buffer.from(commitHash, 'hex'))),
    ],
  });
  return tx;
}

export function revealZone(
  matchId: string,
  roundId: string,
  zone: number,
  nonce: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::battle::reveal_zone`,
    arguments: [
      tx.object(matchId),
      tx.object(roundId),
      tx.pure.u8(zone),
      tx.pure.vector('u8', Array.from(Buffer.from(nonce, 'hex'))),
    ],
  });
  return tx;
}

export function listOnMarket(
  kioskId: string,
  partId: string,
  price: bigint
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::marketplace::list`,
    arguments: [
      tx.object(kioskId),
      tx.object(partId),
      tx.pure.u64(price),
    ],
  });
  return tx;
}

export function buyFromMarket(
  kioskId: string,
  partId: string,
  paymentCoinId: string,
  policyId: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::marketplace::buy`,
    arguments: [
      tx.object(kioskId),
      tx.object(partId),
      tx.object(paymentCoinId),
      tx.object(policyId),
    ],
  });
  return tx;
}
