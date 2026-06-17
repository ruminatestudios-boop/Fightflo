import type { FrameLandmarks } from "@/types";
import type { GuardCalibration } from "@/lib/analysis/poseMetrics";
import { getGuardLineY } from "@/lib/analysis/poseMetrics";
import { POSE_SKELETON_MIN_VISIBILITY } from "@/lib/pose/mediapipePose";
import { getLandmarkPoint } from "@/components/video/utils";
import {
  mapLandmarkToCanvas,
  type VideoContentRect,
} from "@/components/video/videoLayout";

export interface SkeletonDrawOptions {
  width: number;
  height: number;
  guardDropped?: boolean;
  highlightedJoint?: keyof FrameLandmarks;
  flashGuardLine?: boolean;
  layout?: VideoContentRect;
  pulsePhase?: number;
  guardCalibration?: GuardCalibration | null;
  /** Export burn uses a lower visibility cutoff than live playback */
  minVisibility?: number;
}

/** Upper body + legs for combat sports */
export const POSE_CONNECTIONS: [keyof FrameLandmarks, keyof FrameLandmarks][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

function toCanvasPoint(
  point: { x: number; y: number },
  layout: VideoContentRect
) {
  return mapLandmarkToCanvas(point, layout);
}

function wristGuardState(
  landmarks: FrameLandmarks,
  wrist: keyof FrameLandmarks,
  calibration?: GuardCalibration | null
): "good" | "bad" | "neutral" {
  if (wrist !== "left_wrist" && wrist !== "right_wrist") return "neutral";
  const guardY = calibration?.guardLineY ?? getGuardLineY(landmarks);
  const threshold = calibration?.guardThreshold ?? 0.018;
  const wristPoint = landmarks[wrist];
  if (guardY === null || !wristPoint) return "neutral";
  return wristPoint.y > guardY + threshold ? "bad" : "good";
}

export function drawGuardLine(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  options: SkeletonDrawOptions
) {
  const guardY =
    options.guardCalibration?.guardLineY ?? getGuardLineY(landmarks);
  if (guardY === null || !options.layout) return;

  const canvasY = toCanvasPoint({ x: 0, y: guardY }, options.layout).y;
  const flash = options.flashGuardLine ?? options.guardDropped;

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = flash ? 2.5 : 1.5;
  ctx.strokeStyle = flash
    ? "rgba(250, 65, 65, 0.95)"
    : "rgba(255, 255, 255, 0.45)";
  ctx.beginPath();
  ctx.moveTo(options.layout.offsetX, canvasY);
  ctx.lineTo(options.layout.offsetX + options.layout.drawWidth, canvasY);
  ctx.stroke();
  ctx.restore();
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  options: SkeletonDrawOptions
) {
  const { layout, highlightedJoint, minVisibility = POSE_SKELETON_MIN_VISIBILITY } = options;
  if (!layout) return;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (const [fromJoint, toJoint] of POSE_CONNECTIONS) {
    const from = getLandmarkPoint(landmarks, fromJoint);
    const to = getLandmarkPoint(landmarks, toJoint);
    if (!from || !to) continue;
    if ((from.visibility ?? 1) < minVisibility || (to.visibility ?? 1) < minVisibility) {
      continue;
    }

    const p1 = toCanvasPoint(from, layout);
    const p2 = toCanvasPoint(to, layout);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  const joints: (keyof FrameLandmarks)[] = [
    "nose",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
  ];

  for (const joint of joints) {
    const point = getLandmarkPoint(landmarks, joint);
    if (!point || (point.visibility ?? 1) < minVisibility) continue;

    const { x, y } = toCanvasPoint(point, layout);
    let fill = "rgba(255, 255, 255, 0.95)";

    if (joint === "left_wrist" || joint === "right_wrist") {
      const state = wristGuardState(landmarks, joint, options.guardCalibration);
      fill =
        state === "bad" ? "#fa4141" : state === "good" ? "#22c55e" : fill;
    }

    if (highlightedJoint === joint) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, joint.includes("wrist") ? 5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  ctx.restore();
}

export interface WristTrailPoint {
  x: number;
  y: number;
  age: number;
}

export function drawMotionTrails(
  ctx: CanvasRenderingContext2D,
  trails: { left: WristTrailPoint[]; right: WristTrailPoint[] }
) {
  ctx.save();
  ctx.lineCap = "round";

  for (const [color, points] of [
    ["rgba(34, 197, 94, 0.7)", trails.left],
    ["rgba(250, 65, 65, 0.7)", trails.right],
  ] as const) {
    if (points.length < 2) continue;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const alpha = 1 - b.age / 12;
      ctx.strokeStyle = color.replace("0.7", String(Math.max(0.1, alpha * 0.7)));
      ctx.lineWidth = 2 + (1 - b.age / 12) * 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Guard-only overlay — hands and guard line, no full skeleton */
/** Pulsing ring on a single joint — live shadow / cinema callouts */
export function drawJointHighlight(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  options: SkeletonDrawOptions & { kind?: "issue" | "positive" }
) {
  const { layout, highlightedJoint, pulsePhase = 0, kind = "issue", minVisibility = POSE_SKELETON_MIN_VISIBILITY } =
    options;
  if (!layout || !highlightedJoint) return;

  const point = getLandmarkPoint(landmarks, highlightedJoint);
  if (!point || (point.visibility ?? 1) < minVisibility) return;

  const { x, y } = toCanvasPoint(point, layout);
  const pulse = 0.85 + Math.sin(pulsePhase * 4) * 0.15;
  const ringColor =
    kind === "positive"
      ? `rgba(34, 197, 94, ${0.95 * pulse})`
      : `rgba(250, 204, 21, ${0.95 * pulse})`;
  const glowColor =
    kind === "positive"
      ? `rgba(34, 197, 94, ${0.35 * pulse})`
      : `rgba(250, 65, 65, ${0.4 * pulse})`;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 18 + Math.sin(pulsePhase * 3) * 2, 0, Math.PI * 2);
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle =
    kind === "positive" ? "rgba(34, 197, 94, 0.95)" : "rgba(250, 204, 21, 0.95)";
  ctx.fill();
  ctx.restore();
}

export function drawGuardHandsOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  options: SkeletonDrawOptions
) {
  const { layout, pulsePhase = 0 } = options;
  if (!layout) return;

  for (const side of ["left", "right"] as const) {
    const wristKey: "left_wrist" | "right_wrist" = `${side}_wrist`;
    const elbowKey: "left_elbow" | "right_elbow" = `${side}_elbow`;
    const wrist = getLandmarkPoint(landmarks, wristKey);
    const elbow = getLandmarkPoint(landmarks, elbowKey);
    if (!wrist || !elbow) continue;
    if ((wrist.visibility ?? 1) < POSE_SKELETON_MIN_VISIBILITY || (elbow.visibility ?? 1) < POSE_SKELETON_MIN_VISIBILITY) continue;

    const state = wristGuardState(landmarks, wristKey, options.guardCalibration);
    const bad = state === "bad";
    const pulse = bad ? 0.85 + Math.sin(pulsePhase * 4) * 0.15 : 1;
    const color = bad
      ? `rgba(250, 65, 65, ${pulse})`
      : "rgba(34, 197, 94, 0.88)";

    const wp = toCanvasPoint(wrist, layout);
    const ep = toCanvasPoint(elbow, layout);

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = bad ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(ep.x, ep.y);
    ctx.lineTo(wp.x, wp.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(wp.x, wp.y, bad ? 11 : 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (bad) {
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 16 + Math.sin(pulsePhase * 3) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(250, 65, 65, ${0.45 * pulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }
}

export function drawBiomechanics(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect,
  metrics: {
    right_elbow_angle: number | null;
    left_elbow_angle: number | null;
    hip_rotation_deg: number | null;
    metrics_reliable?: boolean;
  },
  _guardCalibration?: GuardCalibration | null
) {
  if (metrics.metrics_reliable === false) return;
  ctx.save();
  ctx.font = "600 10px monospace";

  const re = landmarks.right_elbow;
  const rw = landmarks.right_wrist;

  if (re && rw && metrics.right_elbow_angle !== null) {
    const elbow = toCanvasPoint(re, layout);
    const ext = metrics.right_elbow_angle;
    const color = ext >= 165 ? "#22c55e" : ext >= 150 ? "#facc15" : "#fa4141";

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(elbow.x, elbow.y, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(ext)}°`, elbow.x + 22, elbow.y + 4);
  }

  if (metrics.hip_rotation_deg !== null) {
    const lh = landmarks.left_hip;
    const rh = landmarks.right_hip;
    if (lh && rh) {
      const mid = toCanvasPoint(
        { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 },
        layout
      );
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.textAlign = "center";
      ctx.fillText(
        `HIP ${Math.round(metrics.hip_rotation_deg)}°`,
        mid.x,
        mid.y + 28
      );
    }
  }

  ctx.restore();
}

export function drawGuardWarning(
  _ctx: CanvasRenderingContext2D,
  _width: number,
  _guardDropped: boolean,
  _pulsePhase = 0,
  _prominent = false
) {
  // Guard drop is indicated by the red guard line — no on-video label.
}
