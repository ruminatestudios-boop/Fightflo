"use client";

import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  POSE_MODEL_CANDIDATES,
  POSE_WASM_CDN,
  type PoseModelTier,
} from "./constants";

let landmarkerPromise: Promise<{
  landmarker: PoseLandmarker;
  gpu: boolean;
  tier: PoseModelTier;
}> | null = null;

export function resetPoseLandmarker(): void {
  landmarkerPromise = null;
}

export async function createPoseLandmarker(): Promise<{
  landmarker: PoseLandmarker;
  gpu: boolean;
  tier: PoseModelTier;
}> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(POSE_WASM_CDN);
      let lastError: unknown;

      for (const candidate of POSE_MODEL_CANDIDATES) {
        try {
          const landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: candidate.url,
              delegate: candidate.delegate,
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.55,
            minPosePresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });
          return {
            landmarker,
            gpu: candidate.delegate === "GPU",
            tier: candidate.tier,
          };
        } catch (err) {
          lastError = err;
        }
      }

      throw lastError ?? new Error("Failed to load any pose landmarker model");
    })();
  }
  return landmarkerPromise;
}

export function detectPose(
  landmarker: PoseLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): PoseLandmarkerResult | null {
  if (!video.videoWidth) return null;
  return landmarker.detectForVideo(video, timestampMs);
}
