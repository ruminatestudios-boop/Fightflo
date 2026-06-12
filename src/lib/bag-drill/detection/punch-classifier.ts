import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { BagStance } from "../calibration";
import { LM } from "./constants";
import { chinY, elbowAngleDeg, isLeadHand, lm } from "./landmarks";
import type { VelocityHit } from "./wrist-velocity";

export type PunchTypeId =
  | "jab"
  | "cross"
  | "hook"
  | "uppercut"
  | "lead-hook"
  | "rear-hook"
  | "lead-uppercut"
  | "rear-uppercut";

export interface ClassifiedPunch {
  strikeId: string;
  punchNumber: number;
  confidence: number;
  side: "left" | "right";
  label: string;
}

export function classifyPunch(
  landmarks: NormalizedLandmark[],
  stance: BagStance,
  velocity: VelocityHit,
  width: number,
  height: number
): ClassifiedPunch | null {
  const side = velocity.side;
  const shoulder = lm(landmarks, side === "left" ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER);
  const elbow = lm(landmarks, side === "left" ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW);
  const wrist = lm(landmarks, side === "left" ? LM.LEFT_WRIST : LM.RIGHT_WRIST);
  const hip = lm(landmarks, side === "left" ? LM.LEFT_HIP : LM.RIGHT_HIP);
  const otherHip = lm(landmarks, side === "left" ? LM.RIGHT_HIP : LM.LEFT_HIP);
  const heel = lm(landmarks, side === "left" ? LM.LEFT_HEEL : LM.RIGHT_HEEL);

  if (!shoulder || !elbow || !wrist) return null;

  const lead = isLeadHand(side, stance);
  let confidence = 40;
  const angle = elbowAngleDeg(shoulder, elbow, wrist, width, height);
  const shoulderMidX = ((landmarks[LM.LEFT_SHOULDER]?.x ?? 0) + (landmarks[LM.RIGHT_SHOULDER]?.x ?? 0)) / 2;
  const wristX = wrist.x;
  const wristY = wrist.y * height;
  const chin = chinY(landmarks, height);
  const forwardZ = (wrist.z ?? 0) < (shoulder.z ?? 0);

  const lateralMove = Math.abs(wristX - shoulder.x) > 0.08;
  const upwardMove = wristY < chin * 0.98;

  let strikeId: PunchTypeId = lead ? "jab" : "cross";
  let punchNumber = lead ? 1 : 2;
  let label = lead ? "JAB" : "CROSS";

  if (angle > 150 && forwardZ && Math.abs(wristX - shoulderMidX) < 0.15) {
    confidence += 20;
    strikeId = lead ? "jab" : "cross";
    punchNumber = lead ? 1 : 2;
    label = lead ? "JAB" : "CROSS";
    if (!lead && hip && otherHip) {
      const hipRot = Math.abs(hip.z - otherHip.z);
      if (hipRot > 0.015) confidence += 20;
      if (heel && (heel.y < (hip.y ?? 0))) confidence += 10;
    }
    if (velocity.pxPerFrame > 25) confidence += 20;
  } else if (angle >= 70 && angle <= 110 && lateralMove) {
    confidence += 20;
    strikeId = lead ? "lead-hook" : "rear-hook";
    punchNumber = lead ? 3 : 4;
    label = "HOOK";
    if (Math.abs(wristY - chin) < height * 0.12) confidence += 20;
    if (velocity.pxPerFrame > 25) confidence += 20;
  } else if (angle < 90 && upwardMove) {
    confidence += 20;
    strikeId = lead ? "lead-uppercut" : "rear-uppercut";
    punchNumber = lead ? 5 : 6;
    label = "UPPERCUT";
    if (wristY < elbow.y * height) confidence += 20;
    if (velocity.pxPerFrame > 25) confidence += 20;
  } else {
    strikeId = lead ? "jab" : "cross";
    punchNumber = lead ? 1 : 2;
    label = lead ? "JAB" : "CROSS";
    if (angle > 130) confidence += 15;
    if (velocity.pxPerFrame > 25) confidence += 15;
  }

  const normalizedId =
    strikeId.includes("hook") ? "hook" : strikeId.includes("upper") ? "uppercut" : strikeId;

  return {
    strikeId: normalizedId,
    punchNumber,
    confidence: Math.min(100, confidence),
    side,
    label,
  };
}
