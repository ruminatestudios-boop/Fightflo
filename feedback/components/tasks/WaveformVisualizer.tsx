"use client";

import { useEffect, useState } from "react";

const BAR_COUNT = 32;
const RESTING_HEIGHTS = Array(BAR_COUNT).fill(6);

export function WaveformVisualizer({ active }: { active: boolean }) {
  const [animatedHeights, setAnimatedHeights] = useState<number[]>(RESTING_HEIGHTS);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setAnimatedHeights(Array.from({ length: BAR_COUNT }, () => 4 + Math.random() * 36));
    }, 120);
    return () => clearInterval(interval);
  }, [active]);

  const heights = active ? animatedHeights : RESTING_HEIGHTS;

  return (
    <div className="relative w-full h-12 flex items-center justify-center gap-[3px]">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-white/70 transition-all duration-100"
          style={{ height: `${h}px` }}
        />
      ))}
      {active && (
        <div className="absolute inset-y-0 left-0 w-[2px] bg-[var(--accent-red)] animate-[tasks-sweep_2.5s_linear_infinite]" />
      )}
    </div>
  );
}
