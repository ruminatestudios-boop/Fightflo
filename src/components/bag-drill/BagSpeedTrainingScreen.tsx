"use client";

import { useEffect } from "react";
import { SessionControlBar } from "@/components/training/SessionControlBar";
import { formatReaction, tierColor, type UseBagDrillResult } from "@/hooks/useBagDrill";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import { tierLabel } from "@/lib/bag-drill/reaction-timing";
import { strikeLabel } from "@/lib/bag-drill/strike-speed";
import { CAMERA_MODE_COPY } from "@/components/bag-drill/bag-ui";
import type { BagTrainingConfig } from "@/lib/bag-drill/types";

interface BagSpeedTrainingScreenProps {
  config: BagTrainingConfig;
  drill: UseBagDrillResult;
  mediaStream?: MediaStream | null;
  onStop: () => void;
}

const COPY = BAG_COPY.speedTraining;

export function BagSpeedTrainingScreen({
  config,
  drill,
  mediaStream,
  onStop,
}: BagSpeedTrainingScreenProps) {
  const { state, videoRef, start, tapPunch, micBackupPunch, retrySpeedPunch } =
    drill;
  const aiMode =
    state.detectionMode === "pose-triple" &&
    state.liveConnected &&
    config.cameraMode === "fighter";
  const tapOnly =
    state.detectionMode === "visual-tap" || state.detectionMode === "timer-fallback";

  const activePunchId = state.speedPunchId ?? config.speedStrikeId ?? "jab";
  const modeCopy = CAMERA_MODE_COPY[config.cameraMode];
  const punchLabel = strikeLabel(activePunchId);
  const phase = state.speedPhase;

  const showTap =
    phase === "go" && state.inComboWindow && !aiMode;
  const showMicBackup =
    aiMode && phase === "go" && state.inComboWindow && state.micBackupHint;

  useEffect(() => {
    void start(config, { mediaStream });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const instruction =
    phase === "go"
      ? COPY.go
      : phase === "miss"
        ? state.lastValidation === "wrong"
          ? COPY.wrong
          : COPY.miss
        : phase === "result"
          ? COPY.resultLabel
          : COPY.arming;

  const centerContent = (() => {
    if (!state.isActive) {
      return { label: punchLabel, color: "#ffffff", size: "text-4xl" };
    }
    if (phase === "result" && state.speedResultSeconds != null) {
      return {
        label: formatReaction(state.speedResultSeconds),
        color: state.speedResultTier
          ? tierColor(state.speedResultTier)
          : "#4ade80",
        size: "text-[clamp(3.5rem,18vw,6rem)]",
      };
    }
    if (phase === "go") {
      return { label: "GO", color: "#fa4141", size: "text-[clamp(3.5rem,18vw,6rem)]" };
    }
    if (phase === "miss") {
      return { label: punchLabel, color: "#ffffff", size: "text-4xl" };
    }
    return { label: punchLabel, color: "#ffffff", size: "text-[clamp(2.75rem,14vw,4.5rem)]" };
  })();

  const showControls = phase !== "result";

  return (
    <div className="fixed inset-0 z-40 grid overflow-hidden bg-black">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-black/80"
      />

      <video
        ref={videoRef}
        playsInline
        muted
        className={`pointer-events-none fixed inset-0 z-0 h-full w-full object-cover ${
          config.cameraMode === "fighter" ? "scale-x-[-1] opacity-20" : "h-px w-px opacity-0"
        }`}
        aria-hidden={config.cameraMode !== "fighter"}
      />

      <header className="relative z-10 px-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-white/35">
          Punch speed
        </p>
        <p className="mt-2 text-center text-xs uppercase tracking-[0.12em] text-white/40">
          {punchLabel}
          <span className="mx-2 text-white/20">·</span>
          Mode <span className="text-white/80">{modeCopy.toggleLabel}</span>
        </p>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-6">
        {!state.isActive ? (
          <>
            <p className="text-xs uppercase tracking-[0.22em] text-white/30">
              Starting
            </p>
            <p className="font-display mt-3 text-4xl tracking-wide text-white/80">
              {punchLabel}
            </p>
          </>
        ) : phase === "result" ? (
          <>
            <p className="text-xs uppercase tracking-[0.22em] text-white/30">
              {COPY.resultEyebrow}
            </p>
            <p
              className="font-display mt-3 text-[clamp(3.5rem,18vw,6rem)] leading-none tracking-wide"
              style={{ color: centerContent.color }}
            >
              {centerContent.label}
            </p>
            <p className="mt-3 text-sm uppercase tracking-[0.14em] text-white/45">
              {punchLabel} · {COPY.resultLabel}
            </p>
            {state.speedResultTier && (
              <p
                className="mt-4 text-xs font-medium uppercase tracking-[0.18em]"
                style={{ color: tierColor(state.speedResultTier) }}
              >
                {tierLabel(state.speedResultTier)}
              </p>
            )}
            <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
              <button
                type="button"
                onClick={retrySpeedPunch}
                className="h-12 rounded-full border border-white/20 bg-white/[0.06] text-xs font-medium uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/[0.1]"
              >
                {COPY.tryAgain}
              </button>
              <button
                type="button"
                onClick={onStop}
                className="h-12 rounded-full bg-[#fa4141] text-xs font-medium uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90"
              >
                {COPY.done}
              </button>
            </div>
          </>
        ) : (
          <>
            <p
              className={`max-w-xs text-center text-xs uppercase tracking-[0.18em] ${
                phase === "miss" ? "text-amber-200/70" : "text-white/40"
              }`}
            >
              {instruction}
            </p>
            <p
              className={`font-display mt-5 leading-none tracking-wide transition-colors duration-300 ${centerContent.size}`}
              style={{ color: centerContent.color }}
            >
              {centerContent.label}
            </p>
            {phase === "arming" && (
              <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-white/25">
                Listening for GO…
              </p>
            )}
          </>
        )}
      </main>

      {showControls && (
        <section className="relative z-10 px-6 pb-2">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <div className="flex h-12 w-full items-center justify-center gap-3">
              {showMicBackup && (
                <button
                  type="button"
                  onClick={micBackupPunch}
                  className="h-11 rounded-full border border-amber-500/30 bg-amber-500/10 px-6 text-xs font-medium uppercase tracking-[0.14em] text-amber-200/90"
                >
                  Count hit
                </button>
              )}
              {showTap && (
                <button
                  type="button"
                  onClick={tapPunch}
                  className="h-11 rounded-full border border-white/15 bg-white/[0.06] px-6 text-xs font-medium uppercase tracking-[0.14em] text-white/70"
                >
                  {tapOnly ? "Tap punch" : "Count hit"}
                </button>
              )}
            </div>

            {state.statusMessage && phase === "arming" && (
              <p className="text-center text-[11px] text-white/35">
                {state.statusMessage}
              </p>
            )}
          </div>
        </section>
      )}

      <footer className="relative z-10 flex items-end justify-center px-8 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {showControls && (
          <SessionControlBar showPause={false} onStop={onStop} />
        )}
      </footer>
    </div>
  );
}
