"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SessionControlBar } from "@/components/training/SessionControlBar";
import type { UseBagFlurryResult } from "@/hooks/useBagFlurry";
import type { BagTrainingConfig } from "@/lib/bag-drill/types";
import { getBestFlurryForDuration } from "@/lib/bag-drill/storage";
import type { FightFloBagData } from "@/lib/bag-drill/types";

interface BagFlurryTrainingScreenProps {
  config: BagTrainingConfig;
  flurry: UseBagFlurryResult;
  data: FightFloBagData;
  onStop: () => void;
}

export function BagFlurryTrainingScreen({
  config,
  flurry,
  data,
  onStop,
}: BagFlurryTrainingScreenProps) {
  const { state, videoRef, start, tapPunch } = flurry;
  const seconds = config.flurrySeconds ?? 30;
  const personalBest = getBestFlurryForDuration(data, seconds);
  const showTap =
    state.phase === "go" &&
    (state.detectionMode === "visual-tap" ||
      state.detectionMode === "timer-fallback" ||
      state.detectionMode === "audio-hybrid");

  useEffect(() => {
    void start(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.phase === "done") {
      onStop();
    }
  }, [state.phase, onStop]);

  const progress =
    state.phase === "go" ? 1 - state.secondsLeft / seconds : 0;

  const phaseLabel =
    state.phase === "countdown"
      ? "Get ready"
      : state.phase === "go"
        ? "Punch flurry"
        : "Flurry";

  const showStatus = state.statusMessage && state.phase !== "go";
  const showBest = personalBest != null && state.phase !== "go";

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
        aria-hidden
      />

      <div className="relative z-10 shrink-0 px-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex h-5 items-center justify-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
            {phaseLabel}
          </p>
        </div>

        <div className="mx-auto flex h-10 max-w-xs items-center justify-center">
          <p
            className={`text-center text-[11px] text-white/35 ${
              showStatus ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={!showStatus}
          >
            {showStatus ? state.statusMessage : "\u00a0"}
          </p>
        </div>

        <div className="mx-auto flex h-6 items-center justify-center text-xs uppercase tracking-[0.12em] text-white/40">
          <span className={showBest ? "opacity-100" : "opacity-0"} aria-hidden={!showBest}>
            Best {seconds}s:{" "}
            <span className="text-white/80">{showBest ? personalBest : "—"}</span>
          </span>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        <div
          className="relative flex items-center justify-center"
          style={{ height: 280, width: 280 }}
        >
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 200 200"
            aria-hidden
          >
            <circle
              cx="100"
              cy="100"
              r="94"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="3"
            />
            <motion.circle
              cx="100"
              cy="100"
              r="94"
              fill="none"
              stroke="#fa4141"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 94}
              animate={{
                strokeDashoffset: 2 * Math.PI * 94 * (1 - progress),
              }}
              transition={{ duration: 0.2, ease: "linear" }}
            />
          </svg>

          <AnimatePresence mode="wait">
            {state.phase === "countdown" ? (
              <motion.p
                key="cd"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-display text-[clamp(4rem,20vw,7rem)] font-bold tabular-nums text-white"
              >
                {state.countdown}
              </motion.p>
            ) : (
              <motion.div key="go" className="text-center">
                <p className="font-display text-[clamp(3.5rem,18vw,6rem)] font-bold tabular-nums leading-none text-white">
                  {state.phase === "go" ? state.secondsLeft : seconds}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">
                  {state.phase === "go" ? "seconds left" : `${seconds}s round`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative z-10 w-full shrink-0 px-6 pb-2">
        <div className="mx-auto min-h-[9rem] text-center">
          <motion.div
            animate={state.phase === "go" ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.15 }}
          >
            <p className="font-display text-[clamp(3rem,14vw,5rem)] font-bold tabular-nums text-[#fa4141]">
              {state.punchCount}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">
              punches
            </p>
          </motion.div>

          <div className="mt-2 flex h-6 items-center justify-center text-sm text-white/50">
            {state.phase === "go" && state.punchesPerSecond > 0 ? (
              <>
                {state.punchesPerSecond.toFixed(1)}/sec
                {state.peakRate > state.punchesPerSecond && (
                  <span className="text-white/30">
                    {" "}
                    · peak {state.peakRate.toFixed(1)}
                  </span>
                )}
              </>
            ) : (
              <span className="opacity-0" aria-hidden>
                —
              </span>
            )}
          </div>

          <div className="flex min-h-[3.5rem] items-start justify-center pt-4">
            {showTap && (
              <button
                type="button"
                onClick={tapPunch}
                className="min-h-[3rem] min-w-[10rem] rounded-full border border-white/15 bg-white/[0.06] px-8 py-3 text-xs font-medium uppercase tracking-[0.14em] text-white/70 active:bg-white/10"
              >
                +1 hit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full shrink-0 px-8 pb-[env(safe-area-inset-bottom)]">
        <SessionControlBar showPause={false} onStop={onStop} />
      </div>
    </div>
  );
}
