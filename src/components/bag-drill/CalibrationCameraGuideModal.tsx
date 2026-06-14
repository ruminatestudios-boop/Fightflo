"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BAG_COPY } from "@/lib/bag-drill/copy";

interface CalibrationCameraGuideModalProps {
  open: boolean;
  onClose: () => void;
}

function GuideContent() {
  const guide = BAG_COPY.calibrationCameraGuide;

  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
        {guide.title}
      </p>

      <div className="mt-3 flex items-center justify-center gap-3 py-1">
        <div className="flex flex-col items-center gap-1">
          <div className="h-10 w-10 rounded-lg border border-white/20 bg-white/5" aria-hidden />
          <span className="text-[9px] uppercase tracking-wider text-white/35">Bag</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1">
            <div className="h-6 w-3 rounded-sm bg-[#fa4141]/70" aria-hidden />
            <div className="h-4 w-4 rounded-full border border-white/30 bg-white/10" aria-hidden />
          </div>
          <span className="text-[9px] text-[#fa4141]/80">You · 45°</span>
          <div className="h-px w-16 bg-white/20" aria-hidden />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="h-10 w-6 rounded-md border border-[#fa4141]/40 bg-[#fa4141]/15" aria-hidden />
          <span className="text-[9px] uppercase tracking-wider text-white/35">Phone</span>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5 text-[11px] leading-snug text-white/60">
        {guide.placement.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-[#fa4141]/70">·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-white/35">{guide.avoid}</p>
    </>
  );
}

export function CalibrationCameraGuideModal({
  open,
  onClose,
}: CalibrationCameraGuideModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calibration-guide-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] px-5 py-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div id="calibration-guide-title">
              <GuideContent />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="font-display mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#fa4141] text-[13px] tracking-[0.14em] text-white"
            >
              Got it — show my camera
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
