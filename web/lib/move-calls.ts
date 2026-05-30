import { Transaction } from '@mysten/sui/transactions';
import {
  PACKAGE_ID,
  SPARK_TREASURY_CAP_ID,
  SPARK_TYPE,
} from './constants';

const SPARK_COIN_TYPE = `0x2::coin::Coin<${SPARK_TYPE}>`;

function splitSparkPayment(tx: Transaction, sparkCoinId: string, amount: bigint) {
  const [payment] = tx.splitCoins(tx.object(sparkCoinId), [amount]);
  return payment;
}

// ===== Assembly =====

export function assembleBey(
  bladeId: string,
  ratchetId: string,
  bitId: string,
  name: string,
  sender: string,
): Transaction {
  const tx = new Transaction();
  const [bey] = tx.moveCall({
    target: `${PACKAGE_ID}::bey::assemble`,
    arguments: [
      tx.object(bladeId),
      tx.object(ratchetId),
      tx.object(bitId),
      tx.pure.string(name),
    ],
  });
  tx.transferObjects([bey], sender);
  return tx;
}

export function disassembleBey(beyId: string, sender: string): Transaction {
  const tx = new Transaction();
  // disassemble returns the three parts; they must be transferred back or the tx fails.
  const [blade, ratchet, bit] = tx.moveCall({
    target: `${PACKAGE_ID}::bey::disassemble`,
    arguments: [tx.object(beyId)],
  });
  tx.transferObjects([blade, ratchet, bit], sender);
  return tx;
}

// Permanently burn a single part (Blade / Ratchet / Bit) the player owns.
export function discardPart(partId: string, type: 'blade' | 'ratchet' | 'bit'): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${type}::destroy`,
    arguments: [tx.object(partId)],
  });
  return tx;
}

// ===== Forge =====

export function evolveBlades(
  blade1Id: string,
  blade2Id: string,
  blade3Id: string,
  sparkCoinId: string,
): Transaction {
  const tx = new Transaction();
  const payment = splitSparkPayment(tx, sparkCoinId, 50_000_000_000n);
  const newBlade = tx.moveCall({
    target: `${PACKAGE_ID}::forge::evolve_blades`,
    arguments: [
      tx.object(blade1Id),
      tx.object(blade2Id),
      tx.object(blade3Id),
      payment,
      tx.object(SPARK_TREASURY_CAP_ID),
    ],
  });
  // Returned object auto-transfers to sender via Sui PTB rules
  return tx;
}

export function evolveRatchets(
  r1Id: string,
  r2Id: string,
  r3Id: string,
  sparkCoinId: string,
): Transaction {
  const tx = new Transaction();
  const payment = splitSparkPayment(tx, sparkCoinId, 50_000_000_000n);
  const newRatchet = tx.moveCall({
    target: `${PACKAGE_ID}::forge::evolve_ratchets`,
    arguments: [
      tx.object(r1Id),
      tx.object(r2Id),
      tx.object(r3Id),
      payment,
      tx.object(SPARK_TREASURY_CAP_ID),
    ],
  });
  // Returned object auto-transfers to sender via Sui PTB rules
  return tx;
}

export function evolveBits(
  b1Id: string,
  b2Id: string,
  b3Id: string,
  sparkCoinId: string,
): Transaction {
  const tx = new Transaction();
  const payment = splitSparkPayment(tx, sparkCoinId, 50_000_000_000n);
  const newBit = tx.moveCall({
    target: `${PACKAGE_ID}::forge::evolve_bits`,
    arguments: [
      tx.object(b1Id),
      tx.object(b2Id),
      tx.object(b3Id),
      payment,
      tx.object(SPARK_TREASURY_CAP_ID),
    ],
  });
  // Returned object auto-transfers to sender via Sui PTB rules
  return tx;
}

export function fuseBlades(
  blade1Id: string,
  blade2Id: string,
  sparkCoinId: string,
): Transaction {
  const tx = new Transaction();
  const payment = splitSparkPayment(tx, sparkCoinId, 200_000_000_000n);
  const newBlade = tx.moveCall({
    target: `${PACKAGE_ID}::forge::fuse_blades`,
    arguments: [
      tx.object(blade1Id),
      tx.object(blade2Id),
      payment,
      tx.object(SPARK_TREASURY_CAP_ID),
    ],
  });
  // Returned object auto-transfers to sender via Sui PTB rules
  return tx;
}

export function retuneBlade(
  bladeId: string,
  newAttack: number,
  sparkCoinId: string,
): Transaction {
  const tx = new Transaction();
  const payment = splitSparkPayment(tx, sparkCoinId, 75_000_000_000n);
  tx.moveCall({
    target: `${PACKAGE_ID}::forge::retune_blade_attack`,
    arguments: [
      tx.object(bladeId),
      tx.pure.u16(newAttack),
      payment,
      tx.object(SPARK_TREASURY_CAP_ID),
    ],
  });
  return tx;
}

// ===== Battle =====

export function commitAction(
  roundId: string,
  playerAddress: string,
  matchId: string,
  commitment: Uint8Array,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::battle::commit_action`,
    arguments: [
      tx.object(roundId),
      tx.pure.address(playerAddress),
      tx.object(matchId),
      tx.pure.vector('u8', Array.from(commitment)),
    ],
  });
  return tx;
}

export function revealAction(
  roundId: string,
  playerAddress: string,
  matchId: string,
  zone: number,
  salt: Uint8Array,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::battle::reveal_action`,
    arguments: [
      tx.object(roundId),
      tx.pure.address(playerAddress),
      tx.object(matchId),
      tx.pure.u8(zone),
      tx.pure.vector('u8', Array.from(salt)),
    ],
  });
  return tx;
}

// ===== Deck =====

export function validateDeck(
  bey1Id: string,
  bey2Id: string,
  bey3Id: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::deck::validate_deck`,
    arguments: [
      tx.object(bey1Id),
      tx.object(bey2Id),
      tx.object(bey3Id),
    ],
  });
  return tx;
}

// ===== Query Helpers =====

export const OBJECT_TYPES = {
  blade: `${PACKAGE_ID}::blade::Blade`,
  ratchet: `${PACKAGE_ID}::ratchet::Ratchet`,
  bit: `${PACKAGE_ID}::bit::Bit`,
  bey: `${PACKAGE_ID}::bey::Bey`,
  stadium: `${PACKAGE_ID}::stadium::Stadium`,
  spiritAvatar: `${PACKAGE_ID}::spirit::SpiritAvatar`,
  sparkCoin: SPARK_COIN_TYPE,
} as const;
