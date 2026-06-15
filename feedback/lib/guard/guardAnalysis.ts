import { frameTimeSeconds } from "@/components/video/landmarkPlayback";
import { formatTime, parseTimestamp } from "@/components/video/utils";
import { buildTimelineContext } from "@/lib/analysis/timelineAnalysis";
import { parseGuardCalibration } from "@/lib/analysis/guardCalibration";
import { computeFrameMetrics, type GuardCalibration } from "@/lib/analysis/poseMetrics";
import type { LandmarkTimeline, Report } from "@/types";

export interface GuardDropMoment {
  id: string;
  timestamp: string;
  timeSeconds: number;
  hand: "left" | "right" | "both";
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

const GUARD_FIX: Record<
  string,
  { detail: string; fix: string; consequence: string }
> = {
  guard_drop_after_cross: {
    detail: "Hand stayed below the cheek line after throwing — recovery window open.",
    fix: "Shadowbox return-to-cheek after every cross. Hands back before feet move.",
    consequence: "Counter hook or overhand lands clean while your guard is down.",
  },
  dropping_guard_on_kick: {
    detail: "Hands dropped while kicking — centre line exposed on one leg.",
    fix: "Keep lead hand glued to cheek through chamber and extension on slow teeps.",
    consequence: "Straight counter or teep lands while you are unbalanced.",
  },
  slow_guard_return: {
    detail: "Guard took too long to return after the combination.",
    fix: "Count frames until guard returns. Drill jab-cross with instant recoil.",
    consequence: "Opponent can punch into the gap before your hands reset.",
  },
  default: {
    detail: "Wrist dropped below guard height — hands not protecting chin.",
    fix: "Reset hands to cheek after every strike. Mirror drill: touch jaw, then punch.",
    consequence: "Clean counters land when the guard is low or late.",
  },
};

function handLabel(hand: GuardDropMoment["hand"]): string {
  if (hand === "both") return "Both hands down";
  if (hand === "left") return "Lead hand dropped";
  return "Rear hand dropped";
}

function resolveHand(metrics: ReturnType<typeof computeFrameMetrics>): GuardDropMoment["hand"] {
  if (metrics.left_wrist_below_guard && metrics.right_wrist_below_guard) return "both";
  if (metrics.left_wrist_below_guard) return "left";
  return "right";
}

function makeMoment(
  timeSeconds: number,
  hand: GuardDropMoment["hand"],
  weaknessType: string,
  index: number
): GuardDropMoment {
  const copy = GUARD_FIX[weaknessType] ?? GUARD_FIX.default;
  return {
    id: `guard-${index}`,
    timestamp: formatTime(timeSeconds),
    timeSeconds,
    hand,
    title: handLabel(hand),
    detail: copy.detail,
    fix: copy.fix,
  };
}

/** Cluster consecutive guard-drop frames into timestamped moments */
export function extractGuardMomentsFromTimeline(
  timeline: LandmarkTimeline,
  minGapSeconds = 1.25,
  calibration?: GuardCalibration | null
): GuardDropMoment[] {
  if (timeline.length === 0) return [];

  const cal =
    calibration ?? buildTimelineContext(timeline).calibration;

  const sorted = [...timeline].sort(
    (a, b) => frameTimeSeconds(a) - frameTimeSeconds(b)
  );

  const moments: GuardDropMoment[] = [];
  let clusterStart: number | null = null;
  let clusterHand: GuardDropMoment["hand"] = "right";
  let clusterFrames = 0;
  let lastEnd = -999;

  const flush = (endTime: number) => {
    if (clusterStart === null) return;
    if (endTime - clusterStart < 0.2 || clusterFrames < 3) {
      clusterStart = null;
      clusterFrames = 0;
      return;
    }
    if (clusterStart - lastEnd < minGapSeconds && moments.length > 0) {
      const prev = moments[moments.length - 1];
      prev.timeSeconds = (prev.timeSeconds + clusterStart) / 2;
      prev.timestamp = formatTime(prev.timeSeconds);
      lastEnd = endTime;
      clusterStart = null;
      clusterFrames = 0;
      return;
    }
    moments.push(
      makeMoment(clusterStart, clusterHand, "guard_drop_after_cross", moments.length)
    );
    lastEnd = endTime;
    clusterStart = null;
    clusterFrames = 0;
  };

  for (const frame of sorted) {
    const t = frameTimeSeconds(frame);
    const metrics = computeFrameMetrics(frame.landmarks, cal);
    if (
      metrics.metrics_reliable &&
      metrics.guard_dropped &&
      metrics.guard_confidence >= 0.45
    ) {
      if (clusterStart === null) clusterStart = t;
      clusterHand = resolveHand(metrics);
      clusterFrames++;
    } else {
      flush(t);
    }
  }

  if (clusterStart !== null) {
    const lastT = frameTimeSeconds(sorted[sorted.length - 1]);
    moments.push(
      makeMoment(clusterStart, clusterHand, "guard_drop_after_cross", moments.length)
    );
    lastEnd = lastT;
  }

  return moments;
}

function guardWeaknessType(report: Report): string {
  const fromEvent = report.confirmed_events?.find((e) =>
    GUARD_WEAKNESS_TYPES.has(e.weakness_type)
  )?.weakness_type;
  if (fromEvent) return fromEvent;

  const title = report.main_weakness?.title?.toLowerCase() ?? "";
  if (title.includes("kick")) return "dropping_guard_on_kick";
  if (title.includes("return") || title.includes("slow")) return "slow_guard_return";
  if (title.includes("guard")) return "guard_drop_after_cross";
  return "guard_drop_after_cross";
}

export function analyzeGuardFromReport(report: Report): GuardDropAnalysis {
  const weaknessType = guardWeaknessType(report);
  const copy = GUARD_FIX[weaknessType] ?? GUARD_FIX.default;
  const timeline = report.raw_landmark_data ?? [];
  const calibration = parseGuardCalibration(report.landmark_summary);

  let moments = extractGuardMomentsFromTimeline(timeline, 1.25, calibration);

  const guardEvents = (report.confirmed_events ?? []).filter(
    (e) =>
      GUARD_WEAKNESS_TYPES.has(e.weakness_type) ||
      e.weakness_type.includes("guard") ||
      e.weakness_type.includes("chin")
  );

  if (moments.length === 0 && guardEvents.length > 0) {
    moments = guardEvents.map((e, i) =>
      makeMoment(
        e.timeSeconds ?? parseTimestamp(e.timestamp),
        e.jointHighlight?.includes("left") ? "left" : "right",
        e.weakness_type,
        i
      )
    );
  }

  if (moments.length === 0 && report.main_weakness?.timestamp) {
    const t = parseTimestamp(report.main_weakness.timestamp);
    if (t >= 0) {
      moments = [
        makeMoment(t, "right", weaknessType, 0),
      ];
    }
  }

  const ratioRaw = report.landmark_summary?.guard_drop_frame_ratio;
  const dropPercent =
    typeof ratioRaw === "number"
      ? Math.round(ratioRaw)
      : timeline.length > 0
        ? Math.round((moments.length / Math.max(timeline.length / 12, 1)) * 100)
        : 0;

  const dropCount = moments.length;
  const summary =
    dropCount === 0
      ? "No guard drops detected in this clip — keep the same discipline in live rounds."
      : dropCount === 1
        ? "1 guard drop flagged — tap below to replay that moment in red."
        : `${dropCount} guard drops flagged across the clip (${dropPercent}% of frames with pose).`;

  return {
    dropCount,
    dropPercent,
    moments,
    mechanicalFix: report.main_weakness?.mechanical_fix || copy.fix,
    fightConsequence: report.main_weakness?.fight_consequence || copy.consequence,
    drillName: report.drill?.name ?? "Mirror guard-return drill",
    summary,
  };
}

export function liveGuardDropLabel(
  metrics: ReturnType<typeof computeFrameMetrics>
): { title: string; detail: string; fix: string; confidence: number } | null {
  if (!metrics.metrics_reliable || !metrics.guard_dropped) return null;
  const hand = resolveHand(metrics);
  const copy = GUARD_FIX.default;
  return {
    title: handLabel(hand),
    detail: copy.detail,
    fix: copy.fix,
    confidence: metrics.guard_confidence,
  };
}
