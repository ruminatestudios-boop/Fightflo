"use client";

import { useCallback, useState } from "react";
import { parseJsonResponse } from "@/lib/api/parseResponse";
import { apiPath } from "@/lib/paths";
import type { SportId } from "@/types";

export type ReportEmailStatus =
  | "idle"
  | "submitting"
  | "success"
  | "invalid"
  | "error";

export function useReportEmailCapture(userId: string | null, sport?: SportId) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<ReportEmailStatus>("idle");

  const resetError = useCallback(() => {
    setStatus((s) => (s === "invalid" || s === "error" ? "idle" : s));
  }, []);

  const submit = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("invalid");
      return false;
    }

    setStatus("submitting");

    try {
      const res = await fetch(apiPath("/api/user/email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: trimmed, sport }),
      });

      const data = await parseJsonResponse<{ ok?: boolean; error?: string }>(res);
      if (!res.ok) {
        setStatus("error");
        return false;
      }

      void data;
      setStatus("success");
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  }, [email, sport, userId]);

  return { email, setEmail, status, resetError, submit };
}
