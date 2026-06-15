"use client";

import { useEffect, useRef, useState } from "react";
import type { FrameLandmarks } from "@/types";

const LANDMARK_MAP: Record<number, keyof FrameLandmarks> = {
  0: "nose",
  11: "left_shoulder",
  12: "right_shoulder",
  13: "left_elbow",
  14: "right_elbow",
  15: "left_wrist",
  16: "right_wrist",
  23: "left_hip",
  24: "right_hip",
  25: "left_knee",
  26: "right_knee",
  27: "left_ankle",
  28: "right_ankle",
};

type PoseLandmarkerInstance = {
  detect: (
    image: HTMLVideoElement | HTMLCanvasElement
  ) => {
    landmarks: Array<
      Array<{ x: number; y: number; z: number; visibility?: number }>
    >;
  };
  close?: () => void;
};

let sharedLandmarker: PoseLandmarkerInstance | null = null;
let landmarkerPromise: Promise<PoseLandmarkerInstance> | null = null;

async function getClientLandmarker(): Promise<PoseLandmarkerInstance> {
  if (sharedLandmarker) return sharedLandmarker;
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import(
      "@mediapipe/tasks-vision"
    );

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );

    sharedLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      numPoses: 1,
    });

    return sharedLandmarker;
  })();

  return landmarkerPromise;
}

function mapPose(
  pose: Array<{ x: number; y: number; z: number; visibility?: number }>
): FrameLandmarks {
  const landmarks: FrameLandmarks = {};
  for (const [idxStr, key] of Object.entries(LANDMARK_MAP)) {
    const idx = Number(idxStr);
    const point = pose[idx];
    if (point && (point.visibility ?? 1) > 0.25) {
      landmarks[key] = {
        x: point.x,
        y: point.y,
        z: point.z,
        visibility: point.visibility,
      };
    }
  }
  return landmarks;
}

function hasCoreJoints(landmarks: FrameLandmarks): boolean {
  const core: (keyof FrameLandmarks)[] = [
    "left_shoulder",
    "right_shoulder",
    "left_hip",
    "right_hip",
  ];
  return core.filter((j) => (landmarks[j]?.visibility ?? 0) > 0.4).length >= 3;
}

/**
 * Runs pose tracking on the video element each frame so the skeleton tracks
 * exactly what's on screen during playback.
 */
export function useLivePoseLandmarks(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled = true
): FrameLandmarks | null {
  const [liveLandmarks, setLiveLandmarks] = useState<FrameLandmarks | null>(
    null
  );
  const rafRef = useRef<number>(0);
  const lastDetectTime = useRef(-1);
  const smoothRef = useRef<FrameLandmarks | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLiveLandmarks(null);
      smoothRef.current = null;
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const t = video.currentTime;
      if (Math.abs(t - lastDetectTime.current) < 0.016) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastDetectTime.current = t;

      try {
        const landmarker = await getClientLandmarker();
        if (cancelled) return;

        const result = landmarker.detect(video);
        const pose = result.landmarks[0];
        if (pose) {
          const raw = mapPose(pose);
          if (hasCoreJoints(raw)) {
            const prev = smoothRef.current;
            if (prev) {
              const blended: FrameLandmarks = {};
              for (const key of Object.keys(raw) as (keyof FrameLandmarks)[]) {
                const a = prev[key];
                const b = raw[key];
                if (a && b) {
                  blended[key] = {
                    x: a.x * 0.35 + b.x * 0.65,
                    y: a.y * 0.35 + b.y * 0.65,
                    z: (a.z ?? 0) * 0.35 + (b.z ?? 0) * 0.65,
                    visibility: Math.max(a.visibility ?? 0, b.visibility ?? 0),
                  };
                } else {
                  blended[key] = b ?? a;
                }
              }
              smoothRef.current = blended;
              setLiveLandmarks(blended);
            } else {
              smoothRef.current = raw;
              setLiveLandmarks(raw);
            }
          }
        }
      } catch {
        /* fall back to stored landmarks in overlay */
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef, enabled]);

  return liveLandmarks;
}
