"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SessionControlBar } from "@/components/training/SessionControlBar";
import {
  formatReaction,
  tierColor,
  type UseBagDrillResult,
} from "@/hooks/useBagDrill";
import { StrikeLogStrip } from "@/components/bag-drill/StrikeLogStrip";
import type { BagTrainingConfig } from "@/lib/bag-drill/types";

interface BagTrainingScreenProps {
  config: BagTrainingConfig;
  drill: UseBagDrillResult;
  onStop: () => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BagTrainingScreen({ config, drill, onStop }: BagTrainingScreenProps) {
  const { state, videoRef, start, tapPunch, disputeStrike, micBackupPunch } = drill;
  const tapOnly =
    state.detectionMode === "visual-tap" || state.detectionMode === "timer-fallback";
  const aiMode = state.detectionMode === "live" && state.liveConnected;
  const showTap =
    state.inComboWindow &&
    state.hitsExpected > 0 &&
    !aiMode;
  const showMicBackup =
    aiMode && state.inComboWindow && state.micBackupHint;
  const progress = Math.min(
    1,
    state.elapsedSeconds / config.timing.durationSeconds
  );
  const comboKey = state.currentCombo?.id ?? "idle";

  const phaseLabel = state.inComboWindow
    ? aiMode && state.nextStrikeLabel
      ? `Throw — ${state.nextStrikeLabel}`
      : "Go — throw the combo"
    : "Listen";

  const showStatus =
    (state.statusMessage && !state.inComboWindow) ||
    (state.statusMessage && state.inComboWindow && aiMode);

  useEffect(() => {
    void start(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.isActive && state.elapsedSeconds >= config.timing.durationSeconds) {
      onStop();
    }
  }, [state.elapsedSeconds, state.isActive, config.timing.durationSeconds, onStop]);

  const validationColor =
    state.lastValidation === "correct"
      ? "#4ade80"
      : state.lastValidation === "wrong" || state.lastValidation === "miss"
        ? "#fa4141"
        : undefined;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-black">
      <AnimatePresence>
        {state.lastValidation === "correct" && (
          <motion.div
            key="ok"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute inset-0 bg-emerald-500/20"
          />
        )}
        {(state.lastValidation === "wrong" || state.lastValidation === "miss") && (
          <motion.div
            key="bad"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute inset-0 bg-[#fa4141]/25"
          />
        )}
      </AnimatePresence>

      <video
        ref={videoRef}
        playsInline
        muted
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
        aria-hidden
      />

      {/* Fixed top band — height never changes */}
      <div className="relative z-10 shrink-0 px-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex h-5 items-center justify-center gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
            {phaseLabel}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
              aiMode
                ? "bg-emerald-500/20 text-emerald-400"
                : state.detectionMode === "audio-hybrid"
                  ? "bg-amber-500/15 text-amber-400/90"
                  : "bg-white/10 text-white/45"
            }`}
          >
            {aiMode ? "Live AI" : state.detectionMode === "audio-hybrid" ? "Mic" : "Tap"}
          </span>
        </div>

        <div className="mx-auto flex h-10 max-w-xs items-center justify-center">
          <p
            className={`text-center text-[11px] leading-relaxed text-white/35 ${
              showStatus ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={!showStatus}
          >
            {showStatus ? state.statusMessage : "\u00a0"}
          </p>
        </div>

        <div className="mx-auto flex h-6 items-center justify-center gap-4 text-xs uppercase tracking-[0.12em] text-white/40">
          <span>
            Acc <span className="text-white/80">{state.accuracyPercent}%</span>
          </span>
          <span>
            Hits <span className="text-white/80">{state.punchCount}</span>
          </span>
          <span>
            Avg{" "}
            <span className="text-white/80">
              {state.avgReactionSeconds > 0
                ? `${state.avgReactionSeconds.toFixed(2)}s`
                : "—"}
            </span>
          </span>
        </div>

        <div className="mx-auto mb-2 flex h-2 items-center justify-center gap-1.5">
          {state.hitsExpected > 0 && state.inComboWindow
            ? Array.from({ length: state.hitsExpected }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    i < state.hitsInCombo ? "bg-emerald-500/80" : "bg-white/10"
                  }`}
                />
              ))
            : null}
        </div>
      </div>

      {/* Timer — locked vertical position */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        <div
          className="relative flex items-center justify-center"
          style={{ height: 260, width: 260 }}
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
              strokeWidth="2"
            />
            <motion.circle
              cx="100"
              cy="100"
              r="94"
              fill="none"
              stroke={state.inComboWindow ? "#fa4141" : "rgba(255,255,255,0.35)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 94}
              animate={{
                strokeDashoffset: 2 * Math.PI * 94 * (1 - progress),
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </svg>
          <p className="relative z-10 font-display text-[clamp(2.5rem,12vw,4.5rem)] font-bold tabular-nums leading-none text-white">
            {formatTimer(state.elapsedSeconds)}
          </p>
        </div>
      </div>

      {/* Fixed bottom band — combo + feedback */}
      <div className="relative z-10 w-full shrink-0 px-6 pb-2">
        <div className="mx-auto min-h-[11rem] w-full max-w-md text-center">
          <div className="flex min-h-[4.5rem] items-center justify-center">
            <AnimatePresence mode="wait">
              {state.currentCombo ? (
                <motion.div
                  key={comboKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="font-display text-[clamp(1.75rem,8vw,3.25rem)] leading-tight tracking-wide text-white">
                    {state.currentCombo.label}
                  </p>
                </motion.div>
              ) : (
                <p className="text-xs uppercase tracking-[0.2em] text-white/25">Ready</p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex min-h-[1.75rem] items-center justify-center">
            <AnimatePresence>
              {state.lastValidation && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium uppercase tracking-[0.14em]"
                  style={{ color: validationColor }}
                >
                  {state.lastValidation === "correct"
                    ? "Combo complete"
                    : state.lastValidation === "wrong"
                      ? "Not enough hits"
                      : "Missed"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-[2.5rem]">
            {state.inComboWindow && state.strikeLog.length > 0 && (
              <StrikeLogStrip entries={state.strikeLog} />
            )}
          </div>

          <div className="flex min-h-[1.25rem] items-center justify-center">
            {state.lastReactionSeconds != null && state.lastReactionTier && (
              <p
                className="text-xs uppercase tracking-[0.12em]"
                style={{ color: tierColor(state.lastReactionTier) }}
              >
                {formatReaction(state.lastReactionSeconds)} to first hit
              </p>
            )}
          </div>

          <div className="flex min-h-[2.5rem] flex-col items-center justify-start gap-3 pt-1">
            {state.canDispute && (
              <button
                type="button"
                onClick={disputeStrike}
                className="text-[11px] uppercase tracking-[0.12em] text-amber-400/90 underline-offset-2 hover:underline"
              >
                Dispute last call (1 per combo)
              </button>
            )}

            {showMicBackup && (
              <button
                type="button"
                onClick={micBackupPunch}
                className="min-h-[3rem] min-w-[10rem] rounded-full border border-amber-500/30 bg-amber-500/10 px-8 py-3 text-xs font-medium uppercase tracking-[0.14em] text-amber-200/90 active:bg-amber-500/20"
              >
                Mic backup — count hit
              </button>
            )}

            {showTap && (
              <button
                type="button"
                onClick={tapPunch}
                className="min-h-[3rem] min-w-[10rem] rounded-full border border-white/15 bg-white/[0.06] px-8 py-3 text-xs font-medium uppercase tracking-[0.14em] text-white/70 active:bg-white/10"
              >
                {tapOnly ? "Tap per strike" : "+1 hit"}
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
