"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppTopBar } from "@/components/ui/AppTopBar";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import type { CalibrationPurpose } from "@/lib/bag-drill/calibration-purpose";

const STEP_MS = 4500;

interface BagSetupIntroScreenProps {
  purpose: CalibrationPurpose;
  onBack: () => void;
  onHome?: () => void;
  onStartCalibration: () => void;
  onSkipCalibration: () => void;
}

export function BagSetupIntroScreen({
  purpose,
  onBack,
  onHome,
  onStartCalibration,
  onSkipCalibration,
}: BagSetupIntroScreenProps) {
  const drill = BAG_COPY.drillCalibration[purpose];
  const copy = drill.intro;
  const stepCount = copy.steps.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % stepCount);
      setCycleKey((key) => key + 1);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [cycleKey, stepCount]);

  const selectStep = useCallback((index: number) => {
    setActiveIndex(index);
    setCycleKey((key) => key + 1);
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black">
      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <AppTopBar onBack={onBack} onHome={onHome} className="mb-2" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <p className="label text-[#fa4141]">{drill.eyebrow}</p>
          <h1 className="font-display mt-2 text-[1.75rem] leading-tight tracking-wide text-white">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">{copy.subtitle}</p>
          <p className="mt-1 text-xs text-white/35">{copy.timeEstimate}</p>

          <ol className="mt-8 space-y-3">
            {copy.steps.map((step, index) => {
              const isActive = index === activeIndex;

              return (
                <li key={step.title}>
                  <button
                    type="button"
                    onClick={() => selectStep(index)}
                    className="nike-card flex w-full gap-4 rounded-xl px-4 py-3.5 text-left"
                  >
                    <span
                      className={`font-display shrink-0 text-lg transition-colors ${
                        isActive ? "text-[#fa4141]" : "text-[#fa4141]/80"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-display relative inline-block text-sm transition-colors ${
                          isActive ? "text-white" : "text-white/55"
                        }`}
                      >
                        {step.title}
                        {isActive && (
                          <motion.span
                            key={`underline-${index}-${cycleKey}`}
                            className="absolute -bottom-0.5 left-0 h-0.5 w-full bg-[#fa4141]"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            style={{ transformOrigin: "left center" }}
                          />
                        )}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">
                        {step.detail}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-auto space-y-3 pt-8">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={onStartCalibration}
              className="font-display flex h-14 w-full items-center justify-center rounded-full bg-[#fa4141] text-[15px] tracking-[0.14em] text-white"
            >
              {copy.cta}
            </motion.button>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <button
                type="button"
                onClick={onSkipCalibration}
                className="w-full text-center text-sm text-white/55 underline-offset-2 hover:text-white/75 hover:underline"
              >
                {copy.skip}
              </button>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-white/35">
                {copy.skipWarning}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
