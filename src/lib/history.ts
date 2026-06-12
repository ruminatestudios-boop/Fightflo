import type { SessionStats } from "./types";
import { isPro } from "./subscription";

const HISTORY_KEY = "fightflo-history";
const MAX_RECORDS_PRO = 100;
const MAX_RECORDS_FREE = 15;

export interface WorkoutRecord extends SessionStats {
  id: string;
  completedAt: number;
  durationSeconds: number;
}

export interface PersonalBests {
  bestScore: number;
  bestStadiumScore: number;
  totalWorkouts: number;
  totalSignals: number;
}

export function loadWorkoutHistory(): WorkoutRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorkoutRecord[];
  } catch {
    return [];
  }
}

export function getPersonalBests(history = loadWorkoutHistory()): PersonalBests {
  if (history.length === 0) {
    return { bestScore: 0, bestStadiumScore: 0, totalWorkouts: 0, totalSignals: 0 };
  }

  const stadium = history.filter((r) => r.mode === "stadium");

  return {
    bestScore: Math.max(...history.map((r) => r.reactionScore)),
    bestStadiumScore:
      stadium.length > 0 ? Math.max(...stadium.map((r) => r.reactionScore)) : 0,
    totalWorkouts: history.length,
    totalSignals: history.reduce((s, r) => s + r.totalSignals, 0),
  };
}

export function saveWorkoutRecord(
  stats: SessionStats,
  durationSeconds: number
): { record: WorkoutRecord; isPersonalBest: boolean } {
  const history = loadWorkoutHistory();
  const previousBest =
    history.length > 0 ? Math.max(...history.map((r) => r.reactionScore)) : 0;

  const record: WorkoutRecord = {
    ...stats,
    id: crypto.randomUUID(),
    completedAt: Date.now(),
    durationSeconds,
  };

  const maxRecords = isPro() ? MAX_RECORDS_PRO : MAX_RECORDS_FREE;
  const updated = [record, ...history].slice(0, maxRecords);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {
      /* quota */
    }
  }

  return {
    record,
    isPersonalBest: record.reactionScore > previousBest,
  };
}

export function clearWorkoutHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

export function formatWorkoutDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(timestamp).setHours(0, 0, 0, 0)) /
      86400000
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
