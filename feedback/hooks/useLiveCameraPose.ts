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

type VideoLandmarker = {
  detectForVideo: (
    image: HTMLVideoElement,
    timestampMs: number
  ) => {
    landmarks: Array<
      Array<{ x: number; y: number; z: number; visibility?: number }>
    >;
  };
  close?: () => void;
};

let sharedLandmarker: VideoLandmarker | null = null;
let landmarkerPromise: Promise<VideoLandmarker> | null = null;

async function getVideoLandmarker(): Promise<VideoLandmarker> {
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
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    }).catch(async () =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      })
    );

    return sharedLandmarker;
  })().catch((error) => {
    landmarkerPromise = null;
    throw error;
  });

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

/** Pose tracking for live camera feeds (VIDEO mode — smoother than IMAGE). */
export function useLiveCameraPose(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled = true
): FrameLandmarks | null {
  const [landmarks, setLandmarks] = useState<FrameLandmarks | null>(null);
  const rafRef = useRef<number>(0);
  const smoothRef = useRef<FrameLandmarks | null>(null);
  const lastTimestamp = useRef(-1);

  useEffect(() => {
    if (!enabled) {
      setLandmarks(null);
      smoothRef.current = null;
      lastTimestamp.current = -1;
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

      const timestampMs = performance.now();
      if (timestampMs - lastTimestamp.current < 32) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTimestamp.current = timestampMs;

      try {
        const landmarker = await getVideoLandmarker();
        if (cancelled) return;

        const result = landmarker.detectForVideo(video, timestampMs);
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
              setLandmarks(blended);
            } else {
              smoothRef.current = raw;
              setLandmarks(raw);
            }
          }
        }
      } catch {
        /* model still loading or GPU fallback — keep last frame */
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef, enabled]);

  return landmarks;
}
