"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createJournalEntry,
  getIsoWeekKey,
  getWeeklyJournalEntries,
  setWeeklyJournalEntries,
  type WeeklyJournalEntry,
} from "@/lib/storage/weeklyJournal";

export function useWeeklyJournal() {
  const weekKey = useMemo(() => getIsoWeekKey(), []);
  const [entries, setEntries] = useState<WeeklyJournalEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEntries(getWeeklyJournalEntries(weekKey));
    setReady(true);
  }, [weekKey]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      setWeeklyJournalEntries(entries, weekKey);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [entries, weekKey, ready]);

  const addEntry = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const entry = createJournalEntry(trimmed);
    setEntries((current) => [entry, ...current]);
    return true;
  }, []);

  const updateEntry = useCallback((id: string, text: string) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? { ...entry, text, updatedAt: new Date().toISOString() }
          : entry
      )
    );
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    weekKey,
    ready,
  };
}
