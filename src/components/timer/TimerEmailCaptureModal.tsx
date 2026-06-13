"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { TimerEmailCaptureFields } from "@/components/timer/TimerEmailCaptureFields";
import { useTimerEmailCapture } from "@/hooks/useTimerEmailCapture";

interface TimerEmailCaptureModalProps {
  open: boolean;
  onClose: () => void;
}

export function TimerEmailCaptureModal({
  open,
  onClose,
}: TimerEmailCaptureModalProps) {
  const capture = useTimerEmailCapture();

  const handleSubmit = async () => {
    const ok = await capture.submit("round3");
    if (ok) return;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            aria-label="Close"
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-4 top-[max(4rem,env(safe-area-inset-top))] z-[70] mx-auto max-w-sm rounded-2xl border border-[#fa4141]/20 bg-[#0a0a0a] p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-modal-title"
          >
            <h2
              id="email-modal-title"
              className="font-display text-xl tracking-wide text-white"
            >
              {BAG_COPY.timerUpsellTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#a3a3a3]">
              {BAG_COPY.timerUpsellBody}
            </p>
            <div className="mt-6">
              <TimerEmailCaptureFields
                email={capture.email}
                onEmailChange={(v) => {
                  capture.setEmail(v);
                  capture.resetError();
                }}
                status={capture.status}
                onSubmit={() => void handleSubmit()}
              />
            </div>
            {capture.status !== "success" && capture.status !== "already" && (
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full text-center text-xs text-[#525252] hover:text-[#737373]"
              >
                No thanks
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
