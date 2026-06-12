"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadTimerUpsellStats,
  markUpsellTooltipSeen,
} from "@/lib/boxing-timer/upsell-storage";

const TOOLTIP_MS = 5000;

interface FlowBagSocialTooltipProps {
  enabled: boolean;
  children: React.ReactNode;
}

export function FlowBagSocialTooltip({
  enabled,
  children,
}: FlowBagSocialTooltipProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const stats = loadTimerUpsellStats();
    if (stats.hasSeenUpsell) return;

    setShow(true);
    markUpsellTooltipSeen();

    const t = window.setTimeout(() => setShow(false), TOOLTIP_MS);
    return () => clearTimeout(t);
  }, [enabled]);

  return (
    <span className="relative inline-block">
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-center text-[11px] leading-snug text-white/90 shadow-lg"
          >
            👆 This is how serious fighters use FightFlo
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
