import type { FightFloBagData } from "./types";

export interface CalendarCell {
  date: string | null;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  isActive: boolean;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getDayLabels(): readonly string[] {
  return DAY_LABELS;
}

export function sessionDatesSet(data: FightFloBagData): Set<string> {
  return new Set(data.sessions.map((s) => s.date.slice(0, 10)));
}

export function sessionsInMonth(
  data: FightFloBagData,
  year: number,
  month: number
): number {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return data.sessions.filter((s) => s.date.startsWith(prefix)).length;
}

export function activeDaysInMonth(
  dates: Set<string>,
  year: number,
  month: number
): number {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  let count = 0;
  for (const d of dates) {
    if (d.startsWith(prefix)) count += 1;
  }
  return count;
}

/** Monday-based week rows for a month grid */
export function buildMonthGrid(
  year: number,
  month: number,
  activeDates: Set<string>,
  today = new Date()
): CalendarCell[][] {
  const todayKey = localDateKey(today);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();

  // Monday = 0 … Sunday = 6
  const mondayIndex = (first.getDay() + 6) % 7;

  const cells: CalendarCell[] = [];

  for (let i = 0; i < mondayIndex; i++) {
    const d = new Date(year, month, -mondayIndex + i + 1);
    const key = localDateKey(d);
    cells.push({
      date: key,
      day: d.getDate(),
      inMonth: false,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      isActive: activeDates.has(key),
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = localDateKey(d);
    cells.push({
      date: key,
      day,
      inMonth: true,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      isActive: activeDates.has(key),
    });
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - mondayIndex - daysInMonth + 1;
    const d = new Date(year, month + 1, nextDay);
    const key = localDateKey(d);
    cells.push({
      date: key,
      day: d.getDate(),
      inMonth: false,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      isActive: activeDates.has(key),
    });
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** Week row has at least one bag session */
export function weekRowActive(week: CalendarCell[]): boolean {
  return week.some((c) => c.isActive);
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Consecutive weeks (Mon–Sun) with at least one session, counting back from this week */
export function computeWeekStreak(activeDates: Set<string>, today = new Date()): number {
  const weekStart = startOfWeekMonday(today);
  let streak = 0;

  for (let w = 0; w < 52; w++) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() - w * 7);
    let hit = false;
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(day.getDate() + d);
      if (activeDates.has(localDateKey(day))) {
        hit = true;
        break;
      }
    }
    if (hit) {
      streak += 1;
    } else if (w > 0) {
      break;
    } else {
      break;
    }
  }

  return streak;
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
