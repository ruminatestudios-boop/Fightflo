import type { FrameLandmarks, LandmarkTimeline } from "@/types";

export interface PoseQualityReport {
  score: number;
  frames_total: number;
  frames_with_pose: number;
  avg_visibility: number;
  usable: boolean;
  message: string;
}

const CORE_JOINTS: (keyof FrameLandmarks)[] = [
  "left_shoulder",
  "right_shoulder",
  "left_hip",
  "right_hip",
];

export function assessPoseQuality(timeline: LandmarkTimeline): PoseQualityReport {
  if (timeline.length === 0) {
    return {
      score: 0,
      frames_total: 0,
      frames_with_pose: 0,
      avg_visibility: 0,
      usable: false,
      message: "No pose data extracted — try a clearer angle with full body visible.",
    };
  }

  let framesWithPose = 0;
  let visibilitySum = 0;
  let visibilityCount = 0;

  for (const frame of timeline) {
    const coreVisible = CORE_JOINTS.filter(
      (j) => (frame.landmarks[j]?.visibility ?? 0) >= 0.5
    ).length;

    if (coreVisible >= 3) framesWithPose++;

    for (const joint of CORE_JOINTS) {
      const v = frame.landmarks[joint]?.visibility;
      if (v !== undefined) {
        visibilitySum += v;
        visibilityCount++;
      }
    }
  }

  const poseRatio = framesWithPose / timeline.length;
  const avgVisibility = visibilityCount > 0 ? visibilitySum / visibilityCount : 0;
  const score = Math.round((poseRatio * 0.7 + avgVisibility * 0.3) * 100);
  const usable = score >= 45 && framesWithPose >= 3;

  let message = "Movement tracking quality good.";
  if (score < 45) {
    message =
      "Limited movement tracking — use front/side angle, single athlete, full body in frame.";
  } else if (score < 70) {
    message = "Moderate movement tracking — overlays may be approximate in some frames.";
  }

  return {
    score,
    frames_total: timeline.length,
    frames_with_pose: framesWithPose,
    avg_visibility: Math.round(avgVisibility * 100) / 100,
    usable,
    message,
  };
}

/** Detect synthetic placeholder landmarks from old fallback path */
export function looksLikeSyntheticLandmarks(landmarks: FrameLandmarks): boolean {
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  if (!ls || !rs) return false;
  const ySpread = Math.abs(ls.y - rs.y);
  const xSpread = Math.abs(ls.x - rs.x);
  return ySpread < 0.001 && xSpread > 0.01 && ls.x > 0.4 && ls.x < 0.5;
}
