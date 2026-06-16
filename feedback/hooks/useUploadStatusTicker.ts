"use client";

import { useEffect, useMemo, useState } from "react";
import { ANALYSIS_STEPS } from "@/config/prompts";

/** Client-side status while uploading (before report page polling) */
export function useUploadStatusTicker(
  active: boolean,
  baseMessage: string,
  progress: number
) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (active) {
      setStartedAt((prev) => prev ?? Date.now());
      const id = window.setInterval(() => setTick((t) => t + 1), 1000);
      return () => window.clearInterval(id);
    }
    setStartedAt(null);
    setTick(0);
  }, [active]);

  const elapsedSec = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;

  const message = useMemo(() => {
    if (!active) return baseMessage;
    if (baseMessage && !baseMessage.endsWith("...")) return baseMessage;
    if (progress >= 75) {
      return "Upload finished — starting your coaching analysis…";
    }
    if (progress >= 50) {
      return "Uploading your video securely…";
    }
    if (elapsedSec >= 90) {
      return "Still uploading — large clips on mobile can take several minutes. Stay on Wi‑Fi and keep this tab open.";
    }
    if (progress <= 20) {
      return "Sending your video — the bar may move slowly on phones even when upload is working…";
    }
    return "Transferring video to secure storage…";
  }, [active, baseMessage, progress, elapsedSec, tick]);

  return {
    eyebrow: progress >= 75 ? "Starting" : ANALYSIS_STEPS.uploading.eyebrow,
    headline:
      progress >= 75 ? "Queuing analysis" : ANALYSIS_STEPS.uploading.headline,
    message,
    elapsedSec,
  };
}
