"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { recordFlowBagClick } from "@/lib/boxing-timer/upsell-storage";

interface TimerRestUpsellBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 8000;

export function TimerRestUpsellBanner({
  visible,
  onDismiss,
}: TimerRestUpsellBannerProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
  }, [visible]);

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => {
      setShow(false);
      onDismiss();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  const dismiss = () => {
    setShow(false);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="pointer-events-auto fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 px-4"
          role="region"
          aria-label="fightflo suggestion"
        >
          <button
            type="button"
            onClick={dismiss}
            className="mx-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-[#fa4141]/25 bg-[#141414]/95 px-4 py-3 text-left shadow-lg backdrop-blur-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                {BAG_COPY.timerRestTitle}
              </p>
              <p className="mt-0.5 text-xs text-white/50">
                {BAG_COPY.timerRestSubtitle}
              </p>
            </div>
            <Link
              href="/"
              onClick={(e) => {
                e.stopPropagation();
                recordFlowBagClick();
                dismiss();
              }}
              className="shrink-0 rounded-full bg-[#fa4141] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white"
            >
              Try free →
            </Link>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
