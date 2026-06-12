"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { GuardState } from "@/lib/bag-drill/detection/guard-monitor";

interface GuardWarningOverlayProps {
  guard: GuardState | null;
}

export function GuardWarningOverlay({ guard }: GuardWarningOverlayProps) {
  const warning = guard?.warning;
  const message = guard?.message;

  return (
    <>
      <AnimatePresence>
        {warning === "left" && (
          <motion.div
            key="left-flash"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-y-0 left-0 z-30 w-1/2 bg-red-600"
          />
        )}
        {warning === "right" && (
          <motion.div
            key="right-flash"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-y-0 right-0 z-30 w-1/2 bg-red-600"
          />
        )}
        {warning === "both" && (
          <motion.div
            key="both-flash"
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0.12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 z-30 bg-red-600"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {message && (
          <motion.div
            key="guard-msg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="pointer-events-none absolute inset-x-0 top-[18%] z-40 flex justify-center px-4"
          >
            <p className="rounded-xl bg-red-600/90 px-4 py-2 text-center text-sm font-bold uppercase tracking-wide text-white shadow-lg">
              {message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
