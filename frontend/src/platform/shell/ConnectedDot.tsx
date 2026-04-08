'use client';

import { motion } from 'framer-motion';

export function ConnectedDot() {
  return (
    <span className="relative flex h-2 w-2">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-success-400)]"
        animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
      />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success-500)]" />
    </span>
  );
}
