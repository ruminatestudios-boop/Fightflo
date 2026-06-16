import type { FrameLandmarks, LandmarkTimeline } from "@/types";
import { interpolateLandmarks } from "@/lib/analysis/landmarkSmoothing";
import { parseTimestamp } from "./utils";

/** Must match server extractFrames FRAMES_PER_SECOND */
export const LANDMARK_FPS = 12;

export function frameTimeSeconds(frame: { timestamp: string; frame?: number }): number {
  if (frame.frame !== undefined && frame.frame >= 0) {
    return frame.frame / LANDMARK_FPS;
  }
  return parseTimestamp(frame.timestamp);
}

function prepareSortedTimeline(timeline: LandmarkTimeline) {
  return [...timeline]
    .map((f) => ({ ...f, timeSeconds: frameTimeSeconds(f) }))
    .sort((a, b) => a.timeSeconds - b.timeSeconds);
}

/** Smooth interpolated pose at exact video playback time */
export function getInterpolatedLandmarksAtTime(
  timeline: LandmarkTimeline,
  currentTime: number
): FrameLandmarks | null {
  if (timeline.length === 0) return null;

  const sorted = prepareSortedTimeline(timeline);

  const firstTime = sorted[0].timeSeconds;
  if (currentTime <= firstTime) {
    return sorted[0].landmarks;
  }

  const last = sorted[sorted.length - 1];
  if (currentTime >= last.timeSeconds) {
    return last.landmarks;
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (currentTime >= a.timeSeconds && currentTime <= b.timeSeconds) {
      const span = b.timeSeconds - a.timeSeconds;
      const t = span > 0 ? (currentTime - a.timeSeconds) / span : 0;
      return interpolateLandmarks(a.landmarks, b.landmarks, t);
    }
  }

  return last.landmarks;
}

/** True when the server saved enough pose samples for stored playback */
export function hasUsableStoredLandmarks(timeline: LandmarkTimeline): boolean {
  if (timeline.length < 2) return false;

  let drawable = 0;
  for (const frame of timeline) {
    if (landmarksAreDrawable(frame.landmarks)) {
      drawable++;
      if (drawable >= 3) return true;
    }
  }
  return false;
}

/** Looser check for export — partial tracking still burns visible skeleton */
export function hasExportableLandmarks(timeline: LandmarkTimeline): boolean {
  return countDrawableLandmarkFrames(timeline) >= 1;
}

/** Frames with enough joints to draw a visible skeleton */
export function countDrawableLandmarkFrames(timeline: LandmarkTimeline): number {
  let withPose = 0;
  for (const frame of timeline) {
    if (landmarksAreDrawable(frame.landmarks)) withPose++;
  }
  return withPose;
}

export function landmarksAreDrawable(
  landmarks: FrameLandmarks | null | undefined
): boolean {
  if (!landmarks) return false;
  const visible = Object.values(landmarks).filter(
    (p) => p && (p.visibility ?? 1) >= 0.08
  );
  if (visible.length < 3) return false;
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const lw = landmarks.left_wrist;
  const rw = landmarks.right_wrist;
  const hasShoulder =
    Boolean(ls && (ls.visibility ?? 1) >= 0.08) ||
    Boolean(rs && (rs.visibility ?? 1) >= 0.08);
  const hasLimb =
    Boolean(lw && (lw.visibility ?? 1) >= 0.08) ||
    Boolean(rw && (rw.visibility ?? 1) >= 0.08) ||
    Boolean(landmarks.left_elbow && (landmarks.left_elbow.visibility ?? 1) >= 0.08) ||
    Boolean(landmarks.right_elbow && (landmarks.right_elbow.visibility ?? 1) >= 0.08);
  return hasShoulder || hasLimb;
}

/** Shift landmark timestamps for clip playback (clip starts at offset in full video) */
export function shiftLandmarkTimeline(
  timeline: LandmarkTimeline,
  offsetSeconds: number
): LandmarkTimeline {
  return timeline.map((frame) => {
    const t = Math.max(0, frameTimeSeconds(frame) - offsetSeconds);
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return {
      ...frame,
      timestamp: `${m}:${s.toString().padStart(2, "0")}`,
      frame: Math.round(t * LANDMARK_FPS),
    };
  });
}
