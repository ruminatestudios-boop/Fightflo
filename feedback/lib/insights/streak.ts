export interface StreakWeekDay {
  date: string;
  label: string;
  active: boolean;
  isToday: boolean;
}

export interface StreakInsight {
  currentStreak: number;
  trainedToday: boolean;
  week: StreakWeekDay[];
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Real streak math off actual activity dates (sessions + live-only
 * completions) — no decorative/fake counters. A day counts if the user
 * had at least one session or live_session_stats row on it (UTC date).
 * If "today" has no activity yet, the streak still shows what's been
 * built through yesterday rather than prematurely showing 0 mid-day.
 */
export function computeStreak(
  activeDateKeys: string[],
  now: Date = new Date()
): StreakInsight {
  const activeSet = new Set(activeDateKeys);

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayKey = toDateKey(today);
  const trainedToday = activeSet.has(todayKey);

  let streak = 0;
  const cursor = new Date(today);
  if (!trainedToday) cursor.setUTCDate(cursor.getUTCDate() - 1);

  while (activeSet.has(toDateKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const dayOfWeek = today.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + mondayOffset);

  const week: StreakWeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const key = toDateKey(d);
    week.push({
      date: key,
      label: WEEKDAY_LABELS[i],
      active: activeSet.has(key),
      isToday: key === todayKey,
    });
  }

  return { currentStreak: streak, trainedToday, week };
}
