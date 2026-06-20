"use client";

import { useEffect, useRef, useState } from "react";
import { AsyncPoseEngine } from "@/lib/pose/asyncPoseEngine";
import type { FrameLandmarks } from "@/types";

/** Pose tracking for live camera feeds — decoupled VIDEO-mode inference */
export function useLiveCameraPose(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled = true
): FrameLandmarks | null {
  const [landmarks, setLandmarks] = useState<FrameLandmarks | null>(null);
  const rafRef = useRef<number>(0);
  const engineRef = useRef<AsyncPoseEngine | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLandmarks(null);
      engineRef.current?.stop();
      engineRef.current = null;
      return;
    }

    const engine = new AsyncPoseEngine("VIDEO", setLandmarks);
    engine.start();
    engineRef.current = engine;
    let hasLoggedFailure = false;

    const pump = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        engine.scheduleFrame(video, performance.now());
      }
      if (engine.hasFailed && !hasLoggedFailure) {
        hasLoggedFailure = true;
        console.error(
          "[useLiveCameraPose] Pose detection has failed repeatedly — model/WASM likely failed to load."
        );
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

  return landmarks;
}
