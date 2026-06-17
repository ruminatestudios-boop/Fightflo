"use client";

import {
  POSE_LANDMARKER_LITE_URL,
  createSportsPoseLandmarkerOptions,
} from "@/lib/pose/mediapipeConfig";

type RunningMode = "IMAGE" | "VIDEO";

type PoseLandmarkerLike = {
  detect: (image: HTMLVideoElement | HTMLCanvasElement) => {
    landmarks: Array<
      Array<{ x: number; y: number; z: number; visibility?: number }>
    >;
  };
  detectForVideo?: (
    image: HTMLVideoElement,
    timestampMs: number
  ) => {
    landmarks: Array<
      Array<{ x: number; y: number; z: number; visibility?: number }>
    >;
  };
  close?: () => void;
};

const landmarkerCache = new Map<string, PoseLandmarkerLike>();
const landmarkerPromises = new Map<string, Promise<PoseLandmarkerLike>>();

function cacheKey(runningMode: RunningMode): string {
  return `${runningMode}:${POSE_LANDMARKER_LITE_URL}`;
}

async function createLandmarker(
  runningMode: RunningMode,
  preferGpu: boolean
): Promise<PoseLandmarkerLike> {
  const { FilesetResolver, PoseLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  const options = createSportsPoseLandmarkerOptions(
    runningMode,
    preferGpu ? "GPU" : "CPU"
  );

  try {
    return await PoseLandmarker.createFromOptions(vision, options);
  } catch {
    return PoseLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "CPU" },
    });
  }
}

export async function getClientPoseLandmarker(
  runningMode: RunningMode,
  preferGpu = runningMode === "VIDEO"
): Promise<PoseLandmarkerLike> {
  const key = cacheKey(runningMode);
  const cached = landmarkerCache.get(key);
  if (cached) return cached;

  let promise = landmarkerPromises.get(key);
  if (!promise) {
    promise = createLandmarker(runningMode, preferGpu).then((landmarker) => {
      landmarkerCache.set(key, landmarker);
      return landmarker;
    });
    landmarkerPromises.set(key, promise);
  }

  return promise;
}
