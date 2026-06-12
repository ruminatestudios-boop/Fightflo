import type { BagDifficulty, BagTimingConfig } from "./types";
import { DIFFICULTY_REST_MS } from "./combos";

export const TIMING_SLIDER = {
  durationSec: { min: 180, max: 1800, step: 60 },
  restSec: { min: 0, max: 15, step: 1 },
  comboWindowPct: { min: 50, max: 200, step: 5 },
} as const;

export function formatSessionDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m} min`;
  return formatDurationInput(seconds);
}

export function formatRestSeconds(seconds: number): string {
  if (seconds <= 0) return "None";
  return `${seconds}s`;
}

export function formatComboWindowScale(scale: number): string {
  const pct = Math.round(scale * 100);
  if (pct < 85) return `${pct}% · Fast`;
  if (pct <= 115) return `${pct}% · Normal`;
  if (pct <= 150) return `${pct}% · Relaxed`;
  return `${pct}% · Slow`;
}

export function defaultTiming(difficulty: BagDifficulty): BagTimingConfig {
  return {
    durationSeconds: 600,
    restBetweenCombosMs: DIFFICULTY_REST_MS[difficulty],
    comboWindowScale: 1,
  };
}

export function formatDurationInput(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":");
    const min = parseInt(m, 10);
    const sec = parseInt(s, 10);
    if (Number.isNaN(min) || Number.isNaN(sec) || sec >= 60 || min < 0) return null;
    return min * 60 + sec;
  }

  const min = parseInt(trimmed, 10);
  if (Number.isNaN(min) || min < 1 || min > 120) return null;
  return min * 60;
}

export function estimateComboWindowSec(
  hits: number,
  difficulty: BagDifficulty,
  scale: number
): string {
  const base =
    difficulty === "champion" ? 0.5 : difficulty === "fighter" ? 0.65 : 0.85;
  const perHit =
    difficulty === "champion" ? 0.32 : difficulty === "fighter" ? 0.4 : 0.5;
  const sec = (base + hits * perHit) * scale;
  return sec.toFixed(1);
}
