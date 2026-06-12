"use client";

import { motion } from "framer-motion";

export interface FighterResearchStep {
  id: string;
  label: string;
  detail: string;
}

interface FighterResearchLoaderProps {
  fighterName: string;
  activeStep: number;
  steps: FighterResearchStep[];
}

function StepIcon({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fa4141]/20 text-[#fa4141]">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (state === "active") {
    return (
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#fa4141]/25" />
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-[#fa4141]/50 bg-[#fa4141]/10">
          <span className="h-2 w-2 rounded-full bg-[#fa4141]" />
        </span>
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#525252]" />
    </span>
  );
}

export function FighterResearchLoader({
  fighterName,
  activeStep,
  steps,
}: FighterResearchLoaderProps) {
  const progress = Math.min(100, ((activeStep + 1) / steps.length) * 100);
  const current = steps[activeStep];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="mt-8 overflow-hidden rounded-2xl border border-[#fa4141]/20 bg-[#0a0a0a]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-1 w-full bg-white/[0.04]">
        <motion.div
          className="h-full bg-gradient-to-r from-[#fa4141]/70 to-[#fa4141]"
          initial={{ width: "8%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#fa4141]">
            AI researching
          </p>
          <span className="text-[11px] text-[#525252]">
            Step {Math.min(activeStep + 1, steps.length)} of {steps.length}
          </span>
        </div>

        <h3 className="font-display mt-3 text-2xl tracking-wide text-white">
          vs {fighterName}
        </h3>

        {current && (
          <motion.p
            key={current.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-2 text-sm text-[#a3a3a3]"
          >
            {current.detail}
          </motion.p>
        )}

        <ul className="mt-6 space-y-4">
          {steps.map((step, i) => {
            const state =
              i < activeStep ? "done" : i === activeStep ? "active" : "pending";

            return (
              <li key={step.id} className="flex items-start gap-3">
                <StepIcon state={state} />
                <div className="min-w-0 pt-0.5">
                  <p
                    className={`text-sm font-medium ${
                      state === "pending" ? "text-[#525252]" : "text-white"
                    }`}
                  >
                    {step.label}
                  </p>
                  {state === "active" && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-0.5 text-xs text-[#737373]"
                    >
                      In progress…
                    </motion.p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-center text-xs text-[#525252]">
          Usually takes 10–20 seconds · stay on this screen
        </p>
      </div>
    </motion.div>
  );
}
