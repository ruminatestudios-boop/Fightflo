"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { TimerEmailCaptureFields } from "@/components/timer/TimerEmailCaptureFields";
import { useTimerEmailCapture } from "@/hooks/useTimerEmailCapture";
import {
  loadTimerEmailStorage,
  markBannerDismissed,
  shouldShowEmailCapture,
} from "@/lib/boxing-timer/email-capture-storage";

interface TimerFirstVisitBannerProps {
  isPro?: boolean;
}

export function TimerFirstVisitBanner({ isPro = false }: TimerFirstVisitBannerProps) {
  const [visible, setVisible] = useState(false);
  const capture = useTimerEmailCapture();

  useEffect(() => {
    const storage = loadTimerEmailStorage();
    if (
      shouldShowEmailCapture(isPro) &&
      !storage.hasSeenBanner &&
      !storage.emailCaptured
    ) {
      setVisible(true);
    }
  }, [isPro]);

  const dismiss = () => {
    markBannerDismissed();
    setVisible(false);
  };

  const handleSubmit = async () => {
    const ok = await capture.submit("banner");
    if (ok || capture.status === "already") {
      markBannerDismissed();
      if (ok) setVisible(false);
    }
  };

  if (!visible && capture.status !== "success") return null;

  return (
    <AnimatePresence>
      {(visible || capture.status === "success") && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-50 border-b border-[#fa4141]/20 bg-[#0a0a0a]/98 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md"
          role="region"
          aria-label="FlowBag free access"
        >
          <div className="mx-auto flex max-w-lg items-start gap-3">
            <div className="min-w-0 flex-1">
              {capture.status === "success" || capture.status === "already" ? (
                <TimerEmailCaptureFields
                  email={capture.email}
                  onEmailChange={capture.setEmail}
                  status={capture.status}
                  onSubmit={() => {}}
                  compact
                />
              ) : (
                <>
                  <p className="text-xs font-medium leading-snug text-white">
                    🥊 {BAG_COPY.timerBanner}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/50">
                    Enter email for free access
                  </p>
                  <div className="relative mt-2">
                    <TimerEmailCaptureFields
                      email={capture.email}
                      onEmailChange={(v) => {
                        capture.setEmail(v);
                        capture.resetError();
                      }}
                      status={capture.status}
                      onSubmit={() => void handleSubmit()}
                      compact
                    />
                  </div>
                </>
              )}
            </div>
            {capture.status !== "success" && (
              <button
                type="button"
                onClick={dismiss}
                className="shrink-0 p-1 text-lg leading-none text-[#525252] hover:text-white"
                aria-label="Dismiss"
              >
                ×
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
