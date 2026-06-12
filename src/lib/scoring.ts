import type { DifficultyMode, RoundStats, SessionStats } from "./types";

export function computeReactionScore(
  roundStats: RoundStats[],
  mode: DifficultyMode
): number {
  const totalSignals = roundStats.reduce((s, r) => s + r.signalsFired, 0);
  const totalBursts = roundStats.reduce((s, r) => s + r.bursts, 0);
  const totalChaos = roundStats.reduce((s, r) => s + r.chaosMoments, 0);

  const base = Math.min(95, 55 + totalSignals * 0.8 + totalBursts * 2);
  const chaosBonus = totalChaos * 3;
  const modeMultiplier =
    mode === "stadium" ? 1.05 : mode === "hard" ? 1.0 : 0.92;

  return Math.min(99, Math.round((base + chaosBonus) * modeMultiplier));
}

export function computePressureRating(
  mode: DifficultyMode,
  totalSignals: number,
  rounds: number
): SessionStats["pressureRating"] {
  const density = totalSignals / Math.max(rounds, 1);

  if (mode === "stadium" || density > 45) return "EXTREME";
  if (mode === "hard" || density > 30) return "HIGH";
  if (density > 18) return "MEDIUM";
  return "LOW";
}

export function buildSummaryMessage(
  mode: DifficultyMode,
  challengeName: string | null,
  survived: boolean,
  trainingCategory?: SessionStats["trainingCategory"]
): string {
  if (trainingCategory === "breathwork") return "RECOVERY COMPLETE";
  if (trainingCategory === "hiit") return survived ? "YOU SURVIVED HIIT" : "HIIT BROKE YOU";
  if (trainingCategory === "sprint") return survived ? "SPRINT FINISHED" : "SPRINT CRUSHED YOU";
  if (trainingCategory === "conditioning") return survived ? "CONDITIONING DONE" : "GRIND COMPLETE";
  if (challengeName) {
    return survived
      ? `SURVIVED ${challengeName}`
      : `BROKEN BY ${challengeName}`;
  }
  if (mode === "stadium") return survived ? "SURVIVED STADIUM MODE" : "STADIUM BROKE YOU";
  if (mode === "hard") return "HARD ROUND COMPLETE";
  return "SESSION COMPLETE";
}
