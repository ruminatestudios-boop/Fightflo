import type { FrameLandmarks, LandmarkTimeline } from "@/types";
import { interpolateLandmarks } from "@/lib/analysis/landmarkSmoothing";
import { parseTimestamp } from "./utils";

/** Must match server extractFrames FRAMES_PER_SECOND */
export const LANDMARK_FPS = 12;

export function frameTimeSeconds(frame: { timestamp: string; frame?: number }): number {
  const fromTs = parseTimestamp(frame.timestamp);
  if (fromTs > 0 || frame.timestamp === "0:00") return fromTs;
  if (frame.frame !== undefined) return frame.frame / LANDMARK_FPS;
  return 0;
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

  if (currentTime <= sorted[0].timeSeconds) {
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
  if (timeline.length < 3) return false;

  let withShoulders = 0;
  for (const frame of timeline) {
    const ls = frame.landmarks.left_shoulder;
    const rs = frame.landmarks.right_shoulder;
    if ((ls?.visibility ?? 0) > 0.3 && (rs?.visibility ?? 0) > 0.3) {
      withShoulders++;
      if (withShoulders >= 3) return true;
    }
  }
  return false;
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
