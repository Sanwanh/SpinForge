'use client';

import type { BeyPhysics } from '@/lib/physics-sim';

interface StatsPanelProps {
  physics: BeyPhysics | null;
}

function Stat({ label, value, unit = '', color }: { label: string; value: number; unit?: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="font-mono text-sm font-bold" style={{ color }}>{value}{unit}</span>
    </div>
  );
}

export function StatsPanel({ physics }: StatsPanelProps) {
  if (!physics) {
    return (
      <div className="card space-y-2">
        <h3 className="text-sm font-bold text-gray-400">Physics Stats</h3>
        <p className="text-xs text-gray-600">Select all three parts to see combined stats</p>
      </div>
    );
  }

  return (
    <div className="card space-y-1">
      <h3 className="mb-2 text-sm font-bold text-white">Physics Stats</h3>
      <Stat label="Angular Momentum" value={physics.angularMomentum} color="#3B82F6" />
      <Stat label="Moment of Inertia" value={physics.momentOfInertia} color="#8B5CF6" />
      <Stat label="Attack Power" value={physics.attackPower} color="#EF4444" />
      <Stat label="Recoil" value={physics.recoil} color="#F97316" />
      <Stat label="Burst Integrity" value={physics.burstIntegrity} color="#A855F7" />
      <Stat label="Friction" value={physics.frictionCoefficient} color="#F59E0B" />
      <Stat label="Mobility" value={physics.mobility} unit=" zones" color="#10B981" />
      {physics.gearRating > 0 && (
        <Stat label="Gear Rating" value={physics.gearRating} unit="mm" color="#3B82F6" />
      )}
    </div>
  );
}
