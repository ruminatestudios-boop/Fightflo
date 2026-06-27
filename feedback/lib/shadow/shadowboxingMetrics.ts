import type { FrameLandmarks } from "@/types";
import {
  calibrateGuardFromTimeline,
  computeFrameMetrics,
  getGuardLineY,
  type GuardCalibration,
} from "@/lib/analysis/poseMetrics";
import type { LandmarkTimeline } from "@/types";
import type { ShadowDropEvent } from "./types";
import {
  appendPunchToChain,
  buildShadowComboAnalysis,
  classifyExtensionPeak,
  comboKeyFromChain,
  comboLabel,
  stampPunch,
  updateExtensionPeak,
  type DetectedPunch,
  type ExtensionPeak,
} from "./shadowComboDetection";
import {
  buildShadowRoundSummary,
  liveShadowboxingNote,
  makeShadowIssueMoment,
  makeShadowPositiveMoment,
  type ShadowMoment,
  type ShadowMomentContext,
} from "./shadowboxingCopy";

export {
  buildShadowRoundSummary,
  liveShadowboxingNote,
  shadowHomeCardHint,
  type ShadowMoment,
  type ShadowMomentContext,
  type ShadowPositiveType,
  type ShadowWeaknessType,
} from "./shadowboxingCopy";

const MIN_WRIST_VISIBILITY = 0.45;
const DROP_CONFIRM_FRAMES = 3;
const DROP_MIN_GAP_SEC = 1.1;
const SLOW_RETURN_MIN_FRAMES = 10;
const SLOW_RETURN_MAX_FRAMES = 24;
const QUICK_RETURN_MAX_FRAMES = 7;
const ELBOW_FLARE_ANGLE = 152;
const ELBOW_TUCK_ANGLE = 168;
const FLAT_HIP_DEG = 22;
const GOOD_HIP_DEG = 30;
const FLAT_HIP_MIN_EXTENSION_FRAMES = 4;
const STANCE_DRIFT_THRESHOLD = 0.09;
const EVENT_DEBOUNCE_SEC = 1.0;
const CHIN_UP_CONFIRM_FRAMES = 8;
const CHIN_GOOD_STREAK_FRAMES = 45;

function jointVisible(
  point: { visibility?: number } | undefined,
  min = 0.5
): boolean {
  return point !== undefined && (point.visibility ?? 1) >= min;
}

export function calibrateGuardFromNeutralFrames(
  frames: FrameLandmarks[]
): GuardCalibration | null {
  if (frames.length < 4) return null;

  const timeline: LandmarkTimeline = frames.map((landmarks, frame) => ({
    frame,
    timestamp: String(frame),
    landmarks,
  }));

  return calibrateGuardFromTimeline(timeline);
}

export function isNeutralGuardFrame(landmarks: FrameLandmarks): boolean {
  const guardY = getGuardLineY(landmarks);
  const lw = landmarks.left_wrist;
  const rw = landmarks.right_wrist;
  if (guardY === null || !lw || !rw) return false;
  if (
    !jointVisible(lw, MIN_WRIST_VISIBILITY) ||
    !jointVisible(rw, MIN_WRIST_VISIBILITY)
  ) {
    return false;
  }
  return lw.y < guardY + 0.01 && rw.y < guardY + 0.01;
}

export interface ShadowboxingStats {
  reliableFrames: number;
  guardUpFrames: number;
  moments: ShadowMoment[];
  drops: ShadowDropEvent[];
  dropCount: number;
  activeDropStreak: number;
  lastDropAtSec: number;
  lastEventAtSec: Partial<Record<string, number>>;
  inExtension: boolean;
  extensionStreak: number;
  flatHipStreak: number;
  chinUpStreak: number;
  chinGoodStreak: number;
  baselineCenterX: number | null;
  stanceDriftFrames: number;
  punches: DetectedPunch[];
  comboChain: DetectedPunch[];
  extensionPeak: ExtensionPeak | null;
}

export function createShadowboxingStats(): ShadowboxingStats {
  return {
    reliableFrames: 0,
    guardUpFrames: 0,
    moments: [],
    drops: [],
    dropCount: 0,
    activeDropStreak: 0,
    lastDropAtSec: -999,
    lastEventAtSec: {},
    inExtension: false,
    extensionStreak: 0,
    flatHipStreak: 0,
    chinUpStreak: 0,
    chinGoodStreak: 0,
    baselineCenterX: null,
    stanceDriftFrames: 0,
    punches: [],
    comboChain: [],
    extensionPeak: null,
  };
}

function canEmitEvent(
  stats: ShadowboxingStats,
  eventType: string,
  elapsedSec: number
): boolean {
  const last = stats.lastEventAtSec[eventType] ?? -999;
  return elapsedSec - last >= EVENT_DEBOUNCE_SEC;
}

function pushMoment(
  stats: ShadowboxingStats,
  moment: ShadowMoment,
  elapsedSec: number
): ShadowboxingStats {
  return {
    ...stats,
    moments: [...stats.moments, moment],
    lastEventAtSec: {
      ...stats.lastEventAtSec,
      [moment.eventType]: elapsedSec,
    },
  };
}

function resolveHand(
  metrics: ReturnType<typeof computeFrameMetrics>
): ShadowDropEvent["hand"] {
  if (metrics.left_wrist_below_guard && metrics.right_wrist_below_guard) return "both";
  if (metrics.left_wrist_below_guard) return "left";
  return "right";
}

function isWristExtended(landmarks: FrameLandmarks): boolean {
  // A dropped/relaxed hand is not the same thing as throwing a punch — using
  // wrist-below-guard as a stand-in for "extending" meant resting hands with
  // no punches at all could still fire elbow-flare/flat-hip checks on pure
  // noise. Only a genuine outward reach should count as "in extension."
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const lw = landmarks.left_wrist;
  const rw = landmarks.right_wrist;
  if (!ls || !rs) return false;

  const reachThreshold = 0.14;
  const leftReach =
    lw && jointVisible(lw, MIN_WRIST_VISIBILITY)
      ? Math.hypot(lw.x - ls.x, lw.y - ls.y) > reachThreshold
      : false;
  const rightReach =
    rw && jointVisible(rw, MIN_WRIST_VISIBILITY)
      ? Math.hypot(rw.x - rs.x, rw.y - rs.y) > reachThreshold
      : false;
  return leftReach || rightReach;
}

function shoulderCenterX(landmarks: FrameLandmarks): number | null {
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  if (!ls || !rs || !jointVisible(ls) || !jointVisible(rs)) return null;
  return (ls.x + rs.x) / 2;
}

function handToLeadRear(hand: ShadowDropEvent["hand"]): ShadowMomentContext["hand"] {
  if (hand === "left") return "lead";
  if (hand === "right") return "rear";
  return "both";
}

function comboContext(chain: DetectedPunch[]): ShadowMomentContext {
  const comboKey = comboKeyFromChain(chain);
  return {
    comboKey,
    comboLabel: chain.length >= 2 ? comboLabel(comboKey) : undefined,
  };
}

function punchLabelForHand(hand: "lead" | "rear"): string {
  return hand === "lead" ? "jab" : "cross";
}

export function ingestShadowboxingFrame(
  stats: ShadowboxingStats,
  landmarks: FrameLandmarks,
  calibration: GuardCalibration | null,
  elapsedSec: number
): ShadowboxingStats {
  const metrics = computeFrameMetrics(landmarks, calibration);
  if (!metrics.metrics_reliable) {
    return {
      ...stats,
      activeDropStreak: 0,
      extensionStreak: 0,
      flatHipStreak: 0,
      chinUpStreak: 0,
    };
  }

  let next: ShadowboxingStats = {
    ...stats,
    reliableFrames: stats.reliableFrames + 1,
    guardUpFrames:
      !metrics.guard_dropped || metrics.guard_confidence < 0.42
        ? stats.guardUpFrames + 1
        : stats.guardUpFrames,
  };

  const centerX = shoulderCenterX(landmarks);
  if (next.baselineCenterX === null && centerX !== null && next.reliableFrames <= 36) {
    next.baselineCenterX = centerX;
  } else if (
    next.baselineCenterX !== null &&
    centerX !== null &&
    Math.abs(centerX - next.baselineCenterX) > STANCE_DRIFT_THRESHOLD &&
    canEmitEvent(next, "stance_drift", elapsedSec)
  ) {
    next.stanceDriftFrames += 1;
    next = pushMoment(
      next,
      makeShadowIssueMoment("stance_drift", elapsedSec, next.moments.length),
      elapsedSec
    );
  }

  if (!metrics.chin_elevated && !metrics.guard_dropped) {
    next.chinGoodStreak += 1;
    if (
      next.chinGoodStreak >= CHIN_GOOD_STREAK_FRAMES &&
      canEmitEvent(next, "chin_stayed_down", elapsedSec)
    ) {
      next = pushMoment(
        next,
        makeShadowPositiveMoment("chin_stayed_down", elapsedSec, next.moments.length),
        elapsedSec
      );
      next.chinGoodStreak = 0;
    }
  } else {
    next.chinGoodStreak = 0;
  }

  if (metrics.chin_elevated) {
    next.chinUpStreak += 1;
    if (
      next.chinUpStreak >= CHIN_UP_CONFIRM_FRAMES &&
      canEmitEvent(next, "chin_up", elapsedSec)
    ) {
      next = pushMoment(
        next,
        makeShadowIssueMoment("chin_up", elapsedSec, next.moments.length),
        elapsedSec
      );
      next.chinUpStreak = 0;
    }
  } else {
    next.chinUpStreak = 0;
  }

  const extending = isWristExtended(landmarks);

  if (extending) {
    next.extensionStreak += 1;
    next.inExtension = true;
    next.extensionPeak = updateExtensionPeak(next.extensionPeak, landmarks, metrics);

    const rightFlared =
      metrics.right_elbow_angle !== null && metrics.right_elbow_angle < ELBOW_FLARE_ANGLE;
    const leftFlared =
      metrics.left_elbow_angle !== null && metrics.left_elbow_angle < ELBOW_FLARE_ANGLE;

    if (rightFlared && canEmitEvent(next, "elbow_flare_on_cross", elapsedSec)) {
      const peakHand = next.extensionPeak?.hand ?? "rear";
      next = pushMoment(
        next,
        makeShadowIssueMoment(
          "elbow_flare_on_cross",
          elapsedSec,
          next.moments.length,
          "right_elbow",
          {
            ...comboContext(next.comboChain),
            punchLabel: punchLabelForHand(peakHand),
          }
        ),
        elapsedSec
      );
    } else if (
      metrics.right_elbow_angle !== null &&
      metrics.right_elbow_angle >= ELBOW_TUCK_ANGLE &&
      canEmitEvent(next, "elbow_tucked", elapsedSec)
    ) {
      next = pushMoment(
        next,
        makeShadowPositiveMoment("elbow_tucked", elapsedSec, next.moments.length),
        elapsedSec
      );
    }

    if (leftFlared && canEmitEvent(next, "elbow_flare_lead", elapsedSec)) {
      next = pushMoment(
        next,
        makeShadowIssueMoment(
          "elbow_flare_on_cross",
          elapsedSec,
          next.moments.length,
          "left_elbow",
          {
            ...comboContext(next.comboChain),
            punchLabel: "lead hook",
          }
        ),
        elapsedSec
      );
      next.lastEventAtSec = { ...next.lastEventAtSec, elbow_flare_lead: elapsedSec };
    }

    if (metrics.hip_rotation_deg !== null && metrics.hip_rotation_deg < FLAT_HIP_DEG) {
      next.flatHipStreak += 1;
      if (
        next.flatHipStreak >= FLAT_HIP_MIN_EXTENSION_FRAMES &&
        canEmitEvent(next, "flat_hips", elapsedSec)
      ) {
        next = pushMoment(
          next,
          makeShadowIssueMoment("flat_hips", elapsedSec, next.moments.length, "right_hip", {
            ...comboContext(next.comboChain),
            punchLabel: next.extensionPeak
              ? punchLabelForHand(next.extensionPeak.hand)
              : undefined,
          }),
          elapsedSec
        );
        next.flatHipStreak = 0;
      }
    } else {
      next.flatHipStreak = 0;
      if (
        metrics.hip_rotation_deg !== null &&
        metrics.hip_rotation_deg >= GOOD_HIP_DEG &&
        canEmitEvent(next, "good_hip_turn", elapsedSec)
      ) {
        next = pushMoment(
          next,
          makeShadowPositiveMoment("good_hip_turn", elapsedSec, next.moments.length),
          elapsedSec
        );
      }
    }

    if (metrics.guard_dropped && metrics.guard_confidence >= 0.45) {
      next.activeDropStreak += 1;
      if (
        next.activeDropStreak >= DROP_CONFIRM_FRAMES &&
        elapsedSec - next.lastDropAtSec >= DROP_MIN_GAP_SEC
      ) {
        const hand = resolveHand(metrics);
        next.dropCount += 1;
        next.lastDropAtSec = elapsedSec;
        next.drops = [
          ...next.drops,
          { id: `drop-${next.drops.length}`, elapsedSec, hand },
        ];
        if (canEmitEvent(next, "guard_drop_after_cross", elapsedSec)) {
          next = pushMoment(
            next,
            makeShadowIssueMoment(
              "guard_drop_after_cross",
              elapsedSec,
              next.moments.length,
              hand === "left" ? "left_wrist" : hand === "right" ? "right_wrist" : "right_wrist",
              {
                ...comboContext(next.comboChain),
                hand: handToLeadRear(hand),
              }
            ),
            elapsedSec
          );
        }
        next.activeDropStreak = 0;
      }
    } else {
      next.activeDropStreak = 0;
    }
  } else if (next.inExtension) {
    const streak = next.extensionStreak;
    const chainSnapshot = [...next.comboChain];
    const classified = classifyExtensionPeak(next.extensionPeak);
    if (classified) {
      const punch = stampPunch(classified, elapsedSec);
      next.punches = [...next.punches, punch];
      next.comboChain = appendPunchToChain(next.comboChain, punch);
    }

    if (
      streak >= SLOW_RETURN_MIN_FRAMES &&
      streak <= SLOW_RETURN_MAX_FRAMES &&
      canEmitEvent(next, "slow_guard_return", elapsedSec)
    ) {
      next = pushMoment(
        next,
        makeShadowIssueMoment("slow_guard_return", elapsedSec, next.moments.length, undefined, {
          ...comboContext(chainSnapshot.length >= 2 ? chainSnapshot : next.comboChain),
        }),
        elapsedSec
      );
    } else if (
      streak > 0 &&
      streak <= QUICK_RETURN_MAX_FRAMES &&
      canEmitEvent(next, "quick_guard_return", elapsedSec)
    ) {
      next = pushMoment(
        next,
        makeShadowPositiveMoment("quick_guard_return", elapsedSec, next.moments.length),
        elapsedSec
      );
    }

    next.inExtension = false;
    next.extensionStreak = 0;
    next.extensionPeak = null;
    next.flatHipStreak = 0;
    next.activeDropStreak = 0;
  } else {
    next.extensionStreak = 0;
    next.extensionPeak = null;
    next.flatHipStreak = 0;
    next.activeDropStreak = 0;
  }

  return next;
}

export function guardUptimePercent(stats: ShadowboxingStats): number {
  if (stats.reliableFrames === 0) return 100;
  return Math.round((stats.guardUpFrames / stats.reliableFrames) * 100);
}

export function issueCount(stats: ShadowboxingStats): number {
  return stats.moments.filter((m) => m.kind === "issue").length;
}

export function positiveCount(stats: ShadowboxingStats): number {
  return stats.moments.filter((m) => m.kind === "positive").length;
}

export const createShadowLiveStats = createShadowboxingStats;
export const ingestShadowFrame = ingestShadowboxingFrame;
export type ShadowLiveStats = ShadowboxingStats;

export function buildShadowboxingCoachingCopy(
  stats: ShadowboxingStats,
  roundSeconds: number
) {
  const comboAnalysis = buildShadowComboAnalysis(stats.punches, roundSeconds);
  const coaching = buildShadowRoundSummary({
    moments: stats.moments,
    roundSeconds,
    comboAnalysis,
  });
  return { ...coaching, comboAnalysis };
}

export const buildShadowCoachingCopy = buildShadowboxingCoachingCopy;
