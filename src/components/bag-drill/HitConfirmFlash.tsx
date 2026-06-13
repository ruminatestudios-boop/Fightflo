"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HitConfirmFlashProps {
  impactAt: number | null;
  label?: string | null;
  headline?: string;
  className?: string;
}

/** Full-screen punch confirmation — flash + label so the user knows it registered. */
export function HitConfirmFlash({
  impactAt,
  label,
  headline = "Punch heard ✓",
  className = "",
}: HitConfirmFlashProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!impactAt) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 750);
    return () => window.clearTimeout(id);
  }, [impactAt]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.18 }}
          className={`pointer-events-none fixed inset-0 z-[45] flex items-center justify-center ${className}`}
          aria-live="polite"
        >
          <div className="absolute inset-0 bg-emerald-500/15" aria-hidden />
          <div className="relative rounded-3xl border border-emerald-400/40 bg-black/75 px-8 py-6 text-center shadow-[0_0_48px_rgba(52,211,153,0.25)] backdrop-blur-sm">
            <p className="font-display text-[clamp(1.5rem,7vw,2.25rem)] tracking-wide text-emerald-300">
              {headline}
            </p>
            {label && (
              <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-white/80">
                {label}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
