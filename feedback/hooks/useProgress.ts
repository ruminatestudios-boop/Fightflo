"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProgressDataPoint } from "@/types";

export function useProgress(userId: string | null, weaknessType?: string) {
  const [data, setData] = useState<ProgressDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/sessions?userId=${userId}`);
      const json = await res.json();
      const sessions = json.sessions ?? [];

      const points: ProgressDataPoint[] = sessions
        .slice()
        .reverse()
        .map(
          (s: { session_number: number; created_at: string }, i: number) => ({
            session: s.session_number,
            count: Math.max(1, 12 - i * 2),
            date: new Date(s.created_at).toLocaleDateString(),
          })
        );

      setData(points);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress, weaknessType]);

  return { data, loading, refetch: fetchProgress };
}
