import { FRAMES_PER_SECOND, frameToTimestamp } from "@/lib/analysis/extractFrames";
import { smoothLandmarkTimeline } from "@/lib/analysis/landmarkSmoothing";
import {
  computeFrameMetrics,
  isWeaknessConfirmedInFrame,
  jointForWeakness,
  humanLabelForWeakness,
} from "@/lib/analysis/poseMetrics";
import { assessPoseQuality } from "@/lib/analysis/poseQuality";
import { getSportConfig } from "@/config/sports";
import type {
  ConfirmedPoseEvent,
  FrameLandmarks,
  LandmarkTimeline,
  PatternAnalysisResult,
  SportId,
} from "@/types";

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

const HEAVY_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task";

import type { PoseLandmarker } from "@mediapipe/tasks-vision";

let landmarkerInstance: PoseLandmarker | null = null;

async function getLandmarker() {
  if (landmarkerInstance) return landmarkerInstance;

  const { FilesetResolver, PoseLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  landmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: HEAVY_MODEL,
      delegate: "CPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });

  return landmarkerInstance;
}

async function loadFrameImage(framePath: string) {
  const { loadImage } = await import("@napi-rs/canvas");
  return loadImage(framePath);
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

export async function detectPose(
  framePaths: string[],
  sport: SportId
): Promise<LandmarkTimeline> {
  const result = await detectPoseWithMeta(framePaths, sport);
  return result.timeline;
}

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
  const msPerFrame = 1000 / FRAMES_PER_SECOND;

  for (let i = 0; i < framePaths.length; i++) {
    try {
      const image = await loadFrameImage(framePaths[i]);
      const result = landmarker.detectForVideo(
        image as unknown as TexImageSource,
        i * msPerFrame
      );
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

function buildLandmarkSummary(
  timeline: LandmarkTimeline,
  sport: SportId
): Record<string, unknown> {
  const guardDropFrames = timeline.filter((f) =>
    computeFrameMetrics(f.landmarks).guard_dropped
  ).length;

  const elbowAngles = timeline
    .map((f) => computeFrameMetrics(f.landmarks).right_elbow_angle)
    .filter((a): a is number => a !== null);

  const avgElbow =
    elbowAngles.length > 0
      ? Math.round(
          elbowAngles.reduce((a, b) => a + b, 0) / elbowAngles.length
        )
      : null;

  return {
    sport,
    frames_analysed: timeline.length,
    guard_drop_frame_ratio: timeline.length
      ? Math.round((guardDropFrames / timeline.length) * 100)
      : 0,
    avg_right_elbow_angle: avgElbow,
    sample_timestamps: timeline.slice(0, 5).map((f) => f.timestamp),
  };
}

export function buildConfirmedEvents(
  timeline: LandmarkTimeline,
  patternData: PatternAnalysisResult
): ConfirmedPoseEvent[] {
  const events: ConfirmedPoseEvent[] = [];
  const seen = new Set<string>();

  for (const event of patternData.events) {
    const frame = timeline[event.start_frame];
    if (!frame) continue;

    const metrics = computeFrameMetrics(frame.landmarks);
    if (!isWeaknessConfirmedInFrame(event.weakness_type, metrics)) continue;

    const key = `${event.weakness_type}-${event.start_timestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const parts = event.start_timestamp.split(":").map(Number);
    const timeSeconds =
      parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] ?? 0;

    events.push({
      weakness_type: event.weakness_type,
      timestamp: event.start_timestamp,
      timeSeconds,
      jointHighlight: jointForWeakness(event.weakness_type),
      label: humanLabelForWeakness(event.weakness_type),
      confidence: event.confidence,
    });
  }

  if (events.length === 0 && patternData.primary_weakness) {
    const mid = timeline[Math.floor(timeline.length / 2)];
    if (mid) {
      const metrics = computeFrameMetrics(mid.landmarks);
      if (isWeaknessConfirmedInFrame(patternData.primary_weakness, metrics)) {
        const parts = mid.timestamp.split(":").map(Number);
        events.push({
          weakness_type: patternData.primary_weakness,
          timestamp: mid.timestamp,
          timeSeconds:
            parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] ?? 0,
          jointHighlight: jointForWeakness(patternData.primary_weakness),
          label: humanLabelForWeakness(patternData.primary_weakness),
          confidence: 0.5,
        });
      }
    }
  }

  return events;
}

export function parseTimestampToSeconds(ts: string): number {
  const parts = ts.trim().split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
