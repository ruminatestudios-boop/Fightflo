import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { LM } from "./constants";

export interface PoseFrame {
  landmarks: NormalizedLandmark[];
  timestampMs: number;
}

export function lm(
  landmarks: NormalizedLandmark[] | undefined,
  index: number
): NormalizedLandmark | null {
  if (!landmarks?.[index]) return null;
  const p = landmarks[index];
  if ((p.visibility ?? 0) < 0.5) return null;
  return p;
}

export function dist2d(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  width: number,
  height: number
): number {
  const ax = a.x * width;
  const ay = a.y * height;
  const bx = b.x * width;
  const by = b.y * height;
  return Math.hypot(ax - bx, ay - by);
}

export function elbowAngleDeg(
  shoulder: NormalizedLandmark,
  elbow: NormalizedLandmark,
  wrist: NormalizedLandmark,
  width: number,
  height: number
): number {
  const sx = shoulder.x * width;
  const sy = shoulder.y * height;
  const ex = elbow.x * width;
  const ey = elbow.y * height;
  const wx = wrist.x * width;
  const wy = wrist.y * height;
  const a1 = Math.atan2(sy - ey, sx - ex);
  const a2 = Math.atan2(wy - ey, wx - ex);
  let deg = ((a2 - a1) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  if (deg > 180) deg = 360 - deg;
  return deg;
}

export function detectStance(landmarks: NormalizedLandmark[]): "orthodox" | "southpaw" {
  const ls = lm(landmarks, LM.LEFT_SHOULDER);
  const rs = lm(landmarks, LM.RIGHT_SHOULDER);
  if (!ls || !rs) return "orthodox";
  // Camera-facing: forward shoulder has smaller x in mirrored front cam; use z if available
  const lz = ls.z ?? 0;
  const rz = rs.z ?? 0;
  if (Math.abs(lz - rz) > 0.02) {
    return lz < rz ? "southpaw" : "orthodox";
  }
  return ls.x < rs.x ? "orthodox" : "southpaw";
}

export function chinY(landmarks: NormalizedLandmark[], height: number): number {
  const ls = lm(landmarks, LM.LEFT_SHOULDER);
  const rs = lm(landmarks, LM.RIGHT_SHOULDER);
  if (!ls || !rs) return height * 0.35;
  return ((ls.y + rs.y) / 2) * height * 0.92;
}

export function bodyVisible(landmarks: NormalizedLandmark[]): boolean {
  const required = [
    LM.LEFT_SHOULDER,
    LM.RIGHT_SHOULDER,
    LM.LEFT_WRIST,
    LM.RIGHT_WRIST,
    LM.LEFT_HIP,
    LM.RIGHT_HIP,
  ];
  return required.every((i) => (landmarks[i]?.visibility ?? 0) >= 0.6);
}

export type CameraAngleIssue = "too_profile" | "too_frontal" | null;

/** ~45° three-quarter view: both shoulders visible, arms readable when punching. */
export function cameraAngleStatus(landmarks: NormalizedLandmark[]): {
  ok: boolean;
  issue: CameraAngleIssue;
} {
  const ls = lm(landmarks, LM.LEFT_SHOULDER);
  const rs = lm(landmarks, LM.RIGHT_SHOULDER);
  if (!ls || !rs) return { ok: false, issue: null };

  const span = Math.abs(rs.x - ls.x);
  if (span < 0.14) return { ok: false, issue: "too_profile" };
  if (span > 0.46) return { ok: false, issue: "too_frontal" };
  return { ok: true, issue: null };
}

export function isLeadHand(
  side: "left" | "right",
  stance: "orthodox" | "southpaw"
): boolean {
  if (stance === "orthodox") return side === "left";
  return side === "right";
}
