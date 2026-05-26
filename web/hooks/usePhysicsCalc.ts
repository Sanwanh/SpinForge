'use client';

import { useMemo } from 'react';
import {
  type BladeStats,
  type RatchetStats,
  type BitStats,
  type BeyPhysics,
  computeBeyPhysics,
} from '@/lib/physics-sim';

export function usePhysicsCalc(
  blade: BladeStats | null,
  ratchet: RatchetStats | null,
  bit: BitStats | null,
  launchPower: number = 100
): BeyPhysics | null {
  return useMemo(() => {
    if (!blade || !ratchet || !bit) return null;
    return computeBeyPhysics(blade, ratchet, bit, launchPower);
  }, [blade, ratchet, bit, launchPower]);
}
