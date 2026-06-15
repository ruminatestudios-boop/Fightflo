const JOURNAL_KEY_PREFIX = "feedback_weekly_journal_";

export interface WeeklyJournalEntry {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

/** ISO week key, e.g. `2026-W24` */
export function getIsoWeekKey(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function formatWeekLabel(weekKey: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return weekKey;
  return `Week ${Number(match[2])}, ${match[1]}`;
}

export function formatJournalTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseStoredEntries(raw: string | null): WeeklyJournalEntry[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry): entry is WeeklyJournalEntry =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as WeeklyJournalEntry).id === "string" &&
          typeof (entry as WeeklyJournalEntry).text === "string"
      )
      .map((entry) => ({
        id: entry.id,
        text: entry.text,
        createdAt: entry.createdAt ?? new Date().toISOString(),
        updatedAt: entry.updatedAt ?? entry.createdAt ?? new Date().toISOString(),
      }));
  } catch {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    const now = new Date().toISOString();
    return [
      {
        id: `legacy-${now}`,
        text: trimmed,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}

export function getWeeklyJournalEntries(weekKey = getIsoWeekKey()): WeeklyJournalEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`${JOURNAL_KEY_PREFIX}${weekKey}`);
  return parseStoredEntries(raw).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function setWeeklyJournalEntries(
  entries: WeeklyJournalEntry[],
  weekKey = getIsoWeekKey()
): void {
  if (typeof window === "undefined") return;

  const storageKey = `${JOURNAL_KEY_PREFIX}${weekKey}`;
  const cleaned = entries
    .map((entry) => ({
      ...entry,
      text: entry.text.trim(),
    }))
    .filter((entry) => entry.text.length > 0);

  if (cleaned.length === 0) {
    localStorage.removeItem(storageKey);
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(cleaned));
}

export function createJournalEntry(text: string): WeeklyJournalEntry {
  const now = new Date().toISOString();
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `note-${now}`,
    text: text.trim(),
    createdAt: now,
    updatedAt: now,
  };
}
