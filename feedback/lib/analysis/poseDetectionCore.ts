import { FRAMES_PER_SECOND, frameToTimestamp } from "@/lib/analysis/extractFrames";
import { smoothLandmarkTimeline } from "@/lib/analysis/landmarkSmoothing";
import { buildTimelineContext } from "@/lib/analysis/timelineAnalysis";
import {
  ensureMediaPipeServerRuntime,
  getMediaPipeVisionWasmBaseUrl,
} from "@/lib/analysis/mediaPipeServerRuntime";
import { assessPoseQuality } from "@/lib/analysis/poseQuality";
import { getSportConfig } from "@/config/sports";
import type {
  ConfirmedPoseEvent,
  FrameLandmarks,
  LandmarkTimeline,
  SportId,
} from "@/types";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

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

const LITE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerInstance: PoseLandmarker | null = null;

async function getLandmarker() {
  if (landmarkerInstance) return landmarkerInstance;

  ensureMediaPipeServerRuntime();
  const wasmBaseUrl = getMediaPipeVisionWasmBaseUrl();

  const { FilesetResolver, PoseLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );

  const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl);

  landmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: LITE_MODEL,
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    numPoses: 1,
  });

  return landmarkerInstance;
}

async function loadFrameImage(framePath: string) {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(framePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return canvas;
}

function mapPoseToLandmarks(
  pose: Array<{ x: number; y: number; z: number; visibility?: number }>,
  indices: number[]
): FrameLandmarks {
  const landmarks: FrameLandmarks = {};
  for (const idx of indices) {
    const key = LANDMARK_MAP[idx];
    const point = pose[idx];
    if (key && point) {
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

export interface PoseDetectionResult {
  timeline: LandmarkTimeline;
  quality: ReturnType<typeof assessPoseQuality>;
  confirmed_events: ConfirmedPoseEvent[];
  landmark_summary: Record<string, unknown>;
}

function buildLandmarkSummary(
  timeline: LandmarkTimeline,
  sport: SportId
): Record<string, unknown> {
  const context = buildTimelineContext(timeline);
  const { calibration, frames } = context;

  const reliableFrames = frames.filter((f) => f.metrics.metrics_reliable);
  const guardDropFrames = reliableFrames.filter(
    (f) => f.metrics.guard_dropped
  ).length;

  const elbowAngles = reliableFrames
    .map((f) => f.metrics.right_elbow_angle)
    .filter((a): a is number => a !== null);

  const avgElbow =
    elbowAngles.length > 0
      ? Math.round(
          elbowAngles.reduce((a, b) => a + b, 0) / elbowAngles.length
        )
      : null;

  const avgGuardConfidence =
    reliableFrames.length > 0
      ? Math.round(
          (reliableFrames.reduce((s, f) => s + f.metrics.guard_confidence, 0) /
            reliableFrames.length) *
            100
        ) / 100
      : null;

  return {
    sport,
    frames_analysed: timeline.length,
    reliable_frame_ratio: timeline.length
      ? Math.round((reliableFrames.length / timeline.length) * 100)
      : 0,
    guard_drop_frame_ratio: reliableFrames.length
      ? Math.round((guardDropFrames / reliableFrames.length) * 100)
      : 0,
    avg_right_elbow_angle: avgElbow,
    avg_guard_confidence: avgGuardConfidence,
    guard_calibrated: calibration !== null,
    guard_line_y: calibration?.guardLineY ?? null,
    guard_threshold: calibration?.guardThreshold ?? null,
    kick_events_detected: context.kickEvents.length,
    sample_timestamps: timeline.slice(0, 5).map((f) => f.timestamp),
  };
}

/** Plain Node pose detection — do not import from Next.js API routes directly. */
export async function detectPoseWithMeta(
  framePaths: string[],
  sport: SportId
): Promise<PoseDetectionResult> {
  const sportConfig = getSportConfig(sport);
  const indices = sportConfig.landmarks_to_track;
  const rawTimeline: LandmarkTimeline = [];

  if (framePaths.length === 0) {
    const quality = assessPoseQuality([]);
    return {
      timeline: [],
      quality,
      confirmed_events: [],
      landmark_summary: { error: "no_frames" },
    };
  }

  const landmarker = await getLandmarker();

  for (let i = 0; i < framePaths.length; i++) {
    try {
      const image = await loadFrameImage(framePaths[i]);
      const result = landmarker.detect(image as unknown as TexImageSource);
      const pose = result.landmarks[0];
      const landmarks = pose ? mapPoseToLandmarks(pose, indices) : {};

      rawTimeline.push({
        frame: i,
        timestamp: frameToTimestamp(i),
        landmarks,
      });
    } catch (error) {
      console.warn(`Pose detection failed for frame ${i}:`, error);
      rawTimeline.push({
        frame: i,
        timestamp: frameToTimestamp(i),
        landmarks: {},
      });
    }
  }

  const timeline = smoothLandmarkTimeline(rawTimeline, FRAMES_PER_SECOND);
  const quality = assessPoseQuality(timeline);
  const landmark_summary = buildLandmarkSummary(timeline, sport);

  return {
    timeline,
    quality,
    confirmed_events: [],
    landmark_summary,
  };
}

export async function detectPose(
  framePaths: string[],
  sport: SportId
): Promise<LandmarkTimeline> {
  const result = await detectPoseWithMeta(framePaths, sport);
  return result.timeline;
}
