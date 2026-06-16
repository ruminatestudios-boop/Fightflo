"use client";

import { FRAMES_PER_SECOND, frameToTimestamp } from "@/lib/analysis/timestamps";
import type { FrameLandmarks, LandmarkTimeline } from "@/types";

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

export interface LandmarkCollectionMeta {
  videoWidth: number;
  videoHeight: number;
}

type PoseLandmarkerInstance = {
  detect: (image: HTMLVideoElement | HTMLCanvasElement) => {
    landmarks: Array<
      Array<{ x: number; y: number; z: number; visibility?: number }>
    >;
  };
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
    if (point && (point.visibility ?? 1) > 0.2) {
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

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|od|ad)/.test(navigator.userAgent) &&
    /WebKit/.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)
  );
}

async function afterSeek(video: HTMLVideoElement): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  // iOS Safari often needs an extra beat before drawImage matches the seeked frame.
  if (isIosSafari()) {
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    if (video.readyState < 2) {
      await new Promise<void>((resolve) => {
        video.addEventListener("canplay", () => resolve(), { once: true });
      });
    }
  }
}

function waitForSeek(video: HTMLVideoElement, time: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve(video.currentTime);
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video seek failed"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    if (Math.abs(video.currentTime - time) < 0.02) {
      resolve(video.currentTime);
      return;
    }

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });
}

/** Draw current video frame to canvas — matches export frame pixels exactly. */
function frameCanvas(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create pose canvas");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Sample pose landmarks from a video in the browser for server-side export. */
export async function collectLandmarkTimelineFromVideo(
  video: HTMLVideoElement,
  onProgress?: (message: string) => void
): Promise<{ timeline: LandmarkTimeline; meta: LandmarkCollectionMeta }> {
  if (!video.duration || !Number.isFinite(video.duration)) {
    throw new Error("Video is not ready for pose sampling");
  }
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    throw new Error("Video dimensions not available");
  }

  const landmarker = await getClientLandmarker();
  const timeline: LandmarkTimeline = [];
  const frameCount = Math.max(1, Math.ceil(video.duration * FRAMES_PER_SECOND));
  const savedTime = video.currentTime;
  const wasPaused = video.paused;

  video.pause();

  try {
    for (let frame = 0; frame < frameCount; frame++) {
      const targetTime = Math.min(frame / FRAMES_PER_SECOND, video.duration);
      const sampleTime = await waitForSeek(video, targetTime);

      if (video.videoWidth === 0) continue;

      await afterSeek(video);

      onProgress?.(
        `Reading your movement… ${Math.round(((frame + 1) / frameCount) * 100)}%`
      );

      const frameIndex = Math.round(sampleTime * FRAMES_PER_SECOND);
      const canvas = frameCanvas(video);

      try {
        const result = landmarker.detect(canvas);
        const pose = result.landmarks[0];
        timeline.push({
          frame: frameIndex,
          timestamp: frameToTimestamp(frameIndex),
          landmarks: pose ? mapPose(pose) : {},
        });
      } catch {
        timeline.push({
          frame: frameIndex,
          timestamp: frameToTimestamp(frameIndex),
          landmarks: {},
        });
      }
    }
  } finally {
    await waitForSeek(video, savedTime).catch(() => undefined);
    if (!wasPaused) {
      void video.play().catch(() => undefined);
    }
  }

  return {
    timeline,
    meta: {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
    },
  };
}
