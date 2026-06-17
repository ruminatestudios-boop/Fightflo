import type { FrameLandmarks } from "@/types";
import type { FrameMetrics, GuardCalibration } from "@/lib/analysis/poseMetrics";
import { getGuardLineY } from "@/lib/analysis/poseMetrics";
import { getLandmarkPoint } from "@/components/video/utils";
import {
  mapLandmarkToCanvas,
  type VideoContentRect,
} from "@/components/video/videoLayout";
import type { SkeletonDrawOptions, WristTrailPoint } from "./poseOverlayDraw";
import { POSE_SKELETON_MIN_VISIBILITY } from "@/lib/pose/mediapipePose";
import {
  drawGuardLine,
  drawJointHighlight,
  drawMotionTrails,
} from "./poseOverlayDraw";

function toCanvas(
  point: { x: number; y: number },
  layout: VideoContentRect
) {
  return mapLandmarkToCanvas(point, layout);
}

function jointVisible(
  point: { visibility?: number } | undefined,
  min = POSE_SKELETON_MIN_VISIBILITY
): boolean {
  return point !== undefined && (point.visibility ?? 1) >= min;
}

/** Shoulder → elbow → wrist chains — locks to arms without full skeleton */
function drawShadowArmChains(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect,
  calibration: GuardCalibration | null | undefined,
  pulsePhase: number
) {
  for (const side of ["left", "right"] as const) {
    const shoulderKey: "left_shoulder" | "right_shoulder" = `${side}_shoulder`;
    const elbowKey: "left_elbow" | "right_elbow" = `${side}_elbow`;
    const wristKey: "left_wrist" | "right_wrist" = `${side}_wrist`;

    const shoulder = getLandmarkPoint(landmarks, shoulderKey);
    const elbow = getLandmarkPoint(landmarks, elbowKey);
    const wrist = getLandmarkPoint(landmarks, wristKey);
    if (!shoulder || !elbow || !wrist) continue;
    if (![shoulder, elbow, wrist].every((p) => jointVisible(p, 0.22))) continue;

    const sp = toCanvas(shoulder, layout);
    const ep = toCanvas(elbow, layout);
    const wp = toCanvas(wrist, layout);

    const guardY = calibration?.guardLineY ?? getGuardLineY(landmarks);
    const threshold = calibration?.guardThreshold ?? 0.018;
    const bad =
      guardY !== null && wrist.y > guardY + threshold;
    const pulse = bad ? 0.85 + Math.sin(pulsePhase * 4) * 0.15 : 1;
    const color = bad
      ? `rgba(250, 65, 65, ${pulse})`
      : "rgba(34, 197, 94, 0.9)";

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = bad ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(ep.x, ep.y);
    ctx.lineTo(wp.x, wp.y);
    ctx.stroke();

    for (const [px, py, radius] of [
      [sp.x, sp.y, 5],
      [ep.x, ep.y, 6],
      [wp.x, wp.y, bad ? 10 : 8],
    ] as const) {
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    if (bad) {
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 18 + Math.sin(pulsePhase * 3) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(250, 65, 65, ${0.45 * pulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }
}

/** Subtle shoulder bar — reference without torso skeleton */
function drawShoulderBar(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect
) {
  const ls = getLandmarkPoint(landmarks, "left_shoulder");
  const rs = getLandmarkPoint(landmarks, "right_shoulder");
  if (!ls || !rs || !jointVisible(ls) || !jointVisible(rs)) return;

  const pLS = toCanvas(ls, layout);
  const pRS = toCanvas(rs, layout);

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pLS.x, pLS.y);
  ctx.lineTo(pRS.x, pRS.y);
  ctx.stroke();
  ctx.restore();
}

/** Subtle band between guard line and head */
function drawGuardZoneBand(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect,
  calibration: GuardCalibration | null | undefined,
  metrics: FrameMetrics
) {
  const guardY =
    calibration?.guardLineY ?? getGuardLineY(landmarks);
  const nose = getLandmarkPoint(landmarks, "nose");
  if (guardY === null || !nose || !jointVisible(nose, 0.35)) return;

  const topY = Math.min(guardY, nose.y);
  const bottomY = Math.max(guardY, nose.y);
  const topCanvas = toCanvas({ x: 0, y: topY }, layout).y;
  const bottomCanvas = toCanvas({ x: 0, y: bottomY }, layout).y;
  const height = bottomCanvas - topCanvas;
  if (height < 4) return;

  const dropped = metrics.guard_dropped;
  ctx.save();
  ctx.fillStyle = dropped
    ? "rgba(250, 65, 65, 0.07)"
    : "rgba(34, 197, 94, 0.05)";
  ctx.fillRect(layout.offsetX, topCanvas, layout.drawWidth, height);
  ctx.restore();
}

/** Nose anchor — head position without drawing a face mesh */
function drawNoseAnchor(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect
) {
  const nose = getLandmarkPoint(landmarks, "nose");
  if (!nose || !jointVisible(nose, 0.35)) return;
  const { x, y } = toCanvas(nose, layout);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fill();
  ctx.restore();
}

/** Chin tuck indicator — nose to shoulder midpoint */
function drawChinLine(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect,
  metrics: FrameMetrics,
  pulsePhase: number,
  emphasized: boolean
) {
  const nose = getLandmarkPoint(landmarks, "nose");
  const ls = getLandmarkPoint(landmarks, "left_shoulder");
  const rs = getLandmarkPoint(landmarks, "right_shoulder");
  if (!nose || !ls || !rs) return;
  if (!jointVisible(nose, 0.35)) return;

  const mid = {
    x: (ls.x + rs.x) / 2,
    y: (ls.y + rs.y) / 2,
  };
  const pN = toCanvas(nose, layout);
  const pM = toCanvas(mid, layout);
  const bad = metrics.chin_elevated;
  const pulse = 0.85 + Math.sin(pulsePhase * 4) * 0.15;

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = bad
    ? `rgba(250, 65, 65, ${(emphasized ? 0.95 : 0.7) * pulse})`
    : emphasized
      ? "rgba(34, 197, 94, 0.85)"
      : "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = emphasized ? 3 : 2;
  ctx.setLineDash(bad ? [] : [4, 4]);
  ctx.beginPath();
  ctx.moveTo(pN.x, pN.y);
  ctx.lineTo(pM.x, pM.y);
  ctx.stroke();
  ctx.restore();
}

/** Shoulder line vs hip line — rotation at a glance */
function drawHipRotationWedge(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect,
  metrics: FrameMetrics,
  pulsePhase: number,
  emphasized: boolean
) {
  const ls = getLandmarkPoint(landmarks, "left_shoulder");
  const rs = getLandmarkPoint(landmarks, "right_shoulder");
  const lh = getLandmarkPoint(landmarks, "left_hip");
  const rh = getLandmarkPoint(landmarks, "right_hip");
  if (!ls || !rs || !lh || !rh) return;

  const pLS = toCanvas(ls, layout);
  const pRS = toCanvas(rs, layout);
  const pLH = toCanvas(lh, layout);
  const pRH = toCanvas(rh, layout);
  const mid = {
    x: (pLS.x + pRS.x + pLH.x + pRH.x) / 4,
    y: (pLS.y + pRS.y + pLH.y + pRH.y) / 4,
  };

  const hipTurn = metrics.hip_rotation_deg;
  if (hipTurn === null || !metrics.metrics_reliable) return;

  const flat = hipTurn < 14;
  const good = hipTurn >= 26;
  const pulse = 0.85 + Math.sin(pulsePhase * 3) * 0.15;
  const shoulderColor = emphasized && good
    ? "rgba(34, 197, 94, 0.9)"
    : "rgba(255, 255, 255, 0.5)";
  const hipColor =
    flat && emphasized
      ? `rgba(250, 65, 65, ${0.9 * pulse})`
      : good && emphasized
        ? "rgba(34, 197, 94, 0.75)"
        : flat
          ? `rgba(250, 65, 65, ${0.55 * pulse})`
          : "rgba(250, 204, 21, 0.55)";

  ctx.save();
  ctx.lineCap = "round";

  ctx.strokeStyle = shoulderColor;
  ctx.lineWidth = emphasized ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(pLS.x, pLS.y);
  ctx.lineTo(pRS.x, pRS.y);
  ctx.stroke();

  ctx.strokeStyle = hipColor;
  ctx.lineWidth = emphasized ? 3.5 : 2.5;
  ctx.beginPath();
  ctx.moveTo(pLH.x, pLH.y);
  ctx.lineTo(pRH.x, pRH.y);
  ctx.stroke();

  if (emphasized && (flat || good)) {
    const shoulderAngle = Math.atan2(pRS.y - pLS.y, pRS.x - pLS.x);
    const hipAngle = Math.atan2(pRH.y - pLH.y, pRH.x - pLH.x);
    const radius = 22;
    ctx.strokeStyle = good
      ? "rgba(34, 197, 94, 0.65)"
      : `rgba(250, 65, 65, ${0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, radius, hipAngle, shoulderAngle, shoulderAngle > hipAngle);
    ctx.stroke();
  }

  ctx.restore();
}

/** Elbow tuck arc — no degree labels on live shadow */
function drawElbowArcs(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect,
  metrics: FrameMetrics,
  highlightJoint: keyof FrameLandmarks | null,
  pulsePhase: number
) {
  if (!metrics.metrics_reliable) return;

  const sides: Array<{
    elbow: "left_elbow" | "right_elbow";
    angle: number | null;
  }> = [
    { elbow: "right_elbow", angle: metrics.right_elbow_angle },
    { elbow: "left_elbow", angle: metrics.left_elbow_angle },
  ];

  for (const { elbow, angle } of sides) {
    if (angle === null) continue;
    const point = getLandmarkPoint(landmarks, elbow);
    if (!point || !jointVisible(point)) continue;

    const flared = angle < 152;
    const emphasized = highlightJoint === elbow;
    if (!flared && !emphasized) continue;

    const { x, y } = toCanvas(point, layout);
    const pulse = 0.85 + Math.sin(pulsePhase * 4) * 0.15;
    const color = flared
      ? `rgba(250, 65, 65, ${(emphasized ? 0.95 : 0.65) * pulse})`
      : "rgba(34, 197, 94, 0.8)";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = emphasized ? 2.5 : 1.75;
    ctx.beginPath();
    ctx.arc(x, y, emphasized ? 22 : 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** Upward arrow when wrist sits below guard line */
function drawGuardReturnArrows(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect,
  calibration: GuardCalibration | null | undefined,
  metrics: FrameMetrics,
  highlightJoint: keyof FrameLandmarks | null,
  pulsePhase: number
) {
  const guardY =
    calibration?.guardLineY ?? getGuardLineY(landmarks);
  if (guardY === null) return;

  const guardCanvasY = toCanvas({ x: 0, y: guardY }, layout).y;

  for (const wristKey of ["left_wrist", "right_wrist"] as const) {
    const below =
      wristKey === "left_wrist"
        ? metrics.left_wrist_below_guard
        : metrics.right_wrist_below_guard;
    if (!below) continue;

    const wrist = getLandmarkPoint(landmarks, wristKey);
    if (!wrist || !jointVisible(wrist, 0.35)) continue;

    const wp = toCanvas(wrist, layout);
    const emphasized = highlightJoint === wristKey;
    const pulse = 0.85 + Math.sin(pulsePhase * 4) * 0.15;
    const arrowTop = guardCanvasY + 6;
    const arrowBottom = wp.y - 8;
    if (arrowBottom <= arrowTop) continue;

    ctx.save();
    ctx.strokeStyle = `rgba(250, 65, 65, ${(emphasized ? 0.95 : 0.72) * pulse})`;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = emphasized ? 3 : 2;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(wp.x, arrowBottom);
    ctx.lineTo(wp.x, arrowTop);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(wp.x, arrowTop);
    ctx.lineTo(wp.x - 6, arrowTop + 10);
    ctx.lineTo(wp.x + 6, arrowTop + 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** Hip joint markers — rotation cue without leg skeleton */
function drawHipMarkers(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect,
  metrics: FrameMetrics,
  pulsePhase: number
) {
  if (!metrics.metrics_reliable || metrics.hip_rotation_deg === null) return;

  const flat = metrics.hip_rotation_deg < 14;
  const good = metrics.hip_rotation_deg >= 26;
  const pulse = 0.85 + Math.sin(pulsePhase * 3) * 0.15;

  for (const hipKey of ["left_hip", "right_hip"] as const) {
    const hip = getLandmarkPoint(landmarks, hipKey);
    if (!hip || !jointVisible(hip, 0.3)) continue;

    const { x, y } = toCanvas(hip, layout);
    const color = flat
      ? `rgba(250, 65, 65, ${0.9 * pulse})`
      : good
        ? "rgba(34, 197, 94, 0.9)"
        : "rgba(250, 204, 21, 0.75)";

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, flat || good ? 8 : 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
}

/** Ankle baseline — stance width without leg skeleton */
function drawStanceBaseline(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  layout: VideoContentRect
) {
  const la = getLandmarkPoint(landmarks, "left_ankle");
  const ra = getLandmarkPoint(landmarks, "right_ankle");
  if (!la || !ra || !jointVisible(la, 0.3) || !jointVisible(ra, 0.3)) return;

  const pL = toCanvas(la, layout);
  const pR = toCanvas(ra, layout);

  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pL.x, pL.y);
  ctx.lineTo(pR.x, pR.y);
  ctx.stroke();
  ctx.restore();
}

export interface ShadowCoachingOverlayOptions extends SkeletonDrawOptions {
  metrics: FrameMetrics;
  highlightJoint?: keyof FrameLandmarks | null;
  highlightKind?: "issue" | "positive";
  wristTrails?: { left: WristTrailPoint[]; right: WristTrailPoint[] };
}

/**
 * Shadowboxing coaching overlay — no full skeleton.
 * Arm chains + contextual markers driven by live metrics + callout joint.
 */
export function drawShadowCoachingOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: FrameLandmarks,
  options: ShadowCoachingOverlayOptions
) {
  const {
    layout,
    metrics,
    guardCalibration,
    guardDropped,
    pulsePhase = 0,
    highlightJoint = null,
    highlightKind = "issue",
    wristTrails,
    width = 0,
    height = 0,
  } = options;
  if (!layout) return;

  const emphasizeChin =
    highlightJoint === "nose" ||
    metrics.chin_elevated;
  const emphasizeHips =
    highlightJoint === "left_hip" ||
    highlightJoint === "right_hip" ||
    (metrics.hip_rotation_deg !== null &&
      (metrics.hip_rotation_deg < 14 || metrics.hip_rotation_deg >= 26));

  drawGuardZoneBand(ctx, landmarks, layout, guardCalibration, metrics);
  drawShoulderBar(ctx, landmarks, layout);
  drawStanceBaseline(ctx, landmarks, layout);

  drawGuardLine(ctx, landmarks, {
    width,
    height,
    layout,
    guardDropped,
    flashGuardLine: guardDropped,
    pulsePhase,
    guardCalibration,
  });

  drawHipRotationWedge(
    ctx,
    landmarks,
    layout,
    metrics,
    pulsePhase,
    emphasizeHips
  );
  drawHipMarkers(ctx, landmarks, layout, metrics, pulsePhase);
  drawChinLine(ctx, landmarks, layout, metrics, pulsePhase, emphasizeChin);
  drawShadowArmChains(ctx, landmarks, layout, guardCalibration, pulsePhase);
  drawElbowArcs(ctx, landmarks, layout, metrics, highlightJoint, pulsePhase);
  drawGuardReturnArrows(
    ctx,
    landmarks,
    layout,
    guardCalibration,
    metrics,
    highlightJoint,
    pulsePhase
  );

  if (wristTrails) {
    drawMotionTrails(ctx, wristTrails);
  }

  drawNoseAnchor(ctx, landmarks, layout);

  if (highlightJoint) {
    drawJointHighlight(ctx, landmarks, {
      width,
      height,
      layout,
      highlightedJoint: highlightJoint,
      pulsePhase,
      kind: highlightKind,
    });
  }
}
