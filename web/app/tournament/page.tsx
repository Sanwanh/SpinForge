'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useT } from '@/lib/i18n';

interface BracketMatch {
  id: string;
  round: number;
  playerA: string;
  playerB: string;
  scoreA: number;
  scoreB: number;
  complete: boolean;
}

const MOCK_BRACKET: BracketMatch[] = [
  { id: '1', round: 1, playerA: '0xaaa...111', playerB: '0xbbb...222', scoreA: 7, scoreB: 3, complete: true },
  { id: '2', round: 1, playerA: '0xccc...333', playerB: '0xddd...444', scoreA: 5, scoreB: 7, complete: true },
  { id: '3', round: 1, playerA: '0xeee...555', playerB: '0xfff...666', scoreA: 7, scoreB: 6, complete: true },
  { id: '4', round: 1, playerA: '0x111...aaa', playerB: '0x222...bbb', scoreA: 2, scoreB: 7, complete: true },
  { id: '5', round: 2, playerA: '0xaaa...111', playerB: '0xddd...444', scoreA: 0, scoreB: 0, complete: false },
  { id: '6', round: 2, playerA: '0xeee...555', playerB: '0x222...bbb', scoreA: 0, scoreB: 0, complete: false },
];

function MatchCard({ match }: { match: BracketMatch }) {
  const t = useT();
  const winner = match.complete ? (match.scoreA > match.scoreB ? 'A' : 'B') : null;

  return (
    <div className={clsx('card border', match.complete ? 'border-gray-700' : 'border-brand-blue/30')}>
      <div className="flex items-center justify-between">
        <div className={clsx('text-xs', winner === 'A' ? 'font-bold text-white' : 'text-gray-400')}>
          {match.playerA}
        </div>
        <span className="text-xs font-mono text-gray-500">
          {match.complete ? `${match.scoreA} - ${match.scoreB}` : t.battle.vs}
        </span>
        <div className={clsx('text-xs', winner === 'B' ? 'font-bold text-white' : 'text-gray-400')}>
          {match.playerB}
        </div>
      </div>
      {!match.complete && (
        <div className="mt-2 text-center">
          <span className="text-[10px] text-brand-blue animate-pulse">{t.tournament.inProgress}</span>
        </div>
      )}
    </div>
  );
}

export default function TournamentPage() {
  const t = useT();
  const rounds = Array.from(new Set(MOCK_BRACKET.map((m) => m.round))).sort();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{t.tournament.title}</h1>
        <p className="text-sm text-gray-400">{t.tournament.subtitle}</p>
      </motion.div>

      <div className="flex gap-8 overflow-x-auto pb-4">
        {rounds.map((round) => (
          <div key={round} className="min-w-[280px] space-y-4">
            <h3 className="text-sm font-bold text-gray-400">{t.tournament.round.replace('{n}', String(round))}</h3>
            {MOCK_BRACKET.filter((m) => m.round === round).map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ))}

        <div className="min-w-[280px] space-y-4">
          <h3 className="text-sm font-bold text-rarity-legendary">{t.tournament.finals}</h3>
          <div className="card border-rarity-legendary/30">
            <p className="text-center text-xs text-gray-500">{t.tournament.awaitingResults}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-2 text-sm font-bold text-gray-400">{t.tournament.prizePool}</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-rarity-legendary">500 SPARK</p>
            <p className="text-xs text-gray-500">{t.tournament.firstPlace}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-300">250 SPARK</p>
            <p className="text-xs text-gray-500">{t.tournament.secondPlace}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-400">100 SPARK</p>
            <p className="text-xs text-gray-500">{t.tournament.thirdPlace}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
