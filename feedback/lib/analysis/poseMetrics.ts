import type { ConfirmedPoseEvent, FrameLandmarks, SportId } from "@/types";

export type { ConfirmedPoseEvent };

export interface FrameMetrics {
  guard_dropped: boolean;
  left_elbow_angle: number | null;
  right_elbow_angle: number | null;
  hip_rotation_deg: number | null;
  chin_elevated: boolean;
  left_wrist_below_guard: boolean;
  right_wrist_below_guard: boolean;
}

function angleAtJoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAb = Math.hypot(ab.x, ab.y);
  const magCb = Math.hypot(cb.x, cb.y);
  if (magAb === 0 || magCb === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (magAb * magCb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Guard line uses nose-to-shoulder midpoint — more stable than shoulders alone */
export function getGuardLineY(landmarks: FrameLandmarks): number | null {
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const nose = landmarks.nose;
  if (!ls || !rs) return null;

  const shoulderMid = (ls.y + rs.y) / 2;
  if (nose) {
    return shoulderMid * 0.65 + nose.y * 0.35;
  }
  return shoulderMid;
}

export function computeFrameMetrics(landmarks: FrameLandmarks): FrameMetrics {
  const guardY = getGuardLineY(landmarks);
  const lw = landmarks.left_wrist;
  const rw = landmarks.right_wrist;
  const nose = landmarks.nose;
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const lh = landmarks.left_hip;
  const rh = landmarks.right_hip;

  const threshold = 0.015;
  const leftDown = guardY !== null && lw ? lw.y > guardY + threshold : false;
  const rightDown = guardY !== null && rw ? rw.y > guardY + threshold : false;

  let hipRotation: number | null = null;
  if (ls && rs && lh && rh) {
    const shoulderAngle = Math.atan2(rs.y - ls.y, rs.x - ls.x);
    const hipAngle = Math.atan2(rh.y - lh.y, rh.x - lh.x);
    hipRotation = Math.abs(((shoulderAngle - hipAngle) * 180) / Math.PI);
  }

  let chinElevated = false;
  if (nose && ls && rs) {
    const shoulderY = (ls.y + rs.y) / 2;
    chinElevated = nose.y < shoulderY - 0.06;
  }

  const leftElbow =
    ls && landmarks.left_elbow && lw
      ? angleAtJoint(ls, landmarks.left_elbow, lw)
      : null;
  const rightElbow =
    rs && landmarks.right_elbow && rw
      ? angleAtJoint(rs, landmarks.right_elbow, rw)
      : null;

  return {
    guard_dropped: leftDown || rightDown,
    left_elbow_angle: leftElbow,
    right_elbow_angle: rightElbow,
    hip_rotation_deg: hipRotation,
    chin_elevated: chinElevated,
    left_wrist_below_guard: leftDown,
    right_wrist_below_guard: rightDown,
  };
}

export function jointForWeakness(weaknessType: string): keyof FrameLandmarks {
  const map: Record<string, keyof FrameLandmarks> = {
    guard_drop_after_cross: "right_wrist",
    dropping_guard_on_kick: "left_wrist",
    elbow_flare_on_cross: "right_elbow",
    chin_up: "nose",
    chin_up_in_clinch: "nose",
    no_head_movement: "nose",
    no_pivot_on_roundhouse: "right_ankle",
    kicking_with_foot_not_shin: "right_ankle",
    overcommitting_weight: "right_hip",
    slow_guard_return: "right_wrist",
    square_stance: "left_hip",
  };
  return map[weaknessType] ?? "right_wrist";
}

export function humanLabelForWeakness(weaknessType: string): string {
  return weaknessType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isWeaknessConfirmedInFrame(
  weaknessType: string,
  metrics: FrameMetrics
): boolean {
  switch (weaknessType) {
    case "guard_drop_after_cross":
    case "dropping_guard_on_kick":
    case "slow_guard_return":
      return metrics.guard_dropped;
    case "elbow_flare_on_cross":
      return metrics.right_elbow_angle !== null && metrics.right_elbow_angle < 155;
    case "chin_up":
    case "chin_up_in_clinch":
      return metrics.chin_elevated;
    case "no_pivot_on_roundhouse":
      return metrics.hip_rotation_deg !== null && metrics.hip_rotation_deg < 25;
    case "overcommitting_weight":
      return metrics.hip_rotation_deg !== null && metrics.hip_rotation_deg > 55;
    default:
      return false;
  }
}

export function sportUsesLegSkeleton(sport: SportId): boolean {
  return sport === "muaythai" || sport === "mma" || sport === "football";
}
