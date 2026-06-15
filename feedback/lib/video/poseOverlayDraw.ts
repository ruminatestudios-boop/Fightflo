import type { FrameLandmarks } from "@/types";
import type { GuardCalibration } from "@/lib/analysis/poseMetrics";
import { getGuardLineY } from "@/lib/analysis/poseMetrics";
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
  wrist: "left_wrist" | "right_wrist",
  calibration?: GuardCalibration | null
): "good" | "bad" | "neutral" {
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
  const { layout, highlightedJoint } = options;
  if (!layout) return;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (const [fromJoint, toJoint] of POSE_CONNECTIONS) {
    const from = getLandmarkPoint(landmarks, fromJoint);
    const to = getLandmarkPoint(landmarks, toJoint);
    if (!from || !to) continue;
    if ((from.visibility ?? 1) < 0.25 || (to.visibility ?? 1) < 0.25) continue;

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
    if (!point || (point.visibility ?? 1) < 0.25) continue;

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
  ctx: CanvasRenderingContext2D,
  width: number,
  guardDropped: boolean,
  pulsePhase = 0,
  _prominent = false
) {
  if (!guardDropped) return;

  const alpha = 0.85 + Math.sin(pulsePhase * 4) * 0.15;

  ctx.save();
  ctx.fillStyle = `rgba(250, 65, 65, ${alpha})`;
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GUARD DOWN", width / 2, 28);
  ctx.restore();
}
