"use client";

import { useEffect } from "react";
import { SessionControlBar } from "@/components/training/SessionControlBar";
import { BigClock } from "@/components/training/BigClock";
import {
  formatReaction,
  tierColor,
  type UseBagDrillResult,
} from "@/hooks/useBagDrill";
import { GuardWarningOverlay } from "@/components/bag-drill/GuardWarningOverlay";
import { StrikeLogStrip } from "@/components/bag-drill/StrikeLogStrip";
import { formatStrikeSpeed } from "@/lib/bag-drill/strike-speed";
import type { BagTrainingConfig } from "@/lib/bag-drill/types";

interface BagTrainingScreenProps {
  config: BagTrainingConfig;
  drill: UseBagDrillResult;
  mediaStream?: MediaStream | null;
  onStop: () => void;
}

const VALIDATION_COPY = {
  correct: "Combo complete",
  wrong: "Not enough hits",
  miss: "Missed",
} as const;

export function BagTrainingScreen({
  config,
  drill,
  mediaStream,
  onStop,
}: BagTrainingScreenProps) {
  const { state, videoRef, start, tapPunch, disputeStrike, micBackupPunch } = drill;
  const tapOnly =
    state.detectionMode === "visual-tap" || state.detectionMode === "timer-fallback";
  const poseMode =
    state.detectionMode === "pose-triple" && state.liveConnected;
  const aiMode = poseMode && config.cameraMode === "fighter";
  const isSpeedDrill = config.drillMode === "speed";
  const showTap =
    state.inComboWindow &&
    state.hitsExpected > 0 &&
    !aiMode;
  const showMicBackup =
    aiMode && state.inComboWindow && state.micBackupHint;

  const statusText =
    (state.statusMessage && !state.inComboWindow) ||
    (state.statusMessage && state.inComboWindow && aiMode)
      ? state.statusMessage
      : "\u00a0";

  const validationText = isSpeedDrill
    ? state.lastStrikeSpeedSeconds != null && state.lastStrikeSpeedLabel
      ? `${state.lastStrikeSpeedLabel} ${formatStrikeSpeed(state.lastStrikeSpeedSeconds)}`
      : state.inComboWindow
        ? "Throw when you hear go"
        : "\u00a0"
    : state.lastValidation
      ? VALIDATION_COPY[state.lastValidation]
      : "\u00a0";

  const validationColor = isSpeedDrill
    ? state.lastStrikeSpeedSeconds != null
      ? "#4ade80"
      : "transparent"
    : state.lastValidation === "correct"
      ? "#4ade80"
      : state.lastValidation === "wrong" || state.lastValidation === "miss"
        ? "#fa4141"
        : "transparent";

  const reactionText = isSpeedDrill
    ? state.inComboWindow
      ? "Timing each punch"
      : "\u00a0"
    : state.lastReactionSeconds != null && state.lastReactionTier
      ? `${formatReaction(state.lastReactionSeconds)} to first hit`
      : "\u00a0";

  const reactionColor =
    state.lastReactionTier != null
      ? tierColor(state.lastReactionTier)
      : "transparent";

  useEffect(() => {
    void start(config, { mediaStream });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.isActive && state.elapsedSeconds >= config.timing.durationSeconds) {
      onStop();
    }
  }, [state.elapsedSeconds, state.isActive, config.timing.durationSeconds, onStop]);

  const hitDotCount =
    state.inComboWindow && state.hitsExpected > 0 ? state.hitsExpected : 0;

  return (
    <div
      className="fixed inset-0 z-40 grid overflow-hidden bg-black"
      style={{
        gridTemplateRows:
          "auto minmax(0, 1fr) 15.5rem 5.5rem",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-black/75"
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
        {statusText.trim() !== "\u00a0" && (
          <p className="mx-auto flex h-8 max-w-xs items-center justify-center text-center text-[11px] leading-snug text-white/35">
            {statusText}
          </p>
        )}

        <div className="mx-auto flex h-6 items-center justify-center gap-4 text-xs uppercase tracking-[0.12em] text-white/40">
          <span className="tabular-nums">
            Match <span className="text-white/80">{state.accuracyPercent}%</span>
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

        <div className="mx-auto mt-2 flex h-2 min-h-2 w-full items-center justify-center gap-1.5">
          {Array.from({ length: hitDotCount }).map((_, i) => {
            const filled = i < state.hitsInCombo;
            return (
              <div
                key={i}
                className={`h-2 w-8 shrink-0 rounded-full transition-colors ${
                  filled ? "bg-emerald-500/80" : "bg-white/10"
                }`}
              />
            );
          })}
        </div>
      </header>

      {/* Timer — big clock with top progress bar */}
      <main className="relative z-10 flex items-center justify-center px-6">
        <BigClock
          seconds={state.elapsedSeconds}
          totalSeconds={config.timing.durationSeconds}
          variant="session"
          active={state.inComboWindow}
          running={state.isActive}
          label={state.inComboWindow ? "Go" : isSpeedDrill ? "Listen" : "Listen"}
        />
      </main>

      {/* Bottom band — every slot has fixed height */}
      <section className="relative z-10 w-full px-6">
        <div className="mx-auto flex h-full max-w-md flex-col">
          <div className="relative h-[4.5rem] shrink-0">
            <p
              className={`absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-white/25 transition-opacity ${
                state.currentCombo && !state.inComboWindow ? "opacity-0" : "opacity-100"
              }`}
            >
              Ready
            </p>
            <p
              className={`font-display absolute inset-0 flex items-center justify-center text-[clamp(1.75rem,8vw,3rem)] leading-tight tracking-wide text-white transition-opacity ${
                state.currentCombo && !state.inComboWindow ? "opacity-100" : "opacity-0"
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
