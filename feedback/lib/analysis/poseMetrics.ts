import type { KickFrameState } from "./kickAnalysis";
import type { FrameLandmarks, LandmarkPoint, LandmarkTimeline } from "../../types";

export const MIN_JOINT_VISIBILITY = 0.5;
export const MIN_WRIST_VISIBILITY = 0.45;
const MIN_HIP_VIS = 0.45;
const MIN_KNEE_VIS = 0.42;
const MIN_ANKLE_VIS = 0.4;

export interface GuardCalibration {
  guardLineY: number;
  guardThreshold: number;
}

export interface FrameMetrics {
  guard_dropped: boolean;
  left_elbow_angle: number | null;
  right_elbow_angle: number | null;
  hip_rotation_deg: number | null;
  chin_elevated: boolean;
  left_wrist_below_guard: boolean;
  right_wrist_below_guard: boolean;
  /** 0–1 — visibility + measurement quality for guard call */
  guard_confidence: number;
  /** False when joints are occluded / low visibility — do not flag faults */
  metrics_reliable: boolean;
  /** Leg joints visible enough for kick analysis */
  leg_metrics_reliable: boolean;
  left_knee_lift: number | null;
  right_knee_lift: number | null;
  left_shin_angle: number | null;
  right_shin_angle: number | null;
}

function jointVisible(
  point: LandmarkPoint | undefined,
  min = MIN_JOINT_VISIBILITY
): boolean {
  return point !== undefined && (point.visibility ?? 1) >= min;
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
  if (nose && jointVisible(nose, 0.35)) {
    return shoulderMid * 0.65 + nose.y * 0.35;
  }
  return shoulderMid;
}

const DEFAULT_GUARD_THRESHOLD = 0.018;

/**
 * Learn personal guard height from early frames where both wrists sit above the line.
 */
export function calibrateGuardFromTimeline(
  timeline: LandmarkTimeline
): GuardCalibration | null {
  if (timeline.length < 6) return null;

  const sampleEnd = Math.min(
    timeline.length - 1,
    Math.max(8, Math.floor(timeline.length * 0.25))
  );

  const neutralYs: number[] = [];
  const wristDrops: number[] = [];

  for (let i = 0; i <= sampleEnd; i++) {
    const lm = timeline[i].landmarks;
    const guardY = getGuardLineY(lm);
    const lw = lm.left_wrist;
    const rw = lm.right_wrist;
    if (guardY === null || !lw || !rw) continue;
    if (!jointVisible(lw, MIN_WRIST_VISIBILITY) || !jointVisible(rw, MIN_WRIST_VISIBILITY)) {
      continue;
    }

    const leftAbove = lw.y < guardY + 0.01;
    const rightAbove = rw.y < guardY + 0.01;
    if (leftAbove && rightAbove) {
      neutralYs.push(guardY);
      wristDrops.push(
        Math.max(guardY - lw.y, guardY - rw.y)
      );
    }
  }

  if (neutralYs.length < 3) return null;

  const guardLineY =
    neutralYs.reduce((a, b) => a + b, 0) / neutralYs.length;
  const avgClearance =
    wristDrops.reduce((a, b) => a + b, 0) / wristDrops.length;
  const guardThreshold = Math.max(
    DEFAULT_GUARD_THRESHOLD,
    Math.min(0.035, avgClearance * 0.45)
  );

  return { guardLineY, guardThreshold };
}

export function computeFrameMetrics(
  landmarks: FrameLandmarks,
  calibration?: GuardCalibration | null
): FrameMetrics {
  const lw = landmarks.left_wrist;
  const rw = landmarks.right_wrist;
  const nose = landmarks.nose;
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const lh = landmarks.left_hip;
  const rh = landmarks.right_hip;

  const shouldersOk = jointVisible(ls) && jointVisible(rs);
  const leftWristOk = jointVisible(lw, MIN_WRIST_VISIBILITY);
  const rightWristOk = jointVisible(rw, MIN_WRIST_VISIBILITY);
  const metrics_reliable =
    shouldersOk && (leftWristOk || rightWristOk);

  const guardY =
    calibration?.guardLineY ?? getGuardLineY(landmarks);
  const threshold =
    calibration?.guardThreshold ?? DEFAULT_GUARD_THRESHOLD;

  const leftDown =
    guardY !== null && leftWristOk && lw
      ? lw.y > guardY + threshold
      : false;
  const rightDown =
    guardY !== null && rightWristOk && rw
      ? rw.y > guardY + threshold
      : false;

  let guard_confidence = 0;
  if (metrics_reliable && guardY !== null) {
    const vis =
      ((lw?.visibility ?? 0) + (rw?.visibility ?? 0) +
        (ls?.visibility ?? 0) +
        (rs?.visibility ?? 0)) /
      4;
    guard_confidence = Math.min(1, vis * (leftWristOk && rightWristOk ? 1 : 0.82));
  }

  let hipRotation: number | null = null;
  if (shouldersOk && jointVisible(lh) && jointVisible(rh) && ls && rs && lh && rh) {
    const shoulderAngle = Math.atan2(rs.y - ls.y, rs.x - ls.x);
    const hipAngle = Math.atan2(rh.y - lh.y, rh.x - lh.x);
    hipRotation = Math.abs(((shoulderAngle - hipAngle) * 180) / Math.PI);
  }

  let chinElevated = false;
  if (nose && ls && rs && jointVisible(nose, 0.4)) {
    const shoulderY = (ls.y + rs.y) / 2;
    chinElevated = nose.y < shoulderY - 0.06;
  }

  const leftElbow =
    ls && landmarks.left_elbow && lw && jointVisible(landmarks.left_elbow)
      ? angleAtJoint(ls, landmarks.left_elbow, lw)
      : null;
  const rightElbow =
    rs && landmarks.right_elbow && rw && jointVisible(landmarks.right_elbow)
      ? angleAtJoint(rs, landmarks.right_elbow, rw)
      : null;

  const guard_dropped =
    metrics_reliable && (leftDown || rightDown) && guard_confidence >= 0.42;

  const lk = landmarks.left_knee;
  const rk = landmarks.right_knee;
  const la = landmarks.left_ankle;
  const ra = landmarks.right_ankle;

  const leftLegOk =
    jointVisible(lh, MIN_HIP_VIS) &&
    jointVisible(lk, MIN_KNEE_VIS) &&
    jointVisible(la, MIN_ANKLE_VIS);
  const rightLegOk =
    jointVisible(rh, MIN_HIP_VIS) &&
    jointVisible(rk, MIN_KNEE_VIS) &&
    jointVisible(ra, MIN_ANKLE_VIS);
  const leg_metrics_reliable = leftLegOk || rightLegOk;

  const shinAngle = (
    knee: { x: number; y: number },
    ankle: { x: number; y: number }
  ) =>
    (Math.atan2(
      Math.abs(ankle.y - knee.y),
      Math.abs(ankle.x - knee.x) + 0.001
    ) *
      180) /
    Math.PI;

  const leftKneeLift =
    lh && lk && leftLegOk ? lh.y - lk.y : null;
  const rightKneeLift =
    rh && rk && rightLegOk ? rh.y - rk.y : null;
  const leftShin =
    lk && la && leftLegOk ? shinAngle(lk, la) : null;
  const rightShin =
    rk && ra && rightLegOk ? shinAngle(rk, ra) : null;

  return {
    guard_dropped,
    left_elbow_angle: leftElbow,
    right_elbow_angle: rightElbow,
    hip_rotation_deg: hipRotation,
    chin_elevated: chinElevated,
    left_wrist_below_guard: leftDown,
    right_wrist_below_guard: rightDown,
    guard_confidence,
    metrics_reliable,
    leg_metrics_reliable,
    left_knee_lift: leftKneeLift,
    right_knee_lift: rightKneeLift,
    left_shin_angle: leftShin,
    right_shin_angle: rightShin,
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
    no_chamber_on_knee: "right_knee",
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
  metrics: FrameMetrics,
  kick?: KickFrameState
): boolean {
  if (!metrics.metrics_reliable && !metrics.leg_metrics_reliable) return false;

  switch (weaknessType) {
    case "guard_drop_after_cross":
    case "dropping_guard_on_kick":
    case "slow_guard_return":
      return metrics.metrics_reliable && metrics.guard_dropped;
    case "elbow_flare_on_cross":
      return (
        metrics.metrics_reliable &&
        metrics.right_elbow_angle !== null &&
        metrics.right_elbow_angle < 152
      );
    case "chin_up":
    case "chin_up_in_clinch":
      return metrics.metrics_reliable && metrics.chin_elevated;
    case "no_pivot_on_roundhouse":
      return (
        metrics.leg_metrics_reliable &&
        (kick?.inExtension || kick?.atPeak) === true &&
        metrics.hip_rotation_deg !== null &&
        metrics.hip_rotation_deg < 26
      );
    case "kicking_with_foot_not_shin": {
      if (!kick?.atPeak || !kick.kickingLeg) return false;
      const shin =
        kick.kickingLeg === "left"
          ? metrics.left_shin_angle
          : metrics.right_shin_angle;
      return shin !== null && shin < 40;
    }
    case "no_chamber_on_knee": {
      if (!kick?.inChamber || !kick.kickingLeg) return false;
      const lift =
        kick.kickingLeg === "left"
          ? metrics.left_knee_lift
          : metrics.right_knee_lift;
      return lift !== null && lift < 0.042;
    }
    case "overcommitting_weight":
      return (
        metrics.metrics_reliable &&
        metrics.hip_rotation_deg !== null &&
        metrics.hip_rotation_deg > 58
      );
    default:
      return false;
  }
}

export function sportUsesLegSkeleton(sport: string): boolean {
  return sport === "muaythai" || sport === "mma" || sport === "football";
}
