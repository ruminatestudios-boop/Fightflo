"use client";

import { motion } from "framer-motion";
import type { TimerIntensity } from "@/lib/types";

interface CinematicTimerProps {
  seconds: number;
  totalSeconds?: number;
  label?: string;
  urgent?: boolean;
  intensity?: TimerIntensity;
  variant?: "hero" | "compact";
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const RING_COLOR: Record<TimerIntensity, string> = {
  calm: "rgba(74, 222, 128, 0.35)",
  standard: "rgba(255, 255, 255, 0.2)",
  aggressive: "rgba(250, 65, 65, 0.5)",
  burnout: "rgba(255, 59, 59, 0.6)",
};

export function CinematicTimer({
  seconds,
  totalSeconds,
  label,
  urgent = false,
  intensity = "standard",
  variant = "hero",
}: CinematicTimerProps) {
  const progress =
    totalSeconds && totalSeconds > 0
      ? Math.max(0, Math.min(1, seconds / totalSeconds))
      : null;

  const r = variant === "hero" ? 140 : 110;
  const circumference = 2 * Math.PI * r;
  const dashOffset = progress != null ? circumference * (1 - progress) : 0;
  const ringColor = urgent ? "#fa4141" : RING_COLOR[intensity];

  const timeClass =
    variant === "hero"
      ? "text-[5.5rem] leading-none sm:text-[7rem]"
      : "text-[4.5rem] leading-none sm:text-[5.5rem]";

  return (
    <div className="flex w-full flex-col items-center">
      {label && <p className="label mb-4 text-[#404040]">{label}</p>}

      <div
        className={`relative flex items-center justify-center ${
          variant === "hero" ? "h-[min(72vw,320px)] w-[min(72vw,320px)]" : "h-56 w-56"
        }`}
      >
        {progress != null && (
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 320 320"
            aria-hidden
          >
            <circle
              cx="160"
              cy="160"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="2"
            />
            <motion.circle
              cx="160"
              cy="160"
              r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </svg>
        )}

        <motion.p
          key={seconds}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
          className={`relative z-10 font-display font-bold tabular-nums tracking-tight ${timeClass} ${
            urgent && seconds <= 10 ? "text-[#fa4141]" : "text-white"
          }`}
        >
          {formatTime(seconds)}
        </motion.p>
      </div>
    </div>
  );
}
