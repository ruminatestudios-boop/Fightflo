import { parseTimestamp } from "@/lib/analysis/timestamps";
import {
  buildKickFrameStates,
  detectKickEvents,
  type KickFrameState,
  type KickEvent,
} from "@/lib/analysis/kickAnalysis";
import {
  calibrateGuardFromTimeline,
  computeFrameMetrics,
  type GuardCalibration,
  type FrameMetrics,
} from "@/lib/analysis/poseMetrics";
import type { LandmarkTimeline } from "@/types";

export interface FrameAnalysis {
  frame: number;
  timestamp: string;
  timeSeconds: number;
  metrics: FrameMetrics;
  /** Frames within recovery window after rear-hand extension (cross) */
  postRearExtension: boolean;
  /** Frames within recovery window after lead-hand extension (jab) */
  postLeadExtension: boolean;
  /** Kick phase flags for Muay Thai leg analysis */
  kick: KickFrameState;
}

export interface TimelineContext {
  calibration: GuardCalibration | null;
  frames: FrameAnalysis[];
  kickEvents: KickEvent[];
}

const EXTENSION_VELOCITY = 0.007;
const RECOVERY_FRAMES = 14;

function wristShoulderDist(
  wx: number,
  wy: number,
  sx: number,
  sy: number
): number {
  return Math.hypot(wx - sx, wy - sy);
}

function markExtensionWindows(
  timeline: LandmarkTimeline,
  side: "rear" | "lead"
): Set<number> {
  const windows = new Set<number>();
  const dists: number[] = [];

  for (const frame of timeline) {
    const ls = frame.landmarks.left_shoulder;
    const rs = frame.landmarks.right_shoulder;
    const lw = frame.landmarks.left_wrist;
    const rw = frame.landmarks.right_wrist;

    if (!ls || !rs || !lw || !rw) {
      dists.push(0);
      continue;
    }

    const isRear = side === "rear";
    const sx = isRear ? rs.x : ls.x;
    const sy = isRear ? rs.y : ls.y;
    const wx = isRear ? rw.x : lw.x;
    const wy = isRear ? rw.y : lw.y;
    const vis = isRear ? rw.visibility ?? 0 : lw.visibility ?? 0;

    dists.push(vis >= 0.4 ? wristShoulderDist(wx, wy, sx, sy) : 0);
  }

  let extending = 0;
  let peakIdx = -1;
  let peakDist = 0;

  for (let i = 1; i < dists.length; i++) {
    const delta = dists[i] - dists[i - 1];
    if (dists[i] > 0.06 && delta > EXTENSION_VELOCITY) {
      extending++;
      if (dists[i] > peakDist) {
        peakDist = dists[i];
        peakIdx = i;
      }
    } else if (extending >= 2 && peakIdx >= 0 && delta < -EXTENSION_VELOCITY * 0.5) {
      for (let j = peakIdx; j <= Math.min(peakIdx + RECOVERY_FRAMES, dists.length - 1); j++) {
        windows.add(j);
      }
      extending = 0;
      peakIdx = -1;
      peakDist = 0;
    } else if (delta <= 0) {
      extending = Math.max(0, extending - 1);
    }
  }

  return windows;
}

/** Single pass: calibration, per-frame metrics, punch recovery windows */
export function buildTimelineContext(
  timeline: LandmarkTimeline
): TimelineContext {
  const calibration = calibrateGuardFromTimeline(timeline);
  const postRear = markExtensionWindows(timeline, "rear");
  const postLead = markExtensionWindows(timeline, "lead");
  const kickEvents = detectKickEvents(timeline);
  const kickStates = buildKickFrameStates(timeline, kickEvents);

  const frames: FrameAnalysis[] = timeline.map((frame, index) => ({
    frame: frame.frame,
    timestamp: frame.timestamp,
    timeSeconds: parseTimestamp(frame.timestamp),
    metrics: computeFrameMetrics(frame.landmarks, calibration),
    postRearExtension: postRear.has(index),
    postLeadExtension: postLead.has(index),
    kick: kickStates[index] ?? {
      inChamber: false,
      inExtension: false,
      atPeak: false,
      kickingLeg: null,
    },
  }));

  return { calibration, frames, kickEvents };
}

export function guardDropInRecoveryWindow(
  analysis: FrameAnalysis,
  weaknessType: string
): boolean {
  if (!analysis.metrics.guard_dropped || !analysis.metrics.metrics_reliable) {
    return false;
  }

  if (weaknessType === "guard_drop_after_cross") {
    return analysis.postRearExtension;
  }
  if (weaknessType === "dropping_guard_on_kick") {
    return (
      analysis.kick.inExtension ||
      analysis.kick.atPeak ||
      analysis.postLeadExtension ||
      analysis.postRearExtension
    );
  }
  if (weaknessType === "slow_guard_return") {
    return analysis.postRearExtension || analysis.postLeadExtension;
  }

  return true;
}
