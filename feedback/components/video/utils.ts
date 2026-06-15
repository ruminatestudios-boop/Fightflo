import type { FrameLandmarks } from "@/types";
import type { Annotation, LandmarkFrame } from "./types";
import { apiPath } from "@/lib/paths";
import { computeFrameMetrics } from "@/lib/analysis/poseMetrics";

/** Parse M:SS or H:MM:SS timestamp strings to seconds */
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.trim().split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function resolvePlaybackUrl(session: { id: string; video_url: string }): string {
  const { video_url: videoUrl, id } = session;
  if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
    return videoUrl;
  }
  return apiPath(`/api/video?sessionId=${id}`);
}

export function landmarksNearTime(
  landmarks: LandmarkFrame[],
  timeSeconds: number,
  windowSeconds = 3
): LandmarkFrame[] {
  return landmarks.filter((frame) => {
    const t = parseTimestamp(frame.timestamp);
    return Math.abs(t - timeSeconds) <= windowSeconds;
  });
}

export function getFrameAtTime(
  landmarks: LandmarkFrame[],
  currentTime: number
): LandmarkFrame | null {
  if (landmarks.length === 0) return null;

  let closest = landmarks[0];
  let minDelta = Math.abs(parseTimestamp(closest.timestamp) - currentTime);

  for (const frame of landmarks) {
    const delta = Math.abs(parseTimestamp(frame.timestamp) - currentTime);
    if (delta < minDelta) {
      minDelta = delta;
      closest = frame;
    }
  }

  return closest;
}

export function getAnnotationAt(
  annotations: Annotation[],
  currentTime: number,
  windowSeconds = 1.5
): Annotation | null {
  return (
    annotations.find(
      (a) => Math.abs(a.timeSeconds - currentTime) <= windowSeconds
    ) ?? null
  );
}

const JOINT_TO_INDEX: Partial<Record<keyof FrameLandmarks, number>> = {
  nose: 0,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
};

export function getLandmarkPoint(
  landmarks: FrameLandmarks,
  joint: keyof FrameLandmarks
) {
  return landmarks[joint] ?? null;
}

export function isGuardDropped(landmarks: FrameLandmarks): boolean {
  const metrics = computeFrameMetrics(landmarks);
  return metrics.metrics_reliable && metrics.guard_dropped;
}

export { JOINT_TO_INDEX };
