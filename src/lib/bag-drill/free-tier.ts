const FREE_SESSION_KEY = "flowbag-free-sessions";
const DAILY_LIMIT = 5;

/** Set false to re-enable the daily free combo cap */
export const BYPASS_FREE_TIER = true;

export interface FreeSessionUsage {
  count: number;
  date: string;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readUsage(): FreeSessionUsage {
  if (typeof window === "undefined") {
    return { count: 0, date: todayKey() };
  }
  try {
    const raw = localStorage.getItem(FREE_SESSION_KEY);
    if (!raw) return { count: 0, date: todayKey() };
    const parsed = JSON.parse(raw) as FreeSessionUsage;
    if (!parsed.date || typeof parsed.count !== "number") {
      return { count: 0, date: todayKey() };
    }
    if (parsed.date !== todayKey()) {
      return { count: 0, date: todayKey() };
    }
    return parsed;
  } catch {
    return { count: 0, date: todayKey() };
  }
}

function writeUsage(usage: FreeSessionUsage): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FREE_SESSION_KEY, JSON.stringify(usage));
}

/** Reset count when the calendar day changes. */
export function resetFreeSessionsIfNewDay(): FreeSessionUsage {
  const usage = readUsage();
  writeUsage(usage);
  return usage;
}

export function getFreeSessionsUsedToday(): number {
  return resetFreeSessionsIfNewDay().count;
}

export function getFreeSessionsRemaining(): number {
  return Math.max(0, DAILY_LIMIT - getFreeSessionsUsedToday());
}

export function hasFreeSessionsLeft(): boolean {
  if (BYPASS_FREE_TIER) return true;
  return getFreeSessionsUsedToday() < DAILY_LIMIT;
}

/** Call when a combo session actually starts (not flurry). */
export function consumeFreeComboSession(): FreeSessionUsage {
  const usage = resetFreeSessionsIfNewDay();
  const next = { count: usage.count + 1, date: todayKey() };
  writeUsage(next);
  return next;
}

export const FREE_COMBO_SESSIONS_PER_DAY = DAILY_LIMIT;
