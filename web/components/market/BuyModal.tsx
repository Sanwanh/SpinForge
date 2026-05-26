'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';

interface BuyModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  price: string;
  isPending: boolean;
}

export function BuyModal({ open, onClose, onConfirm, itemName, price, isPending }: BuyModalProps) {
  const t = useT();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm purchase"
          >
            <div className="card space-y-4 border-brand-blue/30">
              <h2 className="text-lg font-bold text-white">Confirm Purchase</h2>
              <p className="text-sm text-gray-400">
                You are about to purchase <span className="font-bold text-white">{itemName}</span> for{' '}
                <span className="font-bold text-brand-orange">{price} SPARK</span>.
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary flex-1" disabled={isPending}>
                  {t.common.cancel}
                </button>
                <button onClick={onConfirm} className="btn-primary flex-1" disabled={isPending}>
                  {isPending ? `${t.common.loading}` : t.common.confirm}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
