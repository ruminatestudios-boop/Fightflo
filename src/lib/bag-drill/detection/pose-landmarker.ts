"use client";

import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { POSE_MODEL_URL, POSE_WASM_CDN } from "./constants";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;
let usingGpu = true;

export async function createPoseLandmarker(): Promise<{
  landmarker: PoseLandmarker;
  gpu: boolean;
}> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(POSE_WASM_CDN);
      try {
        return await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: POSE_MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.6,
          minPosePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
      } catch {
        usingGpu = false;
        return PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: POSE_MODEL_URL,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.6,
          minPosePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
      }
    })();
  }
  const landmarker = await landmarkerPromise;
  return { landmarker, gpu: usingGpu };
}

export function detectPose(
  landmarker: PoseLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): PoseLandmarkerResult | null {
  if (!video.videoWidth) return null;
  return landmarker.detectForVideo(video, timestampMs);
}
