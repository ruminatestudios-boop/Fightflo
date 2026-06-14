"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredUserId } from "@/lib/storage/client";
import type { SessionLibraryEntry } from "@/lib/sessions/library";

export function useSessionLibrary(enabled = true) {
  const [sessions, setSessions] = useState<SessionLibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const userId = getStoredUserId();
    if (!userId) {
      setSessions([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`);
      const json = (await res.json()) as { sessions?: SessionLibraryEntry[]; error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load sessions");
      }

      setSessions(json.sessions ?? []);
    } catch (err) {
      setSessions([]);
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]);

  return { sessions, loading, error, refetch };
}
