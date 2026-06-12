"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SessionControlBar } from "@/components/training/SessionControlBar";
import type { SessionMoveDisplay } from "@/lib/session-move-label";

export type SessionTimerMode = "countdown" | "active" | "rest";

interface SessionTimerUIProps {
  mode: SessionTimerMode;
  /** Seconds remaining (round/rest) or countdown step (3,2,1,0) */
  seconds: number;
  totalSeconds?: number;
  currentRound: number;
  totalRounds: number;
  move?: SessionMoveDisplay | null;
  isPaused?: boolean;
  urgent?: boolean;
  restHint?: string | null;
  /** Work-round phase e.g. Championship minute */
  phaseLabel?: string | null;
  onPause?: () => void;
  onResume?: () => void;
  onStop: () => void;
  onSkipRest?: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function SessionTimerUI({
  mode,
  seconds,
  totalSeconds,
  currentRound,
  totalRounds,
  move,
  isPaused = false,
  urgent = false,
  restHint,
  phaseLabel,
  onPause,
  onResume,
  onStop,
  onSkipRest,
}: SessionTimerUIProps) {
  const progress =
    totalSeconds && totalSeconds > 0
      ? Math.max(0, Math.min(1, seconds / totalSeconds))
      : null;

  const isRest = mode === "rest";
  const isCountdown = mode === "countdown";
  const isGo = isCountdown && seconds === 0;

  const displayTime = isCountdown
    ? isGo
      ? "GO"
      : String(seconds)
    : formatTime(seconds);

  const roundLabel = isRest
    ? `Next · Round ${currentRound} of ${totalRounds}`
    : `Round ${currentRound} of ${totalRounds}`;

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col overflow-hidden transition-colors duration-500 ${
        isRest ? "bg-[#080808]" : "bg-black"
      }`}
    >
      {/* Signal haptic pulse */}
      <AnimatePresence>
        {move && mode === "active" && (
          <motion.div
            key={move.pulseKey}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 bg-[#fa4141]/25"
          />
        )}
      </AnimatePresence>

      {/* Rest state wash */}
      {isRest && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
      )}

      {/* Paused overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20 bg-black/40"
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex w-full max-w-md flex-col items-center"
          >
            {/* Round label */}
            {!isCountdown && (
              <div className="mb-6 text-center">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                  {isRest ? (
                    <span className="text-white/70">Rest</span>
                  ) : (
                    roundLabel
                  )}
                </p>
                {!isRest && phaseLabel && (
                  <p
                    className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] ${
                      urgent ? "text-[#fa4141]" : "text-white/35"
                    }`}
                  >
                    {phaseLabel}
                  </p>
                )}
              </div>
            )}

            {isRest && (
              <p className="font-display mb-8 text-2xl tracking-[0.25em] text-white/50">
                REST
              </p>
            )}

            {/* Hero timer — 40vh */}
            <div
              className="relative flex items-center justify-center"
              style={{ height: "40vh", width: "40vh", maxHeight: 360, maxWidth: 360 }}
            >
              {!isCountdown && progress != null && (
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
                    stroke={urgent ? "#fa4141" : isRest ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.35)"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 94}
                    animate={{
                      strokeDashoffset: 2 * Math.PI * 94 * (1 - progress),
                    }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                </svg>
              )}

              <AnimatePresence mode="wait">
                <motion.p
                  key={displayTime + (isPaused ? "-paused" : "")}
                  initial={{ opacity: 0.5, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.15 }}
                  className={`relative z-10 text-center font-display font-bold leading-none tracking-tight ${
                    isCountdown
                      ? isGo
                        ? "text-[clamp(5rem,22vw,9rem)] text-[#fa4141]"
                        : "text-[clamp(6rem,28vw,10rem)] text-white"
                      : `text-[clamp(3.5rem,16vw,6.5rem)] tabular-nums ${
                          urgent ? "text-[#fa4141]" : "text-white"
                        }`
                  }`}
                >
                  {displayTime}
                </motion.p>
              </AnimatePresence>

              {isPaused && (
                <p className="absolute -bottom-2 text-[10px] uppercase tracking-[0.2em] text-white/50">
                  Paused
                </p>
              )}
            </div>

            {/* Move callout */}
            {!isCountdown && !isRest && (
              <div className="mt-8 min-h-[5.5rem] w-full text-center">
                <AnimatePresence mode="wait">
                  {move ? (
                    <motion.div
                      key={move.pulseKey}
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="font-display text-[clamp(1.75rem,7vw,3rem)] leading-tight tracking-wide text-white">
                        {move.label}
                      </p>
                      {move.sublabel && (
                        <p className="mt-2 text-sm font-medium uppercase tracking-[0.12em] text-white/45">
                          {move.sublabel}
                        </p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.p
                      key="ready"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs uppercase tracking-[0.2em] text-white/25"
                    >
                      Ready
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isRest && restHint && (
              <p className="mt-8 max-w-xs text-center text-sm leading-relaxed text-white/40">
                {restHint}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 w-full px-8">
        <SessionControlBar
          isPaused={isPaused}
          showPause={mode === "active" && !!onPause}
          showSkip={isRest && !!onSkipRest}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          onSkip={onSkipRest}
        />
      </div>
    </div>
  );
}
