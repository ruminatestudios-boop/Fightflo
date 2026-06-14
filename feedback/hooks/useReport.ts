"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LOADING_MESSAGES } from "@/config/prompts";
import { apiPath } from "@/lib/paths";
import type { Report, Session } from "@/types";

interface ReportState {
  report: Report | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  progressMessage: string;
  progressPercent: number;
}

export function useReport(sessionId: string | null) {
  const [state, setState] = useState<ReportState>({
    report: null,
    session: null,
    loading: !!sessionId,
    error: null,
    progressMessage: "Uploading your video...",
    progressPercent: 10,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchReport = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(apiPath(`/api/report?sessionId=${sessionId}`));
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Failed to load report");

      const session = data.session as Session;
      const step = (session as { progress_step?: string }).progress_step;
      const msg =
        (session as { progress_message?: string }).progress_message ??
        "Processing...";

      const loadingMsg = LOADING_MESSAGES.find((m) => m.step === step);
      const progressPercent = loadingMsg?.percent ?? 50;

      if (data.report && session.status === "complete") {
        setState({
          report: data.report,
          session,
          loading: false,
          error: null,
          progressMessage: "Your report is ready.",
          progressPercent: 100,
        });
        return true;
      }

      if (session.status === "failed") {
        setState((s) => ({
          ...s,
          loading: false,
          error: msg,
        }));
        return true;
      }

      setState((s) => ({
        ...s,
        session,
        progressMessage: msg,
        progressPercent,
      }));

      return false;
    } catch (error) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load report",
      }));
      return true;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      const done = await fetchReport();
      if (done && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId, fetchReport]);

  return state;
}
