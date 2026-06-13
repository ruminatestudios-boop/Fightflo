"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { SessionControlBar } from "@/components/training/SessionControlBar";
import { BigClock } from "@/components/training/BigClock";
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
  const { state, videoRef, start, abort, tapPunch } = flurry;
  const seconds = config.flurrySeconds ?? 30;
  const personalBest = getBestFlurryForDuration(data, seconds);
  const showTap =
    state.phase === "go" &&
    (state.detectionMode === "visual-tap" ||
      state.detectionMode === "timer-fallback" ||
      state.detectionMode === "audio-hybrid");

  useEffect(() => {
    void start(config);
    return () => {
      abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.phase === "done") {
      onStop();
    }
  }, [state.phase, onStop]);

  const clockSeconds =
    state.phase === "countdown"
      ? state.countdown
      : state.phase === "go"
        ? state.secondsLeft
        : state.flurrySeconds;

  const clockVariant =
    state.phase === "countdown" ? "countdown" : "short";

  const phaseLabel =
    state.phase === "countdown"
      ? "Get ready"
      : state.phase === "go"
        ? "Punch flurry"
        : state.phase === "idle"
          ? "Starting"
          : "Flurry";

  const showStatus =
    state.statusMessage && state.phase !== "go" && state.phase !== "countdown";
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
        <BigClock
          seconds={clockSeconds}
          totalSeconds={state.phase === "go" ? seconds : undefined}
          variant={clockVariant}
          active={state.phase === "go"}
          running={state.phase === "go"}
          label={state.phase === "go" ? "Flurry" : undefined}
        />
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
