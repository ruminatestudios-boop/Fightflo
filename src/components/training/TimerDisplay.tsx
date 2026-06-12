"use client";

import { motion } from "framer-motion";

interface TimerDisplayProps {
  seconds: number;
  label?: string;
  urgent?: boolean;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function TimerDisplay({ seconds, label, urgent = false }: TimerDisplayProps) {
  return (
    <div className="text-center">
      {label && <p className="label mb-3">{label}</p>}
      <motion.p
        key={seconds}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`font-display text-6xl tabular-nums sm:text-7xl ${
          urgent && seconds <= 10 ? "text-[#fa4141]" : "text-white"
        }`}
      >
        {formatTime(seconds)}
      </motion.p>
    </div>
  );
}
