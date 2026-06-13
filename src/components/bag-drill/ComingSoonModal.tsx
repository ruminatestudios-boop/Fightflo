"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { COMING_SOON_COPY } from "@/lib/bag-drill/copy";
import { useComingSoonCapture } from "@/hooks/useComingSoonCapture";
import { WAITLIST_AVATARS } from "@/lib/media";
import type { ComingSoonInterest } from "@/lib/bag-drill/coming-soon-interests";

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
}

const MODE_OPTIONS: {
  id: ComingSoonInterest;
  title: string;
  tagline: string;
}[] = [
  {
    id: "muaythai",
    title: COMING_SOON_COPY.muayThaiTitle,
    tagline: COMING_SOON_COPY.muayThaiTagline,
  },
  {
    id: "kickboxing",
    title: COMING_SOON_COPY.kickboxingTitle,
    tagline: COMING_SOON_COPY.kickboxingTagline,
  },
];

function InterestCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
        checked
          ? "border-[#fa4141] bg-[#fa4141] text-white"
          : "border-white/20 bg-transparent text-transparent"
      }`}
      aria-hidden
    >
      ✓
    </span>
  );
}

export function ComingSoonModal({ open, onClose }: ComingSoonModalProps) {
  const capture = useComingSoonCapture();

  useEffect(() => {
    if (!open) return;
    void capture.fetchWaitlistCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const showForm =
    capture.status !== "success" && capture.status !== "already";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await capture.submit();
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
            className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm"
            aria-label="Close"
          />
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[100] mx-auto max-w-md overflow-hidden rounded-2xl border border-[#fa4141]/30 bg-black shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coming-soon-title"
          >
            <div className="border-b border-[#fa4141]/20 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <p
                  id="coming-soon-title"
                  className="font-display text-xs uppercase tracking-[0.2em] text-[#fa4141]"
                >
                  Coming soon
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 text-lg leading-none text-white/40 hover:text-white"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <p className="text-sm leading-relaxed text-white/55">
                {COMING_SOON_COPY.subtext}
              </p>

              <div className="space-y-2">
                <p className="text-xs text-white/45">{COMING_SOON_COPY.selectHint}</p>
                <div className="space-y-2">
                  {MODE_OPTIONS.map((mode) => {
                    const selected = capture.interests.includes(mode.id);
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => capture.toggleInterest(mode.id)}
                        aria-pressed={selected}
                        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          selected
                            ? "border-[#fa4141]/50 bg-[#fa4141]/10"
                            : "border-white/[0.08] bg-white/[0.03]"
                        }`}
                      >
                        <InterestCheckbox checked={selected} />
                        <div className="min-w-0">
                          <p className="font-display text-sm tracking-wide text-white">
                            {mode.title}
                          </p>
                          <p className="mt-1 text-sm text-white/65">{mode.tagline}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <AvatarStack
                images={WAITLIST_AVATARS}
                totalCount={
                  capture.waitlistCount ?? COMING_SOON_COPY.waitlistBaseCount
                }
                label={COMING_SOON_COPY.waitlistSocialLabel}
              />

              {showForm ? (
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={COMING_SOON_COPY.emailPlaceholder}
                    value={capture.email}
                    onChange={(e) => capture.setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white placeholder:text-white/30 focus:border-[#fa4141]/50 focus:outline-none"
                  />
                  {capture.status === "no_interest" && (
                    <p className="text-xs text-[#fa4141]">
                      {COMING_SOON_COPY.selectError}
                    </p>
                  )}
                  {capture.status === "invalid" && (
                    <p className="text-xs text-[#fa4141]">Enter a valid email</p>
                  )}
                  {capture.status === "error" && (
                    <p className="text-xs text-[#fa4141]">
                      Something went wrong — try again
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={capture.status === "submitting"}
                    className="font-display flex h-12 w-full items-center justify-center rounded-full bg-[#fa4141] text-sm tracking-[0.12em] text-white disabled:opacity-60"
                  >
                    {capture.status === "submitting"
                      ? "Saving…"
                      : COMING_SOON_COPY.submitLabel}
                  </button>
                  <p className="text-center text-[10px] text-white/35">
                    {COMING_SOON_COPY.finePrint}
                  </p>
                </form>
              ) : (
                <p className="rounded-xl border border-[#fa4141]/25 bg-[#fa4141]/10 px-4 py-4 text-center text-sm leading-relaxed text-white">
                  {COMING_SOON_COPY.successMessage}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
