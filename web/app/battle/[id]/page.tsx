'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useBattle } from '@/hooks/useBattle';
import { ScoreBar } from '@/components/battle/ScoreBar';
import { ZoneSelector } from '@/components/battle/ZoneSelector';
import { PhysicsHUD } from '@/components/battle/PhysicsHUD';
import { TechniqueHand, type TechniqueCard } from '@/components/battle/TechniqueHand';
import type { Zone } from '@/lib/constants';
import { useT } from '@/lib/i18n';

const StadiumCanvas = dynamic(
  () => import('@/components/battle/StadiumCanvas').then((m) => m.StadiumCanvas),
  { ssr: false, loading: () => <div className="flex h-[600px] items-center justify-center rounded-xl bg-surface-raised"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" /></div> }
);

const MOCK_TECHNIQUES: TechniqueCard[] = [
  { id: '1', name: 'Power Launch', category: 'Launch', description: '+20% initial AM' },
  { id: '2', name: 'Side Crash', category: 'Attack', description: 'Extra damage + push' },
  { id: '3', name: 'Counter Stance', category: 'Defense', description: 'Reduce incoming damage by 30%' },
];

export default function BattlePage({ params }: { params: { id: string } }) {
  const battle = useBattle();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const t = useT();

  return (
    <div className="space-y-4">
      {/* Score */}
      <ScoreBar
        scoreA={battle.scoreA}
        scoreB={battle.scoreB}
        playerAName="You"
        playerBName="Opponent"
      />

      {/* Arena */}
      <div className="flex justify-center">
        <StadiumCanvas
          width={600}
          height={600}
          playerAAM={battle.playerA?.angularMomentum ?? 80}
          playerBAM={battle.playerB?.angularMomentum ?? 75}
        />
      </div>

      {/* Physics HUDs */}
      <div className="grid grid-cols-2 gap-4">
        <PhysicsHUD
          angularMomentum={battle.playerA?.angularMomentum ?? 800}
          maxAM={1000}
          burstIntegrity={battle.playerA?.burstIntegrity ?? 85}
          maxBI={100}
          friction={15}
          mobility={3}
          gearRating={8}
          isDeathSpin={(battle.playerA?.angularMomentum ?? 800) < 200}
          side="left"
        />
        <PhysicsHUD
          angularMomentum={battle.playerB?.angularMomentum ?? 750}
          maxAM={1000}
          burstIntegrity={battle.playerB?.burstIntegrity ?? 70}
          maxBI={100}
          friction={20}
          mobility={2}
          gearRating={0}
          isDeathSpin={(battle.playerB?.angularMomentum ?? 750) < 200}
          side="right"
        />
      </div>

      {/* Zone selector */}
      <div className="flex justify-center">
        <ZoneSelector selectedZone={selectedZone} onSelect={setSelectedZone} />
      </div>

      {/* Technique hand */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{t.deck.techniques}</h3>
        <TechniqueHand
          cards={MOCK_TECHNIQUES}
          onPlay={(id) => battle.addLog(`Played technique ${id}`)}
          disabled={battle.phase === 'resolving'}
        />
      </div>

      {/* Battle log */}
      <div className="card max-h-32 overflow-y-auto">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Battle Log</h3>
        {battle.log.length === 0 ? (
          <p className="text-xs text-gray-600">Match ID: {params.id} - Waiting for actions...</p>
        ) : (
          <div className="space-y-0.5">
            {battle.log.map((entry, i) => (
              <p key={i} className="text-xs text-gray-400">{entry}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
