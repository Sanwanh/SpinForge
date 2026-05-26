'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { RARITY_LABELS, RARITY_BORDER_CLASSES, SPIRIT_BEASTS, ELEMENT_COLORS, PACKAGE_ID, type Rarity, type Element } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import { useSparkBalance, useSparkCoins } from '@/hooks/useSparkBalance';
import { useInventory } from '@/hooks/useInventory';
import { openPack } from '@/lib/move-calls';

interface RevealedPart {
  id: string;
  name: string;
  type: string;
  rarity: string;
}

export default function PacksPage() {
  const account = useCurrentAccount();
  const t = useT();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { formatted: sparkBalance } = useSparkBalance();
  const { primaryCoinId, refetch: refetchCoins } = useSparkCoins();
  const { refetch: refetchInventory } = useInventory();
  const [isOpening, setIsOpening] = useState(false);
  const [revealed, setRevealed] = useState<RevealedPart[]>([]);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const handleOpenPack = useCallback(async () => {
    if (!primaryCoinId) {
      setError('No SPARK tokens found. You need 100 SPARK to open a pack.');
      return;
    }

    setIsOpening(true);
    setError(null);
    setRevealed([]);
    setRevealIndex(-1);

    try {
      const tx = openPack(primaryCoinId);
      const result = await signAndExecute({ transaction: tx });

      const txDetails = await client.waitForTransaction({
        digest: result.digest,
        options: { showObjectChanges: true },
      });

      const newParts: RevealedPart[] = [];
      for (const change of txDetails.objectChanges ?? []) {
        if (change.type !== 'created') continue;
        const objType = change.objectType ?? '';
        if (!objType.includes(PACKAGE_ID)) continue;

        let partType = 'Unknown';
        if (objType.includes('::blade::Blade')) partType = 'Blade';
        else if (objType.includes('::ratchet::Ratchet')) partType = 'Ratchet';
        else if (objType.includes('::bit::Bit')) partType = 'Bit';
        else continue;

        const obj = await client.getObject({
          id: change.objectId,
          options: { showContent: true },
        });
        const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields ?? {};
        const name = (fields.name as string) ?? partType;
        const rarity = RARITY_LABELS[fields.rarity as number] ?? 'Common';

        newParts.push({ id: change.objectId, name, type: partType, rarity });
      }

      setRevealed(newParts.length > 0 ? newParts : [
        { id: '?', name: 'Pack Opened!', type: 'Check Collection', rarity: 'Common' },
      ]);

      for (let i = 0; i < newParts.length; i++) {
        await new Promise((r) => setTimeout(r, 500));
        setRevealIndex(i);
      }

      refetchCoins();
      refetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open pack');
    } finally {
      setIsOpening(false);
    }
  }, [primaryCoinId, signAndExecute, client, refetchCoins, refetchInventory]);

  const handleReset = useCallback(() => {
    setRevealed([]);
    setRevealIndex(-1);
    setError(null);
  }, []);

  if (!account) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">{t.packs.connectPrompt}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{t.packs.title}</h1>
        <p className="text-sm text-gray-400">
          {t.packs.contains}. {t.packs.cost}: 100 SPARK
        </p>
        <p className="mt-1 text-sm text-brand-orange">
          SPARK {t.home.rank === '段位' ? '餘額' : 'Balance'}: {sparkBalance}
        </p>
      </motion.div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {revealed.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-16">
          <motion.div
            whileHover={!isOpening ? { scale: 1.05, rotateY: 10 } : {}}
            whileTap={!isOpening ? { scale: 0.95 } : {}}
            className={`flex h-48 w-36 cursor-pointer items-center justify-center rounded-xl border-2 border-brand-blue bg-gradient-to-br from-brand-blue/20 to-brand-orange/20 ${isOpening ? 'animate-pulse' : ''}`}
            onClick={!isOpening ? handleOpenPack : undefined}
          >
            <div className="text-center">
              <div className="text-4xl font-black text-gradient">S</div>
              <p className="mt-2 text-xs text-gray-400">
                {isOpening ? (t.common.loading) : 'Click to Open'}
              </p>
            </div>
          </motion.div>
          <p className="text-sm text-gray-500">100 SPARK per pack</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            <AnimatePresence>
              {revealed.map((part, i) => {
                const rarityLabel = (part.rarity as Rarity) ?? 'Common';
                const borderClass = RARITY_BORDER_CLASSES[rarityLabel] ?? '';

                return i <= revealIndex ? (
                  <motion.div
                    key={part.id}
                    initial={{ rotateY: 180, opacity: 0, scale: 0.5 }}
                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className={`card flex flex-col items-center gap-2 border-2 p-4 ${borderClass}`}
                  >
                    <span className="text-xs font-bold text-white">{part.name}</span>
                    <span className="text-[10px] text-gray-500">{part.type}</span>
                    <span className="text-[10px] font-bold text-brand-blue">{rarityLabel}</span>
                    <span className="truncate text-[8px] text-gray-600">{part.id.slice(0, 10)}...</span>
                  </motion.div>
                ) : (
                  <div
                    key={part.id}
                    className="card flex h-32 items-center justify-center border-2 border-gray-700 animate-pulse"
                  >
                    <span className="text-gray-600">?</span>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>

          {!isOpening && (
            <div className="flex justify-center gap-4">
              <button onClick={handleReset} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">{t.common.back}</button>
              <button onClick={handleOpenPack} className="btn-primary">{t.packs.openPack}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
