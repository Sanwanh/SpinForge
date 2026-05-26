'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface DuplicateWarningProps {
  show: boolean;
}

export function DuplicateWarning({ show }: DuplicateWarningProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3"
          role="alert"
        >
          <p className="text-sm font-medium text-red-400">
            Duplicate parts detected! WBBA rules prohibit using the same part across multiple Beys in your deck.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
