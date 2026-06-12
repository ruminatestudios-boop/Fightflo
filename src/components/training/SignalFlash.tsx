"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SIGNAL_ACTIONS, SIGNAL_CONFIG } from "@/lib/constants";
import { coachDisplayChunks } from "@/lib/coach-display";
import type { SignalType } from "@/lib/types";

interface SignalFlashProps {
  signal: SignalType | null;
  clearMode?: boolean;
  coachCue?: string | null;
}

export function SignalFlash({ signal, clearMode = false, coachCue }: SignalFlashProps) {
  const config = signal ? SIGNAL_CONFIG[signal] : null;
  const action = signal ? SIGNAL_ACTIONS[signal] : null;
  const coach = coachCue ? coachDisplayChunks(coachCue) : null;

  if (clearMode && signal && config) {
    return (
      <div className="flex w-full flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={signal}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.18 }}
            className="text-center"
          >
            <p
              className="font-display text-[72px] leading-none sm:text-[96px]"
              style={{ color: config.color }}
            >
              {config.label}
            </p>
            {action && (
              <p className="mt-3 text-lg font-medium text-white">
                {action}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[200px] w-full max-w-sm flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {signal && config ? (
          <motion.div
            key={signal}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex w-full flex-col items-center"
          >
            <div
              className="relative flex h-36 w-36 flex-col items-center justify-center rounded-full border sm:h-40 sm:w-40"
              style={{
                borderColor: `${config.color}40`,
                background: `${config.bgFlash}`,
              }}
            >
              <span
                className="font-display text-3xl sm:text-4xl"
                style={{ color: config.color }}
              >
                {config.label}
              </span>
            </div>
            {action && (
              <p className="mt-5 text-center text-lg font-medium text-white">
                {action}
              </p>
            )}
          </motion.div>
        ) : coach ? (
          <motion.div
            key={coachCue}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="w-full text-center"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#fa4141]/70">
              Coach
            </p>
            <p className="mt-2 text-xl font-semibold leading-snug text-white sm:text-2xl">
              {coach.primary}
            </p>
            {coach.secondary && (
              <p className="mt-2 text-sm leading-snug text-[#737373]">{coach.secondary}</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative h-20 w-20 rounded-full border border-[#2a2a2a]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 animate-pulse rounded-full border border-[#fa4141]/20" />
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
