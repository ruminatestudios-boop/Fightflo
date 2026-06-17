import type { FrameLandmarks } from "@/types";
import { POSE_GUARD_NODES, POSE_KICK_NODES } from "@/lib/pose/mediapipeConfig";

export type CombatTrackingState = "idle" | "boxing_strike" | "muay_thai_kick";

export interface CombatStateSnapshot {
  state: CombatTrackingState;
  /** Striking hand dropped while not in kick recovery */
  guardDropAlert: boolean;
  /** Opposite (support) hand below eye line during kick */
  supportHandDropAlert: boolean;
  kickingSide: "left" | "right" | null;
  strikingHand: "left" | "right" | null;
}

export interface CombatStateInput {
  landmarks: FrameLandmarks;
  prevLandmarks: FrameLandmarks | null;
  deltaSec: number;
  eyeLineY: number | null;
}

function pointVelocity(
  current: FrameLandmarks,
  previous: FrameLandmarks | null,
  joint: keyof FrameLandmarks,
  deltaSec: number
): number {
  if (!previous || deltaSec <= 0) return 0;
  const a = current[joint];
  const b = previous[joint];
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y) / deltaSec;
}

function wristBelowEyes(
  landmarks: FrameLandmarks,
  wrist: "left_wrist" | "right_wrist",
  eyeLineY: number
): boolean {
  const wristPoint = landmarks[wrist];
  if (!wristPoint) return false;
  return wristPoint.y > eyeLineY;
}

/**
 * STATE 1 — Boxing / striking:
 * High hand velocity toward head plane vs guard height → punch extension.
 * Dropped hand below guard line without kick context → guard fault.
 */
export function evaluateBoxingStrikeState(input: CombatStateInput): {
  isStriking: boolean;
  strikingHand: "left" | "right" | null;
  guardDropped: boolean;
} {
  const { landmarks, prevLandmarks, deltaSec } = input;
  const leftVel = pointVelocity(landmarks, prevLandmarks, "left_wrist", deltaSec);
  const rightVel = pointVelocity(landmarks, prevLandmarks, "right_wrist", deltaSec);
  const strikeThreshold = 1.8;

  const strikingHand =
    leftVel > rightVel && leftVel > strikeThreshold
      ? "left"
      : rightVel > strikeThreshold
        ? "right"
        : null;

  const noseY = landmarks.nose?.y ?? null;
  const guardLine =
    noseY !== null
      ? noseY + 0.06
      : ((landmarks.left_shoulder?.y ?? 0.5) + (landmarks.right_shoulder?.y ?? 0.5)) / 2;

  const leftDropped = wristBelowEyes(landmarks, "left_wrist", guardLine);
  const rightDropped = wristBelowEyes(landmarks, "right_wrist", guardLine);

  return {
    isStriking: strikingHand !== null,
    strikingHand,
    guardDropped: leftDropped || rightDropped,
  };
}

/**
 * STATE 2 — Muay Thai kicking:
 * High knee/ankle lift velocity on one side → kick phase.
 * Ignore natural hand swing on kicking side; flag if support hand drops below eyes.
 */
export function evaluateMuayThaiKickState(input: CombatStateInput): {
  isKicking: boolean;
  kickingSide: "left" | "right" | null;
  supportHandDrop: boolean;
} {
  const { landmarks, prevLandmarks, deltaSec, eyeLineY } = input;

  const leftKneeVel = pointVelocity(landmarks, prevLandmarks, "left_knee", deltaSec);
  const rightKneeVel = pointVelocity(landmarks, prevLandmarks, "right_knee", deltaSec);
  const leftAnkleVel = pointVelocity(landmarks, prevLandmarks, "left_ankle", deltaSec);
  const rightAnkleVel = pointVelocity(landmarks, prevLandmarks, "right_ankle", deltaSec);

  const leftLift = Math.max(leftKneeVel, leftAnkleVel);
  const rightLift = Math.max(rightKneeVel, rightAnkleVel);
  const kickThreshold = 1.4;

  const kickingSide =
    leftLift > rightLift && leftLift > kickThreshold
      ? "left"
      : rightLift > kickThreshold
        ? "right"
        : null;

  if (!kickingSide || eyeLineY === null) {
    return { isKicking: false, kickingSide: null, supportHandDrop: false };
  }

  const supportWrist =
    kickingSide === "left" ? "right_wrist" : ("left_wrist" as const);
  const supportHandDrop = wristBelowEyes(landmarks, supportWrist, eyeLineY);

  return {
    isKicking: true,
    kickingSide,
    supportHandDrop,
  };
}

/** Fuse martial-arts state machine for guard-tracking hooks */
export function evaluateCombatState(input: CombatStateInput): CombatStateSnapshot {
  const eyeLineY =
    input.eyeLineY ??
    (input.landmarks.left_eye && input.landmarks.right_eye
      ? (input.landmarks.left_eye.y + input.landmarks.right_eye.y) / 2
      : input.landmarks.nose?.y ?? null);

  const kick = evaluateMuayThaiKickState({ ...input, eyeLineY });
  const boxing = evaluateBoxingStrikeState(input);

  if (kick.isKicking) {
    return {
      state: "muay_thai_kick",
      guardDropAlert: false,
      supportHandDropAlert: kick.supportHandDrop,
      kickingSide: kick.kickingSide,
      strikingHand: null,
    };
  }

  if (boxing.isStriking) {
    return {
      state: "boxing_strike",
      guardDropAlert: boxing.guardDropped,
      supportHandDropAlert: false,
      kickingSide: null,
      strikingHand: boxing.strikingHand,
    };
  }

  return {
    state: "idle",
    guardDropAlert: boxing.guardDropped,
    supportHandDropAlert: false,
    kickingSide: null,
    strikingHand: null,
  };
}

/** Nodes monitored per discipline — used by overlay / metrics wiring */
export function activeNodesForState(state: CombatTrackingState): (keyof FrameLandmarks)[] {
  if (state === "muay_thai_kick") {
    return [...POSE_KICK_NODES, ...POSE_GUARD_NODES];
  }
  return POSE_GUARD_NODES;
}
