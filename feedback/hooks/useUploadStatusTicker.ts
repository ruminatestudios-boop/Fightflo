"use client";

import { useMemo } from "react";
import { ANALYSIS_STEPS } from "@/config/prompts";

/** Client-side status while uploading (before report page polling) */
export function useUploadStatusTicker(
  active: boolean,
  baseMessage: string,
  progress: number
) {
  const message = useMemo(() => {
    if (!active) return baseMessage;
    if (baseMessage && !baseMessage.endsWith("...")) return baseMessage;
    if (progress >= 75) {
      return "Upload finished — handing your clip to the analysis engine…";
    }
    if (progress >= 50) {
      return `Uploading your video securely (${Math.round(progress)}%)…`;
    }
    return `Transferring video to secure storage (${Math.round(progress)}%)…`;
  }, [active, baseMessage, progress]);

  return {
    eyebrow: progress >= 75 ? "Starting" : ANALYSIS_STEPS.uploading.eyebrow,
    headline:
      progress >= 75 ? "Queuing analysis" : ANALYSIS_STEPS.uploading.headline,
    message,
  };
}
