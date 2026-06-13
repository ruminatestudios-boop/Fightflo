import type { BagSessionRecord, FightFloBagData, FlurryDuration } from "./types";
import { EMPTY_BAG_DATA } from "./types";
import { mergeWeaknessData, topWeaknesses } from "./weakness";
import { isPro } from "@/lib/subscription";

const STORAGE_KEY = "fightflo_data";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

function flurryBestKey(seconds: FlurryDuration): keyof FightFloBagData["allTimeStats"] {
  if (seconds <= 15) return "bestFlurry15";
  if (seconds <= 30) return "bestFlurry30";
  return "bestFlurry60";
}

export function loadBagData(): FightFloBagData {
  if (typeof window === "undefined") return { ...EMPTY_BAG_DATA };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_BAG_DATA };
    const parsed = JSON.parse(raw) as FightFloBagData;
    return {
      sessions: parsed.sessions ?? [],
      allTimeStats: { ...EMPTY_BAG_DATA.allTimeStats, ...parsed.allTimeStats },
      weaknesses: parsed.weaknesses ?? {},
      userMeta: { ...EMPTY_BAG_DATA.userMeta!, ...parsed.userMeta },
    };
  } catch {
    return { ...EMPTY_BAG_DATA };
  }
}

export function saveBagData(data: FightFloBagData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function updateTrainingHabits(
  data: FightFloBagData,
  startedAt: string
): FightFloBagData["userMeta"] {
  const meta = { ...EMPTY_BAG_DATA.userMeta!, ...data.userMeta };
  const at = new Date(startedAt);
  const hour = at.getHours();
  const dow = at.getDay();

  if (meta.usualTrainingHour == null) {
    meta.usualTrainingHour = hour;
    meta.usualTrainingDow = dow;
  } else {
    meta.usualTrainingHour = Math.round(meta.usualTrainingHour * 0.7 + hour * 0.3);
    meta.usualTrainingDow = dow;
  }
  meta.lastTrainingAt = startedAt;
  return meta;
}

function applyStreak(
  data: FightFloBagData,
  today: string
): { currentStreak: number; usedFreeze: boolean } {
  const prevDate = data.sessions[data.sessions.length - 1]?.date;
  let currentStreak = data.allTimeStats.currentStreak;
  let usedFreeze = false;
  const meta = { ...EMPTY_BAG_DATA.userMeta!, ...data.userMeta };

  if (!prevDate) {
    currentStreak = 1;
  } else if (prevDate === today) {
    // same calendar day
  } else {
    const gap = daysBetween(prevDate, today);
    if (gap === 1) {
      currentStreak += 1;
    } else if (gap > 1 && meta.streakFreezes > 0 && isPro()) {
      meta.streakFreezes -= 1;
      currentStreak += 1;
      usedFreeze = true;
    } else {
      currentStreak = 1;
    }
  }

  return { currentStreak, usedFreeze };
}

export function saveSession(session: BagSessionRecord): FightFloBagData {
  const data = loadBagData();
  const today = todayKey();
  const startedAt = session.startedAt ?? new Date().toISOString();
  const { currentStreak } = applyStreak(data, today);

  const weaknesses =
    session.sessionType === "flurry"
      ? data.weaknesses
      : mergeWeaknessData(data.weaknesses, session.comboReactions);

  const allTimeStats = { ...data.allTimeStats };
  allTimeStats.totalSessions += 1;
  allTimeStats.totalPunches += session.totalPunches;
  allTimeStats.longestStreak = Math.max(allTimeStats.longestStreak, currentStreak);
  allTimeStats.currentStreak = currentStreak;
  allTimeStats.longestSession = Math.max(allTimeStats.longestSession, session.duration);

  if (session.fastestReaction > 0) {
    allTimeStats.fastestReaction =
      allTimeStats.fastestReaction == null
        ? session.fastestReaction
        : Math.min(allTimeStats.fastestReaction, session.fastestReaction);
  }

  if (session.sessionType === "flurry" && session.flurrySeconds) {
    const key = flurryBestKey(session.flurrySeconds as FlurryDuration);
    const prev = allTimeStats[key] ?? 0;
    if (session.totalPunches > prev) {
      allTimeStats[key] = session.totalPunches;
      session.flurryPersonalBest = true;
    }
  }

  const userMeta = updateTrainingHabits(data, startedAt);

  const next: FightFloBagData = {
    sessions: [...data.sessions, session],
    allTimeStats: { ...allTimeStats, currentStreak },
    weaknesses,
    userMeta,
  };
  saveBagData(next);
  return next;
}

export function grantStreakFreeze(count = 1): FightFloBagData {
  const data = loadBagData();
  const userMeta = { ...EMPTY_BAG_DATA.userMeta!, ...data.userMeta };
  userMeta.streakFreezes = (userMeta.streakFreezes ?? 0) + count;
  const next = { ...data, userMeta };
  saveBagData(next);
  return next;
}

export function getLastSession(data: FightFloBagData): BagSessionRecord | null {
  return data.sessions[data.sessions.length - 1] ?? null;
}

/** Enough data for last-session stats to be useful — not a partial or test round. */
export function hasMeaningfulSessionHistory(data: FightFloBagData): boolean {
  if (data.sessions.length >= 2) return true;
  const last = getLastSession(data);
  if (!last) return false;
  if (last.sessionType === "flurry") {
    return last.totalPunches >= 12;
  }
  return last.totalPunches >= 8 && last.duration >= 45;
}

export function getSessionsLast7Days(data: FightFloBagData): BagSessionRecord[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return data.sessions.filter((s) => new Date(s.date) >= cutoff);
}

export function getSessionsLast30Days(data: FightFloBagData): BagSessionRecord[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return data.sessions.filter((s) => new Date(s.date) >= cutoff);
}

export function getBestFlurryForDuration(
  data: FightFloBagData,
  seconds: number
): number | null {
  const key = flurryBestKey(seconds as FlurryDuration);
  return data.allTimeStats[key] ?? null;
}

export function weeklyImprovementPercent(data: FightFloBagData): number | null {
  if (data.sessions.length < 2) return null;

  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 14);

  const thisWeek = data.sessions.filter((s) => {
    const d = new Date(s.date);
    return d >= thisWeekStart && d <= now && s.sessionType !== "flurry";
  });
  const lastWeek = data.sessions.filter((s) => {
    const d = new Date(s.date);
    return d >= lastWeekStart && d < thisWeekStart && s.sessionType !== "flurry";
  });

  if (thisWeek.length === 0 || lastWeek.length === 0) return null;

  const avg = (sessions: BagSessionRecord[]) =>
    sessions.reduce((s, x) => s + x.avgReactionTime, 0) / sessions.length;

  const thisAvg = avg(thisWeek);
  const lastAvg = avg(lastWeek);
  if (lastAvg === 0) return null;

  return Math.round(((lastAvg - thisAvg) / lastAvg) * 100);
}

export function topWeaknessMessage(data: FightFloBagData, count = 3): string | null {
  const tops = topWeaknesses(data.weaknesses, count);
  if (tops.length === 0) return null;
  return `You are slowest on: ${tops.join(", ")}`;
}

export function compareToLastSession(
  current: BagSessionRecord,
  data: FightFloBagData
): { avgDelta: number; punchesDelta: number } | null {
  const prev = data.sessions[data.sessions.length - 2];
  if (!prev) return null;
  return {
    avgDelta: prev.avgReactionTime - current.avgReactionTime,
    punchesDelta: current.totalPunches - prev.totalPunches,
  };
}

export function getTrainingNudge(data: FightFloBagData): string | null {
  const meta = data.userMeta;
  if (!meta?.usualTrainingHour || meta.usualTrainingDow == null) return null;

  const now = new Date();
  const today = now.getDay();
  const hour = now.getHours();
  const last = meta.lastTrainingAt ? new Date(meta.lastTrainingAt) : null;
  const trainedToday =
    last && last.toISOString().slice(0, 10) === todayKey();

  if (trainedToday) return null;
  if (today === meta.usualTrainingDow && hour >= meta.usualTrainingHour - 1) {
    const h = meta.usualTrainingHour;
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h % 12 || 12;
    return `You usually train around ${h12}${ampm} on ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][meta.usualTrainingDow]}s`;
  }
  return null;
}
