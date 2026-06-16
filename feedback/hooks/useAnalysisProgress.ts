"use client";

import { useEffect, useRef, useState } from "react";
import {
  ANALYSIS_STEPS,
  DEFAULT_ANALYSIS_STEP,
} from "@/config/prompts";
import {
  blendedProgressPercent,
  userPhaseForStep,
  type UserAnalysisPhase,
} from "@/lib/analysis/userPhases";
import { hapticStep, hapticSuccess } from "@/lib/haptics";
import { parseJsonResponse } from "@/lib/api/parseResponse";
import { apiPath } from "@/lib/paths";
import type { Report, Session } from "@/types";

interface AnalysisProgressState {
  report: Report | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  step: string;
  eyebrow: string;
  headline: string;
  message: string;
  progressPercent: number;
  userPhase: UserAnalysisPhase;
  overallProgressPercent: number;
}

function getStepConfig(step?: string) {
  if (step && ANALYSIS_STEPS[step]) return ANALYSIS_STEPS[step];
  return DEFAULT_ANALYSIS_STEP;
}

function resolveMessage(step: string, serverMessage: string): string {
  if (serverMessage.trim()) return serverMessage;
  const config = getStepConfig(step);
  return config.detail ?? config.ticks[0] ?? "Working…";
}

function humanizeReportError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("fetch failed") || lower.includes("enotfound")) {
    return "Couldn't download your video for analysis. Try Preview sample report on home, or upload again.";
  }
  if (lower.includes("session not found")) {
    return "This session expired after a server restart. Upload again or use Preview sample report.";
  }
  return message;
}

export function useAnalysisProgress(sessionId: string | null) {
  const initialConfig = ANALYSIS_STEPS.uploading;
  const initialPhase = userPhaseForStep("uploading");
  const [state, setState] = useState<AnalysisProgressState>(() => ({
    report: null,
    session: null,
    loading: !!sessionId,
    error: null,
    step: "uploading",
    eyebrow: initialConfig.eyebrow,
    headline: initialConfig.headline,
    message: initialConfig.detail ?? initialConfig.ticks[0],
    progressPercent: initialConfig.percent,
    userPhase: initialPhase,
    overallProgressPercent: blendedProgressPercent(
      initialPhase.index,
      initialConfig.percent
    ),
  }));

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStepRef = useRef("uploading");
  const targetProgressRef = useRef(10);

  const fetchReport = async () => {
    if (!sessionId) return true;

    try {
      const res = await fetch(apiPath(`/api/report?sessionId=${sessionId}`));
      const data = await parseJsonResponse<{
        session?: Session;
        report?: Report | null;
        error?: string;
      }>(res);

      if (!res.ok) throw new Error(data.error ?? "Failed to load report");

      const session = data.session as Session;
      const step =
        (session as { progress_step?: string }).progress_step ?? "uploading";
      const serverMessage =
        (session as { progress_message?: string }).progress_message ?? "";
      const config = getStepConfig(step);

      targetProgressRef.current = config.percent;

      if (data.report && session.status === "complete") {
        if (lastStepRef.current !== "complete") {
          hapticSuccess();
          lastStepRef.current = "complete";
        }

        const completePhase = userPhaseForStep("complete");
        setState({
          report: data.report,
          session,
          loading: false,
          error: null,
          step: "complete",
          eyebrow: ANALYSIS_STEPS.complete.eyebrow,
          headline: ANALYSIS_STEPS.complete.headline,
          message: ANALYSIS_STEPS.complete.detail ?? ANALYSIS_STEPS.complete.ticks[0],
          progressPercent: 100,
          userPhase: completePhase,
          overallProgressPercent: 100,
        });
        return true;
      }

      if (session.status === "failed") {
        setState((s) => ({
          ...s,
          loading: false,
          error: humanizeReportError(serverMessage || "Analysis failed"),
        }));
        return true;
      }

      if (step !== lastStepRef.current) {
        hapticStep();
        lastStepRef.current = step;
      }

      const userPhase = userPhaseForStep(step);

      setState((prev) => {
        const stepProgress = Math.max(prev.progressPercent, config.percent - 8);
        return {
          ...prev,
          session,
          step,
          eyebrow: config.eyebrow,
          headline: config.headline,
          message: resolveMessage(step, serverMessage),
          progressPercent: stepProgress,
          userPhase,
          overallProgressPercent: blendedProgressPercent(
            userPhase.index,
            stepProgress
          ),
        };
      });

      return false;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load report";
      setState((s) => ({
        ...s,
        loading: false,
        error: humanizeReportError(message),
      }));
      return true;
    }
  };

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
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !state.loading) return;

    progressRef.current = setInterval(() => {
      setState((s) => {
        const target = targetProgressRef.current;
        if (s.progressPercent >= target) return s;
        const nextStepProgress = Math.min(target, s.progressPercent + 0.6);
        return {
          ...s,
          progressPercent: nextStepProgress,
          overallProgressPercent: blendedProgressPercent(
            s.userPhase.index,
            nextStepProgress
          ),
        };
      });
    }, 400);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [sessionId, state.loading]);

  return state;
}
