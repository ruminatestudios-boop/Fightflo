"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SIGNAL_CONFIG, SIGNAL_ONBOARDING } from "@/lib/constants";
import { audioEngine } from "@/lib/audio";
import { initCoachVoice, speakCoachLine } from "@/lib/coach-voice";
import { getSignalLabel } from "@/lib/i18n";
import type { SignalType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { AppTopBar } from "@/components/ui/AppTopBar";
import { setSignalsPreviewed } from "@/lib/storage";

interface OnboardingScreenProps {
  onGoToPaywall: () => void;
}

export function OnboardingScreen({ onGoToPaywall }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [activePreview, setActivePreview] = useState<SignalType | null>(null);

  const previewSignal = async (type: SignalType) => {
    await audioEngine.unlock();
    await initCoachVoice("en");
    setActivePreview(type);
    setSignalsPreviewed();
    speakCoachLine(getSignalLabel(type, "en"));
    setTimeout(() => setActivePreview(null), 1200);
  };

  const next = () => {
    if (step < 1) setStep(step + 1);
    else onGoToPaywall();
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-black px-5 pb-8 pt-10">
      <AppTopBar
        trailing={
          <button
            type="button"
            onClick={onGoToPaywall}
            className="font-display text-[11px] tracking-[0.12em] text-[#525252] hover:text-white"
          >
            Skip
          </button>
        }
      />

      <div className="mb-8 flex gap-1.5">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`h-0.5 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-[#fa4141]" : i < step ? "w-4 bg-[#525252]" : "w-4 bg-white/[0.08]"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center py-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="signals"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35 }}
            >
              <p className="label text-[#525252]">Tap to preview</p>
              <h2 className="mt-2 font-display text-3xl tracking-wide text-white">
                Three moves
              </h2>
              <p className="mt-2 text-sm text-[#8e9297]">Attack · Defend · Move</p>

              <div className="mt-6 grid grid-cols-2 gap-2">
                {SIGNAL_ONBOARDING.map(({ type, action, beepHint }) => {
                  const config = SIGNAL_CONFIG[type];
                  const isActive = activePreview === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => previewSignal(type)}
                      className={`rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                        isActive ? "nike-card-selected" : "nike-card hover:border-white/[0.12]"
                      }`}
                    >
                      <span
                        className="font-display text-sm tracking-wider"
                        style={{ color: config.color }}
                      >
                        {config.label}
                      </span>
                      <p className="mt-2 text-sm text-[#8e9297]">{action}</p>
                      <p className="mt-1 text-[11px] text-[#525252]">
                        {beepHint.replace(/beep/i, "tone")}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35 }}
            >
              <p className="label text-[#525252]">You&apos;re set</p>
              <h2 className="mt-2 font-display text-[2.25rem] leading-[0.95] tracking-wide text-white">
                Two ways
                <br />
                to train
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[#8e9297]">
                <span className="text-white">Solo React</span> — hear attack, defend, move.{" "}
                <span className="text-white">Combo Calls</span> — voice throws combinations.
              </p>

              <div className="nike-card mt-8 max-w-sm space-y-4 rounded-2xl px-5 py-5 text-sm">
                {[
                  ["01", "3-2-1-GO", "then the round bell rings"],
                  ["02", "Attack", "throw shots — screen goes red"],
                  ["03", "Rest", "survive all rounds, get your score"],
                ].map(([num, title, desc]) => (
                  <div key={num} className="flex gap-3">
                    <span className="font-display text-xs text-[#fa4141]">{num}</span>
                    <p className="text-[#8e9297]">
                      <span className="text-white">{title}</span> — {desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        <Button onClick={next}>{step === 1 ? "Continue" : "Next"}</Button>
        {step === 0 && (
          <p className="text-center text-xs text-[#525252]">
            Tap every signal at least once
          </p>
        )}
      </div>
    </div>
  );
}
