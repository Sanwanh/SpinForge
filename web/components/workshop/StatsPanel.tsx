'use client';

import type { BeyPhysics } from '@/lib/physics-sim';
import { useT } from '@/lib/i18n';
import { Corners } from '@/components/design/atoms';

interface StatsPanelProps {
  physics: BeyPhysics | null;
}

// Approximate upper bounds (launchPower 100) used only to scale the bars.
const MAX = {
  am: 42000,
  moi: 42000,
  atk: 4200,
  recoil: 3400,
  burst: 500,
  friction: 80,
  mobility: 5,
  gear: 12,
} as const;

function StatBar({
  label,
  value,
  max,
  unit = '',
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color: string;
}) {
  const pct = Math.max(3, Math.min(100, (value / max) * 100));
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span className="t-eyebrow" style={{ fontSize: 9.5, color: 'var(--text-dim)', letterSpacing: '0.12em' }}>{label}</span>
        <span className="t-mono" style={{ fontSize: 14, fontWeight: 600, color }}>
          {value.toLocaleString()}{unit}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 3, background: 'var(--void)', overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            boxShadow: `0 0 8px ${color}66`,
            transition: 'width .4s ease',
          }}
        />
      </div>
    </div>
  );
}

export function StatsPanel({ physics }: StatsPanelProps) {
  const t = useT();

  if (!physics) {
    return (
      <div className="panel" style={{ padding: 22, position: 'relative' }}>
        <Corners />
        <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 12 }}>{t.workshop.statsPreview}</div>
        <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          Select all three parts to preview the combined on-chain stats.
        </p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: 22, position: 'relative' }}>
      <Corners />
      <div className="t-eyebrow" style={{ color: 'var(--gold)', marginBottom: 16 }}>{t.workshop.statsPreview}</div>
      <StatBar label={t.workshop.angularMomentum} value={physics.angularMomentum} max={MAX.am} color="#00CCFF" />
      <StatBar label="MOMENT OF INERTIA" value={physics.momentOfInertia} max={MAX.moi} color="#8B5CF6" />
      <StatBar label={t.workshop.attackPower} value={physics.attackPower} max={MAX.atk} color="#FF4444" />
      <StatBar label="RECOIL" value={physics.recoil} max={MAX.recoil} color="#F97316" />
      <StatBar label={t.workshop.burstIntegrity} value={physics.burstIntegrity} max={MAX.burst} color="#A855F7" />
      <StatBar label="FRICTION" value={physics.frictionCoefficient} max={MAX.friction} color="#FFB800" />
      <StatBar label={t.workshop.mobility} value={physics.mobility} max={MAX.mobility} unit=" zones" color="#00FF88" />
      {physics.gearRating > 0 && (
        <StatBar label="GEAR RATING" value={physics.gearRating} max={MAX.gear} unit="mm" color="#00CCFF" />
      )}
    </div>
  );
}
