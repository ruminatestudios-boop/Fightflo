"use client";

import { motion, AnimatePresence } from "framer-motion";
import { coachDisplayChunks } from "@/lib/coach-display";

interface ComboFlashProps {
  combo: { label: string; speak: string } | null;
  coachCue?: string | null;
}

export function ComboFlash({ combo, coachCue }: ComboFlashProps) {
  const coach = coachCue ? coachDisplayChunks(coachCue) : null;

  return (
    <div className="flex w-full flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {combo ? (
          <motion.div
            key={combo.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.18 }}
            className="text-center"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#525252]">
              Throw
            </p>
            <p className="font-display mt-2 text-4xl leading-tight text-white sm:text-5xl">
              {combo.label}
            </p>
            <p className="mt-3 text-base font-medium text-white sm:text-lg">
              {coachDisplayChunks(combo.speak).primary}
            </p>
          </motion.div>
        ) : coach ? (
          <motion.div
            key={coachCue}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="max-w-xs text-center"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#fa4141]/70">
              Coach
            </p>
            <p className="mt-2 text-xl font-semibold leading-snug text-white">
              {coach.primary}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="h-16 w-16 rounded-full border border-[#2a2a2a]">
              <div className="flex h-full items-center justify-center">
                <div className="h-10 w-10 animate-pulse rounded-full border border-[#fa4141]/20" />
              </div>
            </div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#525252]">
              In the round
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
