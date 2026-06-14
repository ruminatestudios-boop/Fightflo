"use client";

import { useCallback, useEffect, useState } from "react";
import { parseJsonResponse } from "@/lib/api/parseResponse";
import type { HomeInsights } from "@/lib/insights/types";
import { apiPath } from "@/lib/paths";
import { getStoredUserId } from "@/lib/storage/client";

export function useHomeInsights(enabled = true) {
  const [insights, setInsights] = useState<HomeInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const userId = getStoredUserId();
    if (!userId) {
      setInsights(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        apiPath(`/api/insights?userId=${encodeURIComponent(userId)}`)
      );
      const data = await parseJsonResponse<{ insights?: HomeInsights; error?: string }>(
        res
      );

      if (!res.ok || !data.insights) {
        throw new Error(data.error ?? "Failed to load insights");
      }

      setInsights(data.insights);
    } catch (err) {
      setInsights(null);
      setError(err instanceof Error ? err.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]);

  return { insights, loading, error, refetch };
}
