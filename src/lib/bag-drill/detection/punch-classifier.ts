import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { BagStance } from "../calibration";
import { HAND_LM, LM, TEMPORAL_MIN_FRAMES } from "./constants";
import { handForStrikeSide } from "./hand-landmarker";
import { chinY, elbowAngleDeg, isLeadHand, lm } from "./landmarks";
import type { MotionFrame } from "./temporal-motion-buffer";
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

interface FrameVote {
  strikeId: PunchTypeId;
  punchNumber: number;
  label: string;
  confidence: number;
}

function normalizeStrikeId(strikeId: PunchTypeId): string {
  if (strikeId.includes("hook")) return "hook";
  if (strikeId.includes("upper")) return "uppercut";
  return strikeId;
}

function scoreFrame(
  landmarks: NormalizedLandmark[],
  stance: BagStance,
  velocity: VelocityHit,
  width: number,
  height: number,
  hand: NormalizedLandmark[] | null
): FrameVote | null {
  const side = velocity.side;
  const shoulder = lm(
    landmarks,
    side === "left" ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER
  );
  const elbow = lm(landmarks, side === "left" ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW);
  const wrist = lm(landmarks, side === "left" ? LM.LEFT_WRIST : LM.RIGHT_WRIST);
  const hip = lm(landmarks, side === "left" ? LM.LEFT_HIP : LM.RIGHT_HIP);
  const otherHip = lm(landmarks, side === "left" ? LM.RIGHT_HIP : LM.LEFT_HIP);
  const heel = lm(landmarks, side === "left" ? LM.LEFT_HEEL : LM.RIGHT_HEEL);

  if (!shoulder || !elbow || !wrist) return null;

  const lead = isLeadHand(side, stance);
  let confidence = 42;
  const angle = elbowAngleDeg(shoulder, elbow, wrist, width, height);
  const shoulderMidX =
    ((landmarks[LM.LEFT_SHOULDER]?.x ?? 0) +
      (landmarks[LM.RIGHT_SHOULDER]?.x ?? 0)) /
    2;
  const wristX = wrist.x;
  const wristY = wrist.y * height;
  const chin = chinY(landmarks, height);
  const forwardZ = (wrist.z ?? 0) < (shoulder.z ?? 0);

  const lateralMove = Math.abs(wristX - shoulder.x) > 0.07;
  const upwardMove = wristY < chin * 0.98;

  let strikeId: PunchTypeId = lead ? "jab" : "cross";
  let punchNumber = lead ? 1 : 2;
  let label = lead ? "JAB" : "CROSS";

  if (angle > 148 && forwardZ && Math.abs(wristX - shoulderMidX) < 0.16) {
    confidence += 18;
    strikeId = lead ? "jab" : "cross";
    punchNumber = lead ? 1 : 2;
    label = lead ? "JAB" : "CROSS";
    if (!lead && hip && otherHip) {
      const hipRot = Math.abs(hip.z - otherHip.z);
      if (hipRot > 0.012) confidence += 18;
      if (heel && heel.y < (hip.y ?? 0)) confidence += 8;
    }
    if (velocity.pxPerFrame > 22) confidence += 16;
  } else if (angle >= 68 && angle <= 112 && lateralMove) {
    confidence += 18;
    strikeId = lead ? "lead-hook" : "rear-hook";
    punchNumber = lead ? 3 : 4;
    label = "HOOK";
    if (Math.abs(wristY - chin) < height * 0.13) confidence += 16;
    if (velocity.pxPerFrame > 22) confidence += 16;
  } else if (angle < 92 && upwardMove) {
    confidence += 18;
    strikeId = lead ? "lead-uppercut" : "rear-uppercut";
    punchNumber = lead ? 5 : 6;
    label = "UPPERCUT";
    if (wristY < elbow.y * height) confidence += 16;
    if (velocity.pxPerFrame > 22) confidence += 16;
  } else {
    strikeId = lead ? "jab" : "cross";
    punchNumber = lead ? 1 : 2;
    label = lead ? "JAB" : "CROSS";
    if (angle > 128) confidence += 12;
    if (velocity.pxPerFrame > 22) confidence += 12;
  }

  confidence += handLandmarkBoost(hand, strikeId, elbow, wrist, width, height);

  return {
    strikeId,
    punchNumber,
    label,
    confidence: Math.min(100, confidence),
  };
}

/** Hand geometry disambiguates hook vs straight extension. */
function handLandmarkBoost(
  hand: NormalizedLandmark[] | null,
  strikeId: PunchTypeId,
  elbow: NormalizedLandmark,
  wrist: NormalizedLandmark,
  width: number,
  height: number
): number {
  if (!hand || hand.length < 13) return 0;

  const handWrist = hand[HAND_LM.WRIST];
  const indexTip = hand[HAND_LM.INDEX_TIP];
  const middleTip = hand[HAND_LM.MIDDLE_TIP];
  const indexMcp = hand[HAND_LM.INDEX_MCP];
  if (!handWrist || !indexTip || !middleTip || !indexMcp) return 0;

  const forearmDx = (wrist.x - elbow.x) * width;
  const forearmDy = (wrist.y - elbow.y) * height;
  const forearmLen = Math.hypot(forearmDx, forearmDy) || 1;

  const knuckleDx = (indexMcp.x - handWrist.x) * width;
  const knuckleDy = (indexMcp.y - handWrist.y) * height;
  const knuckleLen = Math.hypot(knuckleDx, knuckleDy) || 1;

  const tipDx = (indexTip.x - handWrist.x) * width;
  const tipDy = (indexTip.y - handWrist.y) * height;

  const forearmUnitX = forearmDx / forearmLen;
  const forearmUnitY = forearmDy / forearmLen;
  const knuckleUnitX = knuckleDx / knuckleLen;
  const knuckleUnitY = knuckleDy / knuckleLen;

  const alignment =
    forearmUnitX * knuckleUnitX + forearmUnitY * knuckleUnitY;
  const lateralTip =
    Math.abs(
      (tipDx / (Math.hypot(tipDx, tipDy) || 1)) * -forearmUnitY +
        (tipDy / (Math.hypot(tipDx, tipDy) || 1)) * forearmUnitX
    );

  const isHook = strikeId.includes("hook");
  const isStraight = strikeId === "jab" || strikeId === "cross";
  const isUpper = strikeId.includes("upper");

  if (isHook && lateralTip > 0.35) return 14;
  if (isStraight && alignment > 0.82) return 12;
  if (isUpper && indexTip.y * height < middleTip.y * height) return 10;

  return 0;
}

function voteFrames(votes: FrameVote[]): FrameVote | null {
  if (votes.length === 0) return null;

  const buckets = new Map<
    string,
    { vote: FrameVote; count: number; totalConf: number }
  >();

  for (const vote of votes) {
    const key = vote.strikeId;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalConf += vote.confidence;
    } else {
      buckets.set(key, { vote, count: 1, totalConf: vote.confidence });
    }
  }

  let best: (typeof buckets extends Map<string, infer V> ? V : never) | null =
    null;
  for (const entry of buckets.values()) {
    if (
      !best ||
      entry.count > best.count ||
      (entry.count === best.count && entry.totalConf > best.totalConf)
    ) {
      best = entry;
    }
  }

  if (!best) return null;

  const avgConf = best.totalConf / best.count;
  const temporalBoost = Math.min(12, (best.count - 1) * 4);

  return {
    ...best.vote,
    confidence: Math.min(100, avgConf + temporalBoost),
  };
}

/** Single-frame classifier (calibration / legacy). */
export function classifyPunch(
  landmarks: NormalizedLandmark[],
  stance: BagStance,
  velocity: VelocityHit,
  width: number,
  height: number,
  hands: NormalizedLandmark[][] | null = null
): ClassifiedPunch | null {
  const hand = hands
    ? handForStrikeSide(hands, landmarks, velocity.side)
    : null;
  const vote = scoreFrame(landmarks, stance, velocity, width, height, hand);
  if (!vote) return null;

  return {
    strikeId: normalizeStrikeId(vote.strikeId),
    punchNumber: vote.punchNumber,
    confidence: vote.confidence,
    side: velocity.side,
    label: vote.label,
  };
}

/** Temporal + hand-boosted classifier used during live rounds. */
export function classifyPunchTemporal(
  frames: MotionFrame[],
  stance: BagStance,
  velocity: VelocityHit
): ClassifiedPunch | null {
  if (frames.length < TEMPORAL_MIN_FRAMES) return null;

  const votes: FrameVote[] = [];
  for (const frame of frames) {
    const hand = frame.hands
      ? handForStrikeSide(frame.hands, frame.landmarks, velocity.side)
      : null;
    const vote = scoreFrame(
      frame.landmarks,
      stance,
      velocity,
      frame.width,
      frame.height,
      hand
    );
    if (vote) votes.push(vote);
  }

  if (votes.length < TEMPORAL_MIN_FRAMES) return null;

  const winner = voteFrames(votes);
  if (!winner) return null;

  return {
    strikeId: normalizeStrikeId(winner.strikeId),
    punchNumber: winner.punchNumber,
    confidence: winner.confidence,
    side: velocity.side,
    label: winner.label,
  };
}
