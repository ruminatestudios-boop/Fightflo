"use client";

import { useEffect, useRef, useState } from "react";
import { AsyncPoseEngine } from "@/lib/pose/asyncPoseEngine";
import type { FrameLandmarks } from "@/types";

/**
 * Runs pose tracking during video playback — inference is async and
 * never blocks the overlay draw loop.
 */
export function useLivePoseLandmarks(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled = true
): FrameLandmarks | null {
  const [liveLandmarks, setLiveLandmarks] = useState<FrameLandmarks | null>(
    null
  );
  const rafRef = useRef<number>(0);
  const lastSampleTime = useRef(-1);
  const engineRef = useRef<AsyncPoseEngine | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLiveLandmarks(null);
      engineRef.current?.stop();
      engineRef.current = null;
      return;
    }

    const engine = new AsyncPoseEngine("IMAGE", setLiveLandmarks);
    engine.start();
    engineRef.current = engine;

    const pump = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const t = video.currentTime;
        if (Math.abs(t - lastSampleTime.current) >= 0.05) {
          lastSampleTime.current = t;
          engine.scheduleFrame(video);
        }
      }
      rafRef.current = requestAnimationFrame(pump);
    };

    rafRef.current = requestAnimationFrame(pump);

    return () => {
      cancelAnimationFrame(rafRef.current);
      engine.stop();
      engineRef.current = null;
    };
  }, [videoRef, enabled]);

  return liveLandmarks;
}
