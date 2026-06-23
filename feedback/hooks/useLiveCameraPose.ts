"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AsyncPoseEngine, type PersonCandidate } from "@/lib/pose/asyncPoseEngine";
import type { RawPose } from "@/lib/pose/personLock";
import type { FrameLandmarks } from "@/types";

export interface LiveCameraPoseResult {
  landmarks: FrameLandmarks | null;
  /** All detected people this frame — only populated while calibrating */
  candidates: PersonCandidate[];
  /** True during the brief scan window before the fighter is locked in */
  calibrating: boolean;
  /** Tap-to-override — call with a candidate's pose to lock onto them */
  lockOnto: (pose: RawPose) => void;
}

/** Pose tracking for live camera feeds — decoupled VIDEO-mode inference */
export function useLiveCameraPose(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled = true
): LiveCameraPoseResult {
  const [landmarks, setLandmarks] = useState<FrameLandmarks | null>(null);
  const [candidates, setCandidates] = useState<PersonCandidate[]>([]);
  const [calibrating, setCalibrating] = useState(false);
  const rafRef = useRef<number>(0);
  const engineRef = useRef<AsyncPoseEngine | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLandmarks(null);
      setCandidates([]);
      setCalibrating(false);
      engineRef.current?.stop();
      engineRef.current = null;
      return;
    }

    const engine = new AsyncPoseEngine("VIDEO", setLandmarks, (cands, isCalibrating) => {
      setCalibrating(isCalibrating);
      setCandidates(isCalibrating && cands.length > 1 ? cands : []);
    });
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

  const lockOnto = useCallback((pose: RawPose) => {
    engineRef.current?.lockOnto(pose);
    setCandidates([]);
    setCalibrating(false);
  }, []);

  return { landmarks, candidates, calibrating, lockOnto };
}
