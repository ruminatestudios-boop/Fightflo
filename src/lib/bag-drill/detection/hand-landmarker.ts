"use client";

import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { HAND_MODEL_URL, POSE_WASM_CDN } from "./constants";
import { LM } from "./constants";
import { lm } from "./landmarks";

let handLandmarkerPromise: Promise<{
  landmarker: HandLandmarker;
  gpu: boolean;
}> | null = null;

export function resetHandLandmarker(): void {
  handLandmarkerPromise = null;
}

export async function createHandLandmarker(): Promise<{
  landmarker: HandLandmarker;
  gpu: boolean;
}> {
  if (!handLandmarkerPromise) {
    handLandmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(POSE_WASM_CDN);

      for (const delegate of ["GPU", "CPU"] as const) {
        try {
          const landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: HAND_MODEL_URL,
              delegate,
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.45,
            minHandPresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
          return { landmarker, gpu: delegate === "GPU" };
        } catch {
          /* try next delegate */
        }
      }

      throw new Error("Failed to load hand landmarker");
    })();
  }
  return handLandmarkerPromise;
}

export function detectHands(
  landmarker: HandLandmarker,
  video: HTMLVideoElement,
  timestampMs: number
): HandLandmarkerResult | null {
  if (!video.videoWidth) return null;
  return landmarker.detectForVideo(video, timestampMs);
}

/** Match a striking hand to the pose wrist that spiked. */
export function handForStrikeSide(
  hands: NormalizedLandmark[][],
  poseLandmarks: NormalizedLandmark[],
  side: "left" | "right"
): NormalizedLandmark[] | null {
  if (hands.length === 0) return null;

  const poseWrist = lm(
    poseLandmarks,
    side === "left" ? LM.LEFT_WRIST : LM.RIGHT_WRIST
  );
  if (!poseWrist) return hands[0] ?? null;

  let best: NormalizedLandmark[] | null = null;
  let bestDist = Infinity;

  for (const hand of hands) {
    const wrist = hand[0];
    if (!wrist || (wrist.visibility ?? 1) < 0.4) continue;
    const dist = Math.hypot(wrist.x - poseWrist.x, wrist.y - poseWrist.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = hand;
    }
  }

  return bestDist < 0.22 ? best : null;
}
