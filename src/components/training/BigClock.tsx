"use client";

import { motion, AnimatePresence } from "framer-motion";

export type BigClockVariant = "session" | "short" | "countdown";

interface BigClockProps {
  /** Elapsed or remaining whole seconds */
  seconds: number;
  totalSeconds?: number;
  variant?: BigClockVariant;
  /** Highlights progress + digits (combo window, flurry go) */
  active?: boolean;
  urgent?: boolean;
  running?: boolean;
  label?: string;
  /** countdown variant: show GO */
  isGo?: boolean;
  segmentCount?: number;
  className?: string;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatSessionTime(totalSec: number): { minutes: string; seconds: string } {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return {
    minutes: String(m),
    seconds: pad2(s),
  };
}

const ACCENT = "#fa4141";
const ACCENT_MUTED = "rgba(250, 65, 65, 0.55)";
const ACCENT_DIM = "rgba(250, 65, 65, 0.45)";

function clockColor(): string {
  return ACCENT;
}

const PROGRESS_DASH_COUNT = 48;

/** Horizontal dashed progress — small vertical ticks that fill left to right. */
function ProgressBar({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(1, progress));
  const filledCount = Math.round(p * PROGRESS_DASH_COUNT);

  return (
    <div
      className="flex h-2.5 w-full max-w-md items-center gap-[2px] px-1"
      aria-hidden
    >
      {Array.from({ length: PROGRESS_DASH_COUNT }, (_, i) => (
        <div
          key={i}
          className={`h-full min-w-0 flex-1 rounded-[1px] transition-colors duration-300 ${
            i < filledCount ? "bg-[#fa4141]" : "bg-white/14"
          }`}
        />
      ))}
    </div>
  );
}

export function BigClock({
  seconds,
  totalSeconds,
  variant = "session",
  active = false,
  urgent = false,
  label,
  isGo = false,
  className = "",
}: BigClockProps) {
  const progress =
    totalSeconds && totalSeconds > 0
      ? Math.max(0, Math.min(1, seconds / totalSeconds))
      : 0;

  const color = clockColor();
  const showProgressBar =
    totalSeconds != null && totalSeconds > 0 && variant !== "countdown";

  return (
    <div className={`flex w-full max-w-lg flex-col items-center gap-5 ${className}`}>
      {showProgressBar && <ProgressBar progress={progress} />}

      <div className="w-full text-center">
          <AnimatePresence mode="wait">
            {variant === "countdown" ? (
              <motion.p
                key={isGo ? "go" : `cd-${seconds}`}
                initial={{ opacity: 0.7, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.12 }}
                className="font-display font-bold text-[clamp(6.5rem,32vw,11.5rem)] leading-[0.9] tracking-wide"
                style={{ color: isGo ? ACCENT : color }}
              >
                {isGo ? "GO" : seconds}
              </motion.p>
            ) : variant === "short" ? (
              <motion.div
                key={seconds}
                initial={{ opacity: 0.85 }}
                animate={{ opacity: 1 }}
                className="inline-flex items-baseline justify-center gap-1"
              >
                <span
                  className="font-display font-bold text-[clamp(6.5rem,36vw,12.5rem)] leading-[0.85] tracking-wide tabular-nums"
                  style={{ color }}
                >
                  {seconds}
                </span>
                <span
                  className="font-display text-[clamp(2.5rem,11vw,4.25rem)] leading-none tracking-widest"
                  style={{ color: ACCENT_DIM }}
                >
                  S
                </span>
              </motion.div>
            ) : (
              <motion.div
                key={seconds}
                initial={{ opacity: 0.92 }}
                animate={{ opacity: 1 }}
                className="inline-flex items-baseline justify-center gap-1 sm:gap-2"
              >
                {(() => {
                  const { minutes, seconds: secs } = formatSessionTime(seconds);
                  return (
                    <>
                      <span
                        className="font-display font-bold text-[clamp(5.75rem,32vw,11.5rem)] leading-[0.85] tracking-wide tabular-nums"
                        style={{ color }}
                      >
                        {minutes}
                      </span>
                      <span
                        className="font-display pb-[0.08em] text-[clamp(3.75rem,18vw,7rem)] leading-none tracking-wide"
                        style={{ color: ACCENT_MUTED }}
                      >
                        :
                      </span>
                      <span
                        className="font-display font-bold text-[clamp(5.75rem,32vw,11.5rem)] leading-[0.85] tracking-wide tabular-nums"
                        style={{ color }}
                      >
                        {secs}
                      </span>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {label && variant !== "countdown" && (
            <p
              className="font-display mt-3 text-sm tracking-[0.22em] sm:mt-4"
              style={{ color: ACCENT_DIM }}
            >
              {label}
            </p>
          )}
        </div>
    </div>
  );
}
