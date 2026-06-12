"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { SessionControlBar } from "@/components/training/SessionControlBar";
import {
  formatReaction,
  tierColor,
  type UseBagDrillResult,
} from "@/hooks/useBagDrill";
import { GuardWarningOverlay } from "@/components/bag-drill/GuardWarningOverlay";
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

const VALIDATION_COPY = {
  correct: "Combo complete",
  wrong: "Not enough hits",
  miss: "Missed",
} as const;

export function BagTrainingScreen({ config, drill, onStop }: BagTrainingScreenProps) {
  const { state, videoRef, start, tapPunch, disputeStrike, micBackupPunch } = drill;
  const tapOnly =
    state.detectionMode === "visual-tap" || state.detectionMode === "timer-fallback";
  const poseMode =
    state.detectionMode === "pose-triple" && state.liveConnected;
  const aiMode = poseMode && config.cameraMode === "fighter";
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

  const phaseLabel = state.inComboWindow
    ? aiMode && state.nextStrikeLabel
      ? `Throw — ${state.nextStrikeLabel}`
      : "Go — throw the combo"
    : "Listen";

  const modeBadge = poseMode
    ? config.cameraMode === "fighter"
      ? "Pose AI"
      : "Triple"
    : state.detectionMode === "audio-hybrid"
      ? "Mic"
      : "Tap";

  const statusText =
    (state.statusMessage && !state.inComboWindow) ||
    (state.statusMessage && state.inComboWindow && aiMode)
      ? state.statusMessage
      : "\u00a0";

  const validationText = state.lastValidation
    ? VALIDATION_COPY[state.lastValidation]
    : "\u00a0";

  const validationColor =
    state.lastValidation === "correct"
      ? "#4ade80"
      : state.lastValidation === "wrong" || state.lastValidation === "miss"
        ? "#fa4141"
        : "transparent";

  const reactionText =
    state.lastReactionSeconds != null && state.lastReactionTier
      ? `${formatReaction(state.lastReactionSeconds)} to first hit`
      : "\u00a0";

  const reactionColor =
    state.lastReactionTier != null
      ? tierColor(state.lastReactionTier)
      : "transparent";

  useEffect(() => {
    void start(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.isActive && state.elapsedSeconds >= config.timing.durationSeconds) {
      onStop();
    }
  }, [state.elapsedSeconds, state.isActive, config.timing.durationSeconds, onStop]);

  const maxHitDots = Math.max(state.hitsExpected, 6);

  return (
    <div
      className="fixed inset-0 z-40 grid overflow-hidden bg-black"
      style={{
        gridTemplateRows:
          "auto minmax(0, 1fr) 15.5rem 5.5rem",
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-emerald-500/20"
        animate={{ opacity: state.lastValidation === "correct" ? 0.35 : 0 }}
        transition={{ duration: 0.35 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-[#fa4141]/25"
        animate={{
          opacity:
            state.lastValidation === "wrong" || state.lastValidation === "miss"
              ? 0.35
              : 0,
        }}
        transition={{ duration: 0.35 }}
      />

      <video
        ref={videoRef}
        playsInline
        muted
        className={`pointer-events-none fixed inset-0 z-0 h-full w-full object-cover ${
          config.cameraMode === "fighter" ? "scale-x-[-1] opacity-30" : "h-px w-px opacity-0"
        }`}
        aria-hidden={config.cameraMode !== "fighter"}
      />

      <GuardWarningOverlay guard={state.guardWarning} />

      {/* Top band — fixed structure */}
      <header className="relative z-10 px-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto grid h-6 max-w-md grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span />
          <p className="truncate text-center text-xs font-medium uppercase tracking-[0.2em] text-white/40">
            {phaseLabel}
          </p>
          <span
            className={`justify-self-end rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
              aiMode
                ? "bg-emerald-500/20 text-emerald-400"
                : state.detectionMode === "audio-hybrid"
                  ? "bg-amber-500/15 text-amber-400/90"
                  : "bg-white/10 text-white/45"
            }`}
          >
            {modeBadge}
          </span>
        </div>

        <p className="mx-auto mt-2 flex h-10 max-w-xs items-center justify-center text-center text-[11px] leading-snug text-white/35">
          {statusText}
        </p>

        <div className="mx-auto mt-1 flex h-6 items-center justify-center gap-4 text-xs uppercase tracking-[0.12em] text-white/40">
          <span className="tabular-nums">
            Acc <span className="text-white/80">{state.accuracyPercent}%</span>
          </span>
          <span className="tabular-nums">
            Hits <span className="text-white/80">{state.punchCount}</span>
          </span>
          <span className="tabular-nums">
            Avg{" "}
            <span className="text-white/80">
              {state.avgReactionSeconds > 0
                ? `${state.avgReactionSeconds.toFixed(2)}s`
                : "—"}
            </span>
          </span>
        </div>

        <div className="mx-auto mt-2 flex h-2 items-center justify-center gap-1.5">
          {Array.from({ length: maxHitDots }).map((_, i) => {
            const active =
              state.hitsExpected > 0 &&
              state.inComboWindow &&
              i < state.hitsExpected;
            const filled = active && i < state.hitsInCombo;
            return (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-colors ${
                  !active
                    ? "bg-transparent"
                    : filled
                      ? "bg-emerald-500/80"
                      : "bg-white/10"
                }`}
              />
            );
          })}
        </div>
      </header>

      {/* Timer — centered in middle row only */}
      <main className="relative z-10 flex items-center justify-center px-6">
        <div className="relative h-[260px] w-[260px] shrink-0">
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
          <p className="absolute inset-0 flex items-center justify-center font-display text-[4rem] font-bold tabular-nums leading-none tracking-tight text-white">
            {formatTimer(state.elapsedSeconds)}
          </p>
        </div>
      </main>

      {/* Bottom band — every slot has fixed height */}
      <section className="relative z-10 w-full px-6">
        <div className="mx-auto flex h-full max-w-md flex-col">
          <div className="relative h-[4.5rem] shrink-0">
            <p
              className={`absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-white/25 transition-opacity ${
                state.currentCombo ? "opacity-0" : "opacity-100"
              }`}
            >
              Ready
            </p>
            <p
              className={`font-display absolute inset-0 flex items-center justify-center text-[clamp(1.75rem,8vw,3rem)] leading-tight tracking-wide text-white transition-opacity ${
                state.currentCombo ? "opacity-100" : "opacity-0"
              }`}
            >
              {state.currentCombo?.label ?? "\u00a0"}
            </p>
          </div>

          <p
            className="flex h-7 shrink-0 items-center justify-center text-sm font-medium uppercase tracking-[0.14em] transition-colors duration-200"
            style={{ color: validationColor }}
          >
            {validationText}
          </p>

          <div className="flex h-10 shrink-0 items-center justify-center overflow-hidden">
            {state.inComboWindow && state.strikeLog.length > 0 ? (
              <StrikeLogStrip entries={state.strikeLog} />
            ) : (
              <span className="text-xs text-transparent">—</span>
            )}
          </div>

          <p
            className="flex h-5 shrink-0 items-center justify-center text-xs uppercase tracking-[0.12em] transition-colors duration-200"
            style={{ color: reactionColor }}
          >
            {reactionText}
          </p>

          <div className="relative mt-1 h-14 shrink-0">
            {state.canDispute && (
              <button
                type="button"
                onClick={disputeStrike}
                className="absolute inset-x-0 top-0 text-center text-[11px] uppercase tracking-[0.12em] text-amber-400/90 underline-offset-2 hover:underline"
              >
                Dispute last call (1 per combo)
              </button>
            )}

            <div className="absolute inset-x-0 bottom-0 flex justify-center">
              {showMicBackup && (
                <button
                  type="button"
                  onClick={micBackupPunch}
                  className="h-12 min-w-[10rem] rounded-full border border-amber-500/30 bg-amber-500/10 px-8 text-xs font-medium uppercase tracking-[0.14em] text-amber-200/90 active:bg-amber-500/20"
                >
                  Mic backup — count hit
                </button>
              )}

              {showTap && (
                <button
                  type="button"
                  onClick={tapPunch}
                  className="h-12 min-w-[10rem] rounded-full border border-white/15 bg-white/[0.06] px-8 text-xs font-medium uppercase tracking-[0.14em] text-white/70 active:bg-white/10"
                >
                  {tapOnly ? "Tap per strike" : "+1 hit"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 flex items-end justify-center px-8 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <SessionControlBar showPause={false} onStop={onStop} />
      </footer>
    </div>
  );
}
