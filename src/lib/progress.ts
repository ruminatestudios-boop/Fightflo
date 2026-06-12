import { loadWorkoutHistory, formatDuration } from "./history";
import type { DifficultyMode } from "./types";

export interface ProgressSnapshot {
  streakDays: number;
  weeklySessions: number;
  totalTrainingSeconds: number;
  totalTrainingLabel: string;
  hardestModeSurvived: DifficultyMode | null;
  bestReactionScore: number;
  sessionsThisWeek: number;
  weekGoal: number;
}

function dateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computeProgressSnapshot(): ProgressSnapshot {
  const history = loadWorkoutHistory();
  const weekStart = startOfWeek().getTime();

  const sessionDays = new Set(history.map((r) => dateKey(r.completedAt)));
  const weeklySessions = history.filter((r) => r.completedAt >= weekStart).length;
  const totalTrainingSeconds = history.reduce((s, r) => s + r.durationSeconds, 0);

  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (sessionDays.has(dateKey(d.getTime()))) {
      streakDays += 1;
    } else if (i > 0) {
      break;
    }
  }

  const stadium = history.filter((r) => r.mode === "stadium" && r.survived);
  const hardestModeSurvived: DifficultyMode | null = stadium.length
    ? "stadium"
    : history.some((r) => r.mode === "hard")
      ? "hard"
      : history.length
        ? "easy"
        : null;

  const bestReactionScore =
    history.length > 0 ? Math.max(...history.map((r) => r.reactionScore)) : 0;

  return {
    streakDays,
    weeklySessions,
    totalTrainingSeconds,
    totalTrainingLabel: formatDuration(totalTrainingSeconds),
    hardestModeSurvived,
    bestReactionScore,
    sessionsThisWeek: weeklySessions,
    weekGoal: 4,
  };
}
