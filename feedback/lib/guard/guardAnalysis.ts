import { frameTimeSeconds } from "@/components/video/landmarkPlayback";
import { formatTime, parseTimestamp } from "@/components/video/utils";
import {
  buildTimelineContext,
  type FrameAnalysis,
} from "@/lib/analysis/timelineAnalysis";
import { parseGuardCalibration } from "@/lib/analysis/guardCalibration";
import {
  computeFrameMetrics,
  getGuardLineY,
  type GuardCalibration,
} from "@/lib/analysis/poseMetrics";
import type { FrameLandmarks, LandmarkTimeline, Report } from "@/types";

export interface GuardDropMoment {
  id: string;
  timestamp: string;
  timeSeconds: number;
  hand: "left" | "right" | "both";
  weaknessType: string;
  title: string;
  detail: string;
  fix: string;
}

export interface GuardDropAnalysis {
  dropCount: number;
  dropPercent: number;
  moments: GuardDropMoment[];
  mechanicalFix: string;
  fightConsequence: string;
  drillName: string;
  summary: string;
}

const GUARD_WEAKNESS_TYPES = new Set([
  "guard_drop_after_cross",
  "dropping_guard_on_kick",
  "slow_guard_return",
]);

const GUARD_CONSEQUENCE: Record<string, string> = {
  guard_drop_after_cross:
    "A counter hook or overhand lands clean while that hand is still down.",
  dropping_guard_on_kick:
    "Straight counter or teep hits centre line while you are on one leg.",
  slow_guard_return:
    "Opponent punches into the gap before your gloves reset.",
  default: "Clean counters land whenever the guard is low or late.",
};

interface GuardCluster {
  startTime: number;
  endTime: number;
  hand: GuardDropMoment["hand"];
  frames: FrameAnalysis[];
  landmarks: FrameLandmarks[];
  maxDropDepth: number;
}

function handLabel(hand: GuardDropMoment["hand"]): string {
  if (hand === "both") return "Both hands dropped";
  if (hand === "left") return "Lead hand dropped";
  return "Rear hand dropped";
}

function handPhrase(hand: GuardDropMoment["hand"]): string {
  if (hand === "both") return "both gloves";
  if (hand === "left") return "lead hand";
  return "rear hand";
}

function resolveHand(
  metrics: ReturnType<typeof computeFrameMetrics>
): GuardDropMoment["hand"] {
  if (metrics.left_wrist_below_guard && metrics.right_wrist_below_guard) {
    return "both";
  }
  if (metrics.left_wrist_below_guard) return "left";
  if (metrics.right_wrist_below_guard) return "right";
  return "right";
}

function mergeHand(
  current: GuardDropMoment["hand"],
  next: GuardDropMoment["hand"]
): GuardDropMoment["hand"] {
  if (current === next) return current;
  return "both";
}

function wristDropDepth(
  landmarks: FrameLandmarks,
  calibration: GuardCalibration | null,
  hand: GuardDropMoment["hand"]
): number {
  const guardY = calibration?.guardLineY ?? getGuardLineY(landmarks);
  const threshold = calibration?.guardThreshold ?? 0.018;
  if (guardY === null) return 0;

  const lw = landmarks.left_wrist;
  const rw = landmarks.right_wrist;
  let depth = 0;

  if ((hand === "left" || hand === "both") && lw) {
    depth = Math.max(depth, lw.y - (guardY + threshold));
  }
  if ((hand === "right" || hand === "both") && rw) {
    depth = Math.max(depth, rw.y - (guardY + threshold));
  }

  return Math.max(0, depth);
}

function depthPhrase(depth: number): string {
  if (depth >= 0.04) return "well below your cheek line";
  if (depth >= 0.022) return "clearly below cheek height";
  return "just under guard height";
}

function durationPhrase(seconds: number): string {
  if (seconds >= 0.75) return `for ${seconds.toFixed(1)}s`;
  if (seconds >= 0.35) return `for ${Math.round(seconds * 10) / 10}s`;
  return "briefly";
}

function classifyClusterWeakness(frames: FrameAnalysis[]): string {
  if (frames.length === 0) return "guard_drop_after_cross";

  let postCross = 0;
  let duringKick = 0;

  for (const frame of frames) {
    if (frame.postRearExtension || frame.postLeadExtension) postCross++;
    if (
      frame.kick.inExtension ||
      frame.kick.inChamber ||
      frame.kick.atPeak
    ) {
      duringKick++;
    }
  }

  const ratio = frames.length;
  if (duringKick / ratio >= 0.35) return "dropping_guard_on_kick";
  if (postCross / ratio >= 0.3) return "guard_drop_after_cross";
  if (frames.length >= 10) return "slow_guard_return";
  return "guard_drop_after_cross";
}

function buildMomentCopy(
  timestamp: string,
  hand: GuardDropMoment["hand"],
  weaknessType: string,
  durationSec: number,
  depth: number
): Pick<GuardDropMoment, "title" | "detail" | "fix"> {
  const glove = handPhrase(hand);
  const depthText = depthPhrase(depth);
  const durationText = durationPhrase(durationSec);

  switch (weaknessType) {
    case "dropping_guard_on_kick":
      return {
        title: handLabel(hand),
        detail: `At ${timestamp}, your ${glove} sat ${depthText} ${durationText} while a kick was chambering or extending — centre line was open on one leg.`,
        fix: `At ${timestamp}, pin ${glove} to your jaw through the entire kick. Chamber with the glove glued, not drifting to your hip.`,
      };
    case "slow_guard_return":
      return {
        title: handLabel(hand),
        detail: `At ${timestamp}, your ${glove} stayed ${depthText} ${durationText} after the combination finished — guard reset was late.`,
        fix: `At ${timestamp}, recoil ${glove} to cheek on the same count you finish the punch. Drill jab-cross with an instant return before feet move.`,
      };
    case "guard_drop_after_cross":
    default:
      return {
        title: handLabel(hand),
        detail: `At ${timestamp}, your ${glove} sat ${depthText} ${durationText} in the recovery window right after a rear-hand extension.`,
        fix: `At ${timestamp}, drive ${glove} back to cheek before you step, pivot, or throw the next shot.`,
      };
  }
}

function makeMomentFromCluster(
  cluster: GuardCluster,
  index: number
): GuardDropMoment {
  const weaknessType = classifyClusterWeakness(cluster.frames);
  const durationSec = Math.max(0.1, cluster.endTime - cluster.startTime);
  const timestamp = formatTime(cluster.startTime);
  const copy = buildMomentCopy(
    timestamp,
    cluster.hand,
    weaknessType,
    durationSec,
    cluster.maxDropDepth
  );

  return {
    id: `guard-${index}`,
    timestamp,
    timeSeconds: cluster.startTime,
    hand: cluster.hand,
    weaknessType,
    title: copy.title,
    detail: copy.detail,
    fix: copy.fix,
  };
}

function flushCluster(
  cluster: GuardCluster,
  moments: GuardDropMoment[],
  minGapSeconds: number,
  lastEnd: { value: number }
) {
  const duration = cluster.endTime - cluster.startTime;
  if (duration < 0.15 || cluster.frames.length < 3) return;

  if (
    cluster.startTime - lastEnd.value < minGapSeconds &&
    moments.length > 0
  ) {
    const prev = moments[moments.length - 1];
    const mergedTime = (prev.timeSeconds + cluster.startTime) / 2;
    const mergedCluster: GuardCluster = {
      ...cluster,
      startTime: mergedTime,
      endTime: Math.max(cluster.endTime, prev.timeSeconds + duration),
      hand: mergeHand(
        prev.hand,
        cluster.hand
      ),
      frames: cluster.frames,
      landmarks: cluster.landmarks,
      maxDropDepth: Math.max(cluster.maxDropDepth, 0),
    };
    moments[moments.length - 1] = makeMomentFromCluster(
      mergedCluster,
      moments.length - 1
    );
    lastEnd.value = cluster.endTime;
    return;
  }

  moments.push(makeMomentFromCluster(cluster, moments.length));
  lastEnd.value = cluster.endTime;
}

/** Cluster consecutive guard-drop frames into timestamped, guard-only moments */
export function extractGuardMomentsFromTimeline(
  timeline: LandmarkTimeline,
  minGapSeconds = 1.25,
  calibration?: GuardCalibration | null
): GuardDropMoment[] {
  if (timeline.length === 0) return [];

  const context = buildTimelineContext(timeline);
  const cal = calibration ?? context.calibration;
  const sorted = [...timeline].sort(
    (a, b) => frameTimeSeconds(a) - frameTimeSeconds(b)
  );

  const moments: GuardDropMoment[] = [];
  const lastEnd = { value: -999 };
  let cluster: GuardCluster | null = null;

  for (let i = 0; i < context.frames.length; i++) {
    const frame = context.frames[i];
    const landmarks = sorted[i]?.landmarks;
    const metrics = frame.metrics;

    if (
      metrics.metrics_reliable &&
      metrics.guard_dropped &&
      metrics.guard_confidence >= 0.45 &&
      landmarks
    ) {
      const hand = resolveHand(metrics);
      const depth = wristDropDepth(landmarks, cal, hand);

      if (!cluster) {
        cluster = {
          startTime: frame.timeSeconds,
          endTime: frame.timeSeconds,
          hand,
          frames: [frame],
          landmarks: [landmarks],
          maxDropDepth: depth,
        };
      } else {
        cluster.endTime = frame.timeSeconds;
        cluster.hand = mergeHand(cluster.hand, hand);
        cluster.frames.push(frame);
        cluster.landmarks.push(landmarks);
        cluster.maxDropDepth = Math.max(cluster.maxDropDepth, depth);
      }
    } else if (cluster) {
      flushCluster(cluster, moments, minGapSeconds, lastEnd);
      cluster = null;
    }
  }

  if (cluster) {
    flushCluster(cluster, moments, minGapSeconds, lastEnd);
  }

  return moments;
}

function guardWeaknessTypeFromMoments(moments: GuardDropMoment[]): string {
  if (moments.length === 0) return "guard_drop_after_cross";

  const counts = new Map<string, number>();
  for (const moment of moments) {
    counts.set(moment.weaknessType, (counts.get(moment.weaknessType) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function guardWeaknessType(report: Report): string {
  const fromEvent = report.confirmed_events?.find((e) =>
    GUARD_WEAKNESS_TYPES.has(e.weakness_type)
  )?.weakness_type;
  if (fromEvent) return fromEvent;

  const title = report.main_weakness?.title?.toLowerCase() ?? "";
  if (title.includes("kick")) return "dropping_guard_on_kick";
  if (title.includes("return") || title.includes("slow")) {
    return "slow_guard_return";
  }
  if (title.includes("guard")) return "guard_drop_after_cross";
  return "guard_drop_after_cross";
}

function formatGuardSummary(moments: GuardDropMoment[]): string {
  if (moments.length === 0) {
    return "No guard drops detected — both wrists stayed above your guard line for the whole clip.";
  }

  const stamps = moments.map((m) => m.timestamp).join(", ");
  if (moments.length === 1) {
    return `1 guard drop at ${stamps} — ${moments[0].detail}`;
  }

  return `${moments.length} guard drops at ${stamps}. Each timestamp below shows which hand dropped and how to reset it.`;
}

export function guardHomeCardHint(
  dropCount: number,
  moments: GuardDropMoment[]
): string {
  if (dropCount === 0) return "Hands stayed up in latest clip";
  if (moments.length === 1) {
    return `${moments[0].timestamp} — ${moments[0].title.toLowerCase()}`;
  }
  const preview = moments
    .slice(0, 2)
    .map((m) => m.timestamp)
    .join(", ");
  const extra =
    moments.length > 2 ? ` +${moments.length - 2} more` : "";
  return `${dropCount} drops · ${preview}${extra}`;
}

export function analyzeGuardFromReport(report: Report): GuardDropAnalysis {
  const timeline = report.raw_landmark_data ?? [];
  const calibration = parseGuardCalibration(report.landmark_summary);

  let moments = extractGuardMomentsFromTimeline(timeline, 1.25, calibration);

  const guardEvents = (report.confirmed_events ?? []).filter((e) =>
    GUARD_WEAKNESS_TYPES.has(e.weakness_type)
  );

  if (moments.length === 0 && guardEvents.length > 0) {
    moments = guardEvents.map((e, i) => {
      const hand: GuardDropMoment["hand"] = e.jointHighlight?.includes("left")
        ? "left"
        : e.jointHighlight?.includes("right")
          ? "right"
          : "right";
      const weaknessType = GUARD_WEAKNESS_TYPES.has(e.weakness_type)
        ? e.weakness_type
        : "guard_drop_after_cross";
      const timeSeconds = e.timeSeconds ?? parseTimestamp(e.timestamp);
      const timestamp =
        e.timestamp || (timeSeconds >= 0 ? formatTime(timeSeconds) : "0:00");
      const copy = buildMomentCopy(
        timestamp,
        hand,
        weaknessType,
        0.4,
        0.03
      );
      return {
        id: `guard-${i}`,
        timestamp,
        timeSeconds,
        hand,
        weaknessType,
        title: e.label?.trim() || copy.title,
        detail: copy.detail,
        fix: copy.fix,
      };
    });
  }

  if (moments.length === 0 && report.main_weakness?.timestamp) {
    const weaknessType = guardWeaknessType(report);
    const t = parseTimestamp(report.main_weakness.timestamp);
    if (t >= 0) {
      const timestamp = report.main_weakness.timestamp;
      const copy = buildMomentCopy(timestamp, "right", weaknessType, 0.4, 0.03);
      moments = [
        {
          id: "guard-0",
          timestamp,
          timeSeconds: t,
          hand: "right",
          weaknessType,
          title: copy.title,
          detail:
            report.main_weakness.what_is_happening?.trim() || copy.detail,
          fix: report.main_weakness.mechanical_fix?.trim() || copy.fix,
        },
      ];
    }
  }

  const primaryType = guardWeaknessTypeFromMoments(moments) || guardWeaknessType(report);
  const ratioRaw = report.landmark_summary?.guard_drop_frame_ratio;
  const dropPercent =
    typeof ratioRaw === "number"
      ? Math.round(ratioRaw)
      : timeline.length > 0
        ? Math.round((moments.length / Math.max(timeline.length / 12, 1)) * 100)
        : 0;

  const dropCount = moments.length;
  const primaryFix = moments[0]?.fix;
  const mechanicalFix =
    primaryFix ||
    report.main_weakness?.mechanical_fix ||
    buildMomentCopy("0:00", "right", primaryType, 0.4, 0.03).fix;

  return {
    dropCount,
    dropPercent,
    moments,
    mechanicalFix,
    fightConsequence:
      GUARD_CONSEQUENCE[primaryType] ?? GUARD_CONSEQUENCE.default,
    drillName:
      primaryType === "dropping_guard_on_kick"
        ? "Slow teep with lead hand glued"
        : primaryType === "slow_guard_return"
          ? "Jab-cross instant recoil"
          : report.drill?.name ?? "Mirror guard-return drill",
    summary: formatGuardSummary(moments),
  };
}

export function liveGuardDropLabel(
  metrics: ReturnType<typeof computeFrameMetrics>
): { title: string; detail: string; fix: string; confidence: number } | null {
  if (!metrics.metrics_reliable || !metrics.guard_dropped) return null;
  const hand = resolveHand(metrics);
  const copy = buildMomentCopy("now", hand, "guard_drop_after_cross", 0.2, 0.025);
  return {
    title: handLabel(hand),
    detail: copy.detail.replace("At now, ", "").replace(/^At now/, "Right now,"),
    fix: copy.fix.replace("At now, ", "Now — "),
    confidence: metrics.guard_confidence,
  };
}
