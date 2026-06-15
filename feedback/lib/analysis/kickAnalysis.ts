import { parseTimestamp } from "@/lib/analysis/timestamps";
import type { FrameLandmarks, LandmarkTimeline } from "@/types";

export type KickSide = "left" | "right";

export interface KickEvent {
  side: KickSide;
  peakIdx: number;
  chamberStartIdx: number;
  extensionStartIdx: number;
  endIdx: number;
  start_timestamp: string;
  peak_timestamp: string;
  end_timestamp: string;
  hipRotationAtPeak: number | null;
  plantedPivotLateral: number;
  chamberHeight: number;
  footStrikeLikely: boolean;
  lowChamber: boolean;
  insufficientPivot: boolean;
}

export interface KickFrameState {
  inChamber: boolean;
  inExtension: boolean;
  atPeak: boolean;
  kickingLeg: KickSide | null;
}

const MIN_KNEE_VIS = 0.42;
const MIN_ANKLE_VIS = 0.4;
const MIN_HIP_VIS = 0.45;
const CHAMBER_LIFT_MIN = 0.012;
const EXTENSION_VELOCITY = 0.0055;
const MIN_CHAMBER_HEIGHT = 0.042;
const MIN_PIVOT_LATERAL = 0.02;
const MIN_HIP_ROT_ROUNDHOUSE = 26;

const EMPTY_KICK_STATE: KickFrameState = {
  inChamber: false,
  inExtension: false,
  atPeak: false,
  kickingLeg: null,
};

function legJoints(
  landmarks: FrameLandmarks,
  side: KickSide
): {
  hip: NonNullable<FrameLandmarks["left_hip"]>;
  knee: NonNullable<FrameLandmarks["left_knee"]>;
  ankle: NonNullable<FrameLandmarks["left_ankle"]>;
} | null {
  const hip = side === "left" ? landmarks.left_hip : landmarks.right_hip;
  const knee = side === "left" ? landmarks.left_knee : landmarks.right_knee;
  const ankle = side === "left" ? landmarks.left_ankle : landmarks.right_ankle;

  if (!hip || !knee || !ankle) return null;
  if (
    (hip.visibility ?? 0) < MIN_HIP_VIS ||
    (knee.visibility ?? 0) < MIN_KNEE_VIS ||
    (ankle.visibility ?? 0) < MIN_ANKLE_VIS
  ) {
    return null;
  }

  return { hip, knee, ankle };
}

function plantedAnkle(
  landmarks: FrameLandmarks,
  kickingSide: KickSide
): { x: number; y: number } | null {
  const ankle =
    kickingSide === "left"
      ? landmarks.right_ankle
      : landmarks.left_ankle;
  if (!ankle || (ankle.visibility ?? 0) < MIN_ANKLE_VIS) return null;
  return ankle;
}

function kneeLift(hip: { y: number }, knee: { y: number }): number {
  return hip.y - knee.y;
}

function legExtension(
  hip: { x: number; y: number },
  ankle: { x: number; y: number }
): number {
  return Math.hypot(ankle.x - hip.x, ankle.y - hip.y);
}

function shinAngleFromHorizontal(
  knee: { x: number; y: number },
  ankle: { x: number; y: number }
): number {
  return (
    (Math.atan2(
      Math.abs(ankle.y - knee.y),
      Math.abs(ankle.x - knee.x) + 0.001
    ) *
      180) /
    Math.PI
  );
}

function hipRotationDeg(landmarks: FrameLandmarks): number | null {
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const lh = landmarks.left_hip;
  const rh = landmarks.right_hip;
  if (!ls || !rs || !lh || !rh) return null;
  const shoulderAngle = Math.atan2(rs.y - ls.y, rs.x - ls.x);
  const hipAngle = Math.atan2(rh.y - lh.y, rh.x - lh.x);
  return Math.abs(((shoulderAngle - hipAngle) * 180) / Math.PI);
}

function footStrikeAtPeak(
  knee: { x: number; y: number },
  ankle: { x: number; y: number }
): boolean {
  const ankleAboveKnee = ankle.y < knee.y - 0.022;
  const shinAngle = shinAngleFromHorizontal(knee, ankle);
  return ankleAboveKnee || shinAngle < 38;
}

function detectKicksForSide(
  timeline: LandmarkTimeline,
  side: KickSide
): KickEvent[] {
  const events: KickEvent[] = [];
  const lifts: number[] = [];
  const extensions: number[] = [];
  const valid: boolean[] = [];

  for (const frame of timeline) {
    const joints = legJoints(frame.landmarks, side);
    if (!joints) {
      lifts.push(0);
      extensions.push(0);
      valid.push(false);
      continue;
    }
    lifts.push(kneeLift(joints.hip, joints.knee));
    extensions.push(legExtension(joints.hip, joints.ankle));
    valid.push(true);
  }

  let chamberStart = -1;
  let extensionStart = -1;
  let peakIdx = -1;
  let peakExt = 0;
  let maxChamber = 0;
  let extending = 0;

  const reset = () => {
    chamberStart = -1;
    extensionStart = -1;
    peakIdx = -1;
    peakExt = 0;
    maxChamber = 0;
    extending = 0;
  };

  const flush = (endIdx: number) => {
    if (peakIdx < 0 || chamberStart < 0 || extensionStart < 0) {
      reset();
      return;
    }
    if (peakIdx - chamberStart < 2) {
      reset();
      return;
    }

    const peakFrame = timeline[peakIdx];
    const chamberFrame = timeline[chamberStart];
    const joints = legJoints(peakFrame.landmarks, side);
    if (!joints) {
      reset();
      return;
    }

    const plantedStart = plantedAnkle(chamberFrame.landmarks, side);
    const plantedPeak = plantedAnkle(peakFrame.landmarks, side);
    const pivotLateral =
      plantedStart && plantedPeak
        ? Math.abs(plantedPeak.x - plantedStart.x)
        : 0;

    const hipRot = hipRotationDeg(peakFrame.landmarks);
    const chamberHeight = maxChamber;
    const footStrike = footStrikeAtPeak(joints.knee, joints.ankle);

    events.push({
      side,
      peakIdx,
      chamberStartIdx: chamberStart,
      extensionStartIdx: extensionStart,
      endIdx,
      start_timestamp: chamberFrame.timestamp,
      peak_timestamp: peakFrame.timestamp,
      end_timestamp: timeline[endIdx]?.timestamp ?? peakFrame.timestamp,
      hipRotationAtPeak: hipRot,
      plantedPivotLateral: pivotLateral,
      chamberHeight,
      footStrikeLikely: footStrike,
      lowChamber: chamberHeight < MIN_CHAMBER_HEIGHT,
      insufficientPivot:
        (hipRot !== null && hipRot < MIN_HIP_ROT_ROUNDHOUSE) ||
        pivotLateral < MIN_PIVOT_LATERAL,
    });

    reset();
  };

  for (let i = 1; i < timeline.length; i++) {
    if (!valid[i] || !valid[i - 1]) {
      if (peakIdx >= 0) flush(i - 1);
      else reset();
      continue;
    }

    const liftDelta = lifts[i] - lifts[i - 1];
    const extDelta = extensions[i] - extensions[i - 1];

    if (chamberStart < 0 && lifts[i] > CHAMBER_LIFT_MIN && liftDelta > 0.002) {
      chamberStart = i;
      maxChamber = lifts[i];
    }

    if (chamberStart >= 0) {
      maxChamber = Math.max(maxChamber, lifts[i]);

      if (
        extensionStart < 0 &&
        lifts[i] > CHAMBER_LIFT_MIN &&
        extDelta > EXTENSION_VELOCITY
      ) {
        extensionStart = i;
        extending = 1;
        peakIdx = i;
        peakExt = extensions[i];
      } else if (extensionStart >= 0) {
        if (extDelta > EXTENSION_VELOCITY * 0.35) {
          extending++;
        }
        if (extensions[i] > peakExt) {
          peakExt = extensions[i];
          peakIdx = i;
        }
        if (extDelta < -EXTENSION_VELOCITY * 0.45 && extending >= 2) {
          flush(i);
        }
      }
    }
  }

  if (peakIdx >= 0) {
    flush(timeline.length - 1);
  }

  return events;
}

/** Detect kick events for both legs with temporal de-duplication */
export function detectKickEvents(timeline: LandmarkTimeline): KickEvent[] {
  if (timeline.length < 8) return [];

  const all = [
    ...detectKicksForSide(timeline, "left"),
    ...detectKicksForSide(timeline, "right"),
  ].sort((a, b) => a.peakIdx - b.peakIdx);

  const merged: KickEvent[] = [];
  for (const event of all) {
    const last = merged[merged.length - 1];
    if (
      last &&
      Math.abs(event.peakIdx - last.peakIdx) < 6 &&
      event.side === last.side
    ) {
      continue;
    }
    merged.push(event);
  }

  return merged;
}

export function buildKickFrameStates(
  timeline: LandmarkTimeline,
  events: KickEvent[]
): KickFrameState[] {
  const states: KickFrameState[] = timeline.map(() => ({ ...EMPTY_KICK_STATE }));

  for (const event of events) {
    for (let i = event.chamberStartIdx; i <= event.endIdx; i++) {
      if (!states[i]) continue;
      states[i].kickingLeg = event.side;
      if (i < event.extensionStartIdx) {
        states[i].inChamber = true;
      } else if (i < event.peakIdx) {
        states[i].inExtension = true;
      } else if (i <= event.peakIdx + 2) {
        states[i].atPeak = true;
        states[i].inExtension = true;
      }
    }
  }

  return states;
}

export function kickEventToConfidence(event: KickEvent): number {
  let score = 0.62;
  if (event.chamberHeight >= MIN_CHAMBER_HEIGHT) score += 0.08;
  if (event.hipRotationAtPeak !== null && event.hipRotationAtPeak > 20) {
    score += 0.06;
  }
  if (event.plantedPivotLateral > MIN_PIVOT_LATERAL) score += 0.06;
  return Math.min(1, score);
}

export function kickTimeSeconds(event: KickEvent, timeline: LandmarkTimeline): number {
  return parseTimestamp(event.peak_timestamp);
}
