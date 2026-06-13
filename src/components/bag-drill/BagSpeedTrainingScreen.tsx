"use client";

import { useEffect } from "react";
import { SessionControlBar } from "@/components/training/SessionControlBar";
import type { UseBagDrillResult } from "@/hooks/useBagDrill";
import { formatStrikeSpeed } from "@/lib/bag-drill/strike-speed";
import { CAMERA_MODE_COPY } from "@/components/bag-drill/bag-ui";
import type { BagTrainingConfig } from "@/lib/bag-drill/types";

interface BagSpeedTrainingScreenProps {
  config: BagTrainingConfig;
  drill: UseBagDrillResult;
  mediaStream?: MediaStream | null;
  onStop: () => void;
}

export function BagSpeedTrainingScreen({
  config,
  drill,
  mediaStream,
  onStop,
}: BagSpeedTrainingScreenProps) {
  const { state, videoRef, start, tapPunch, micBackupPunch } = drill;
  const aiMode =
    state.detectionMode === "pose-triple" &&
    state.liveConnected &&
    config.cameraMode === "fighter";
  const tapOnly =
    state.detectionMode === "visual-tap" || state.detectionMode === "timer-fallback";
  const showTap = state.inComboWindow && !aiMode;
  const showMicBackup = aiMode && state.inComboWindow && state.micBackupHint;

  const hasSpeed =
    state.lastStrikeSpeedSeconds != null && state.lastStrikeSpeedLabel != null;
  const modeCopy = CAMERA_MODE_COPY[config.cameraMode];

  useEffect(() => {
    void start(config, { mediaStream });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const centerLabel = state.inComboWindow
    ? state.hitsInCombo > 0 && hasSpeed
      ? formatStrikeSpeed(state.lastStrikeSpeedSeconds!)
      : "GO"
    : state.currentCombo
      ? state.currentCombo.label
      : hasSpeed
        ? formatStrikeSpeed(state.lastStrikeSpeedSeconds!)
        : "Listen";

  const centerColor = state.inComboWindow
    ? state.hitsInCombo > 0 && hasSpeed
      ? "#4ade80"
      : "#fa4141"
    : hasSpeed && !state.currentCombo
      ? "#4ade80"
      : "#ffffff";

  const subLabel = state.inComboWindow
    ? state.hitsInCombo > 0 && hasSpeed
      ? state.lastStrikeSpeedLabel!
      : state.currentCombo?.label ?? ""
    : state.currentCombo
      ? "Throw when you hear go"
      : hasSpeed
        ? state.lastStrikeSpeedLabel!
        : modeCopy.summary;

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
        <div className="mx-auto mt-2 flex items-center justify-center gap-6 text-xs uppercase tracking-[0.12em] text-white/40">
          <span>
            Punches{" "}
            <span className="text-white/80 tabular-nums">{state.punchCount}</span>
          </span>
          <span>
            Mode{" "}
            <span className="text-white/80">{modeCopy.toggleLabel}</span>
          </span>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-6">
        <p
          className="text-xs uppercase tracking-[0.22em] text-white/30 transition-opacity"
          style={{ opacity: subLabel ? 1 : 0 }}
        >
          {subLabel || "\u00a0"}
        </p>
        <p
          className="font-display mt-3 text-[clamp(3.5rem,18vw,6rem)] leading-none tracking-wide transition-colors duration-200"
          style={{ color: centerColor }}
        >
          {centerLabel}
        </p>
        {!state.inComboWindow && state.currentCombo && (
          <p className="mt-4 text-sm text-white/45">Throw when you hear go</p>
        )}
      </main>

      <section className="relative z-10 px-6 pb-2">
        <div className="mx-auto flex max-w-md flex-col items-center">
          {state.statusMessage && !state.inComboWindow && (
            <p className="mb-3 text-center text-[11px] text-white/35">
              {state.statusMessage}
            </p>
          )}

          <div className="flex h-14 w-full items-center justify-center gap-3">
            {showMicBackup && (
              <button
                type="button"
                onClick={micBackupPunch}
                className="h-12 rounded-full border border-amber-500/30 bg-amber-500/10 px-6 text-xs font-medium uppercase tracking-[0.14em] text-amber-200/90"
              >
                Count hit
              </button>
            )}
            {showTap && (
              <button
                type="button"
                onClick={tapPunch}
                className="h-12 rounded-full border border-white/15 bg-white/[0.06] px-6 text-xs font-medium uppercase tracking-[0.14em] text-white/70"
              >
                {tapOnly ? "Tap punch" : "Count hit"}
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className="relative z-10 flex items-end justify-center px-8 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <SessionControlBar showPause={false} onStop={onStop} />
      </footer>
    </div>
  );
}
