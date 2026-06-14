"use client";

import { useEffect, useRef, useState } from "react";
import { ANALYSIS_STEPS } from "@/config/prompts";
import { hapticTick } from "@/lib/haptics";

/** Client-side status ticker while waiting on upload / pre-navigation */
export function useUploadStatusTicker(
  active: boolean,
  baseMessage: string,
  progress: number
) {
  const uploadTicks = ANALYSIS_STEPS.uploading.ticks;
  const [message, setMessage] = useState(baseMessage);
  const tickRef = useRef(0);

  useEffect(() => {
    setMessage(baseMessage);
  }, [baseMessage]);

  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => {
      tickRef.current = (tickRef.current + 1) % uploadTicks.length;
      hapticTick();
      setMessage(uploadTicks[tickRef.current]);
    }, 2600);

    return () => clearInterval(id);
  }, [active, uploadTicks]);

  return {
    eyebrow: progress >= 75 ? "Starting" : ANALYSIS_STEPS.uploading.eyebrow,
    headline:
      progress >= 75 ? "Queuing analysis" : ANALYSIS_STEPS.uploading.headline,
    message,
  };
}
