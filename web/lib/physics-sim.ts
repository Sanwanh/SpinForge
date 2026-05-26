/**
 * Client-side physics simulation that mirrors on-chain logic.
 * All calculations use integer math scaled by 1000 for precision.
 */

export interface BladeStats {
  attack: number;
  recoilFactor: number;
  spinDirection: number; // 0=Right, 1=Left
  beyType: number;       // 0=ATK, 1=DEF, 2=STA, 3=BAL
  element: number;       // 0=Wood, 1=Fire, 2=Metal, 3=Water, 4=Earth
}

export interface RatchetStats {
  prongs: number;
  height: number;
  weight: number;
  burstResistance: number;
}

export interface BitStats {
  category: number;
  friction: number;
  mobility: number;
  gearDiameter: number;
  hasLifeAfterDeath: boolean;
}

export interface BeyPhysics {
  angularMomentum: number;
  momentOfInertia: number;
  frictionCoefficient: number;
  attackPower: number;
  recoil: number;
  burstIntegrity: number;
  mobility: number;
  gearRating: number;
}

function prongMultiplier(prongs: number): number {
  // More prongs = more outward mass distribution = higher inertia
  return 100 + prongs * 12;
}

export function computeAngularMomentum(
  ratchet: RatchetStats,
  bit: BitStats,
  launchPower: number
): number {
  const inertia = ratchet.weight * prongMultiplier(ratchet.prongs);
  const efficiency = 100 - bit.friction;
  return Math.floor((inertia * efficiency * launchPower) / 10000);
}

export function computeMomentOfInertia(ratchet: RatchetStats): number {
  return ratchet.weight * prongMultiplier(ratchet.prongs);
}

export function computeBeyPhysics(
  blade: BladeStats,
  ratchet: RatchetStats,
  bit: BitStats,
  launchPower: number = 100
): BeyPhysics {
  const am = computeAngularMomentum(ratchet, bit, launchPower);
  const moi = computeMomentOfInertia(ratchet);

  return {
    angularMomentum: am,
    momentOfInertia: moi,
    frictionCoefficient: bit.friction,
    attackPower: Math.floor((blade.attack * am) / 1000),
    recoil: Math.floor((blade.attack * am * blade.recoilFactor) / 100000),
    burstIntegrity: ratchet.burstResistance,
    mobility: bit.mobility,
    gearRating: bit.gearDiameter,
  };
}

// Wuxing cycle: Wood(0) > Earth(4) > Water(3) > Fire(1) > Metal(2) > Wood(0)
const WUXING_BEATS: Record<number, number> = { 0: 4, 4: 3, 3: 1, 1: 2, 2: 0 };

export function elementBonus(attackerElement: number, defenderElement: number): number {
  if (WUXING_BEATS[attackerElement] === defenderElement) return 120; // +20%
  if (attackerElement === defenderElement) return 90; // -10%
  return 100;
}

// Type advantage: ATK>STA +30%, STA>DEF +20%, DEF>ATK +40% recoil reflect
const TYPE_BONUS: Record<string, number> = {
  '0-2': 130, // ATK > STA
  '2-1': 120, // STA > DEF
  '1-0': 140, // DEF > ATK (recoil reflect)
};

export function typeBonus(attackerType: number, defenderType: number): number {
  if (attackerType === 3) return 110; // BAL: +10% to all
  if (defenderType === 3) return 90;  // BAL: -10% from all
  return TYPE_BONUS[`${attackerType}-${defenderType}`] ?? 100;
}

export function computeDamage(
  attackerBlade: BladeStats,
  attackerAM: number,
  defenderBlade: BladeStats,
  variance: number = 100 // 85-115
): { damage: number; recoil: number } {
  const raw = Math.floor((attackerBlade.attack * attackerAM) / 1000);
  const tBonus = typeBonus(attackerBlade.beyType, defenderBlade.beyType);
  const eBonus = elementBonus(attackerBlade.element, defenderBlade.element);
  const damage = Math.floor((raw * tBonus * eBonus * variance) / 1_000_000);
  const recoil = Math.floor((damage * attackerBlade.recoilFactor) / 100);
  return { damage, recoil };
}

export function computeSpinDecay(
  currentAM: number,
  friction: number,
  wobbleFactor: number = 1
): number {
  const baseDecay = Math.floor((friction * wobbleFactor * currentAM) / 1000);
  return Math.max(1, baseDecay);
}

export function computeSpinSteal(
  attackerSpinDir: number,
  defenderSpinDir: number,
  damage: number
): number {
  if (attackerSpinDir !== defenderSpinDir) {
    return Math.floor(damage / 10); // 10% AM transfer
  }
  return 0;
}

export function xtremeDashAccuracy(gearDiameter: number): number {
  if (gearDiameter <= 6) return 70;
  if (gearDiameter <= 10) return 85;
  return 95;
}
