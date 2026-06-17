import { formatTime } from "@/components/video/utils";
import { parseTimestamp } from "@/lib/analysis/timestamps";
import { extractGuardMomentsFromTimeline } from "@/lib/guard/guardAnalysis";
import {
  buildTimelineContext,
  type FrameAnalysis,
  type TimelineContext,
} from "@/lib/analysis/timelineAnalysis";
import {
  jointForWeakness,
  humanLabelForWeakness,
  type FrameMetrics,
} from "@/lib/analysis/poseMetrics";
import type {
  ConfirmedPoseEvent,
  FrameLandmarks,
  LandmarkTimeline,
  SportId,
} from "@/types";

export type FoundationPillarId =
  | "guard_recovery"
  | "head_position"
  | "strike_mechanics"
  | "hip_power"
  | "kick_mechanics";

export interface FoundationPillar {
  id: FoundationPillarId;
  label: string;
  score: number;
  status: "solid" | "developing" | "needs_work";
  evidence: string;
}

export interface FoundationMoment {
  timestamp: string;
  timeSeconds: number;
  weaknessType: string;
  pillar: FoundationPillarId;
  title: string;
  detail: string;
  fix: string;
  joint: keyof FrameLandmarks;
}

export interface SkillFoundationReport {
  pillars: FoundationPillar[];
  primaryGap: FoundationPillarId;
  primaryWeaknessType: string;
  moments: FoundationMoment[];
  summary: string;
  coachSummarySeed: string;
  drillName: string;
  mechanicalFix: string;
  frequencyLabel: string;
}

const MIN_CLUSTER_FRAMES = 4;
const MIN_GAP_SEC = 1.2;

function pillarStatus(score: number): FoundationPillar["status"] {
  if (score >= 72) return "solid";
  if (score >= 48) return "developing";
  return "needs_work";
}

function duringExtension(frame: FrameAnalysis): boolean {
  return frame.postRearExtension || frame.postLeadExtension;
}

function duringKick(frame: FrameAnalysis): boolean {
  return (
    frame.kick.inExtension ||
    frame.kick.atPeak ||
    frame.kick.inChamber
  );
}

function clusterMetricMoments(
  context: TimelineContext,
  predicate: (frame: FrameAnalysis) => boolean,
  buildCopy: (
    start: FrameAnalysis,
    end: FrameAnalysis,
    frames: FrameAnalysis[]
  ) => Pick<FoundationMoment, "title" | "detail" | "fix" | "weaknessType" | "pillar">
): FoundationMoment[] {
  const moments: FoundationMoment[] = [];
  let streak: FrameAnalysis[] = [];
  let lastEnd = -999;

  const flush = () => {
    if (streak.length < MIN_CLUSTER_FRAMES) {
      streak = [];
      return;
    }
    const start = streak[0];
    const end = streak[streak.length - 1];
    if (start.timeSeconds - lastEnd < MIN_GAP_SEC && moments.length > 0) {
      streak = [];
      return;
    }
    const copy = buildCopy(start, end, streak);
    moments.push({
      timestamp: formatTime(start.timeSeconds),
      timeSeconds: start.timeSeconds,
      joint: jointForWeakness(copy.weaknessType),
      ...copy,
    });
    lastEnd = end.timeSeconds;
    streak = [];
  };

  for (const frame of context.frames) {
    if (!frame.metrics.metrics_reliable) {
      if (streak.length) flush();
      continue;
    }
    if (predicate(frame)) {
      streak.push(frame);
    } else if (streak.length) {
      flush();
    }
  }
  if (streak.length) flush();

  return moments;
}

function extractChinMoments(context: TimelineContext): FoundationMoment[] {
  return clusterMetricMoments(
    context,
    (f) => f.metrics.chin_elevated && !f.metrics.guard_dropped,
    (start, end, frames) => {
      const duration = Math.max(0.1, end.timeSeconds - start.timeSeconds);
      const inCombo = frames.some((f) => duringExtension(f));
      return {
        weaknessType: "chin_up",
        pillar: "head_position",
        title: "Chin riding up",
        detail: `At ${formatTime(start.timeSeconds)}, chin sat above the shoulder line for ${duration.toFixed(1)}s${inCombo ? " while throwing" : ""} — head exposed.`,
        fix: `At ${formatTime(start.timeSeconds)}, tuck chin to lead shoulder before the next punch. Eyes look through eyebrows, not up at an imaginary target.`,
      };
    }
  );
}

function extractElbowMoments(context: TimelineContext): FoundationMoment[] {
  return clusterMetricMoments(
    context,
    (f) =>
      duringExtension(f) &&
      f.metrics.right_elbow_angle !== null &&
      f.metrics.right_elbow_angle < 152,
    (start, end, frames) => {
      const angles = frames
        .map((f) => f.metrics.right_elbow_angle)
        .filter((a): a is number => a !== null);
      const minAngle = angles.length ? Math.min(...angles) : 0;
      const afterCross = frames.some((f) => f.postRearExtension);
      return {
        weaknessType: "elbow_flare_on_cross",
        pillar: "strike_mechanics",
        title: "Elbow flared on extension",
        detail: `At ${formatTime(start.timeSeconds)}, rear elbow opened to ${Math.round(minAngle)}°${afterCross ? " on the cross" : " on extension"} — rib line exposed.`,
        fix: `At ${formatTime(start.timeSeconds)}, punch through a narrow tunnel: elbow brushes ribs until the hand leaves guard, then extends.`,
      };
    }
  );
}

function extractFlatHipMoments(context: TimelineContext): FoundationMoment[] {
  return clusterMetricMoments(
    context,
    (f) =>
      duringExtension(f) &&
      f.metrics.hip_rotation_deg !== null &&
      f.metrics.hip_rotation_deg < 20,
    (start, end) => {
      const hip = start.metrics.hip_rotation_deg ?? 0;
      return {
        weaknessType: "overcommitting_weight",
        pillar: "hip_power",
        title: "Hips square on the shot",
        detail: `At ${formatTime(start.timeSeconds)}, shoulders and hips stayed square (${Math.round(hip)}° rotation) through extension — arm-only power.`,
        fix: `At ${formatTime(start.timeSeconds)}, turn the rear hip first on the cross. Rear heel drives, then hand fires.`,
      };
    }
  );
}

function guardMomentsToFoundation(
  timeline: LandmarkTimeline
): FoundationMoment[] {
  return extractGuardMomentsFromTimeline(timeline).map((m) => ({
    timestamp: m.timestamp,
    timeSeconds: m.timeSeconds,
    weaknessType: m.weaknessType,
    pillar: "guard_recovery" as const,
    title: m.title,
    detail: m.detail,
    fix: m.fix,
    joint: jointForWeakness(m.weaknessType),
  }));
}

function extractKickMoments(context: TimelineContext): FoundationMoment[] {
  const moments: FoundationMoment[] = [];

  for (const event of context.kickEvents) {
    if (event.insufficientPivot) {
      moments.push({
        timestamp: event.peak_timestamp,
        timeSeconds: parseTimestamp(event.peak_timestamp),
        weaknessType: "no_pivot_on_roundhouse",
        pillar: "kick_mechanics",
        title: "No pivot on kick",
        detail: `At ${event.peak_timestamp}, ${event.side} kick fired with only ${(event.plantedPivotLateral * 100).toFixed(0)}% pivot on the planted foot — hips never fully opened.`,
        fix: `At ${event.peak_timestamp}, pivot the ball of the planted foot until your heel points at target before extending the shin.`,
        joint: "right_ankle",
      });
    }
    if (event.footStrikeLikely) {
      moments.push({
        timestamp: event.peak_timestamp,
        timeSeconds: parseTimestamp(event.peak_timestamp),
        weaknessType: "kicking_with_foot_not_shin",
        pillar: "kick_mechanics",
        title: "Foot strike instead of shin",
        detail: `At ${event.peak_timestamp}, ${event.side} kick contacted with the foot instead of shin — weak transfer and injury risk.`,
        fix: `At ${event.peak_timestamp}, point toes down and strike with the lower shin on every rep.`,
        joint: "right_ankle",
      });
    }
    if (event.lowChamber) {
      moments.push({
        timestamp: event.peak_timestamp,
        timeSeconds: parseTimestamp(event.peak_timestamp),
        weaknessType: "no_chamber_on_knee",
        pillar: "kick_mechanics",
        title: "Low knee chamber",
        detail: `At ${event.peak_timestamp}, ${event.side} kick left the ground without a hip-height chamber — telegraphed and weak.`,
        fix: `At ${event.peak_timestamp}, pause with knee at hip height before every extension.`,
        joint: "right_knee",
      });
    }
  }

  return moments;
}

function computePillars(
  context: TimelineContext,
  sport: SportId,
  moments: FoundationMoment[]
): FoundationPillar[] {
  const reliable = context.frames.filter((f) => f.metrics.metrics_reliable);
  const n = reliable.length || 1;

  const guardDropFrames = reliable.filter((f) => f.metrics.guard_dropped).length;
  const guardDropInRecovery = reliable.filter(
    (f) => f.metrics.guard_dropped && duringExtension(f)
  ).length;
  const chinFrames = reliable.filter((f) => f.metrics.chin_elevated).length;
  const elbowFlareFrames = reliable.filter(
    (f) =>
      duringExtension(f) &&
      f.metrics.right_elbow_angle !== null &&
      f.metrics.right_elbow_angle < 152
  ).length;
  const extensionFrames = reliable.filter(duringExtension).length || 1;
  const flatHipFrames = reliable.filter(
    (f) =>
      duringExtension(f) &&
      f.metrics.hip_rotation_deg !== null &&
      f.metrics.hip_rotation_deg < 20
  ).length;

  const guardRatio = guardDropFrames / n;
  const recoveryRatio = guardDropInRecovery / extensionFrames;
  const chinRatio = chinFrames / n;
  const elbowRatio = elbowFlareFrames / extensionFrames;
  const flatHipRatio = flatHipFrames / extensionFrames;

  const guardScore = Math.round(
    100 - guardRatio * 120 - recoveryRatio * 80
  );
  const headScore = Math.round(100 - chinRatio * 130);
  const strikeScore = Math.round(100 - elbowRatio * 110);
  const hipScore = Math.round(100 - flatHipRatio * 100);

  const pillars: FoundationPillar[] = [
    {
      id: "guard_recovery",
      label: "Guard & recovery",
      score: Math.max(0, Math.min(100, guardScore)),
      status: pillarStatus(guardScore),
      evidence:
        guardDropFrames === 0
          ? "Hands stayed at guard height across the clip."
          : `${guardDropFrames} frames below guard (${Math.round(guardRatio * 100)}% of tracked time)${guardDropInRecovery > 0 ? `, ${guardDropInRecovery} during punch recovery` : ""}.`,
    },
    {
      id: "head_position",
      label: "Head & chin",
      score: Math.max(0, Math.min(100, headScore)),
      status: pillarStatus(headScore),
      evidence:
        chinFrames === 0
          ? "Chin stayed tucked through the clip."
          : `Chin lifted in ${chinFrames} frames (${Math.round(chinRatio * 100)}% of tracked time).`,
    },
    {
      id: "strike_mechanics",
      label: "Hand mechanics",
      score: Math.max(0, Math.min(100, strikeScore)),
      status: pillarStatus(strikeScore),
      evidence:
        elbowFlareFrames === 0
          ? "Elbows stayed in on extension."
          : `Rear elbow flared on ${elbowFlareFrames} extension frames (avg angle issue on crosses).`,
    },
    {
      id: "hip_power",
      label: "Hip turn & power",
      score: Math.max(0, Math.min(100, hipScore)),
      status: pillarStatus(hipScore),
      evidence:
        flatHipFrames === 0
          ? "Hips rotated with punches."
          : `Hips stayed square on ${flatHipFrames} extension frames — arm-only shots.`,
    },
  ];

  if (sport === "muaythai" || sport === "mma") {
    const badKicks = context.kickEvents.filter(
      (e) => e.insufficientPivot || e.footStrikeLikely || e.lowChamber
    ).length;
    const kickTotal = context.kickEvents.length || 1;
    const kickScore = Math.round(100 - (badKicks / kickTotal) * 100);
    pillars.push({
      id: "kick_mechanics",
      label: "Kick mechanics",
      score: Math.max(0, Math.min(100, kickScore)),
      status: pillarStatus(kickScore),
      evidence:
        badKicks === 0
          ? `${context.kickEvents.length} kicks with clean chamber and pivot.`
          : `${badKicks} of ${context.kickEvents.length} kicks flagged for chamber, pivot, or shin contact.`,
    });
  }

  void moments;
  return pillars;
}

const PILLAR_DRILLS: Record<FoundationPillarId, string> = {
  guard_recovery: "Mirror shadow — touch cheeks after every cross, count frames until guard returns",
  head_position: "Chin-to-shoulder shadow — pause in guard every 4 punches",
  strike_mechanics: "Wall elbow drill — elbows grazing ribs for 2 min",
  hip_power: "Hip-first shadow — pivot rear foot on every cross",
  kick_mechanics: "Slow teep & roundhouse — chamber pause, pivot check on every rep",
};

function pickPrimaryGap(
  pillars: FoundationPillar[],
  moments: FoundationMoment[],
  confirmedEvents: ConfirmedPoseEvent[]
): { pillar: FoundationPillarId; weaknessType: string } {
  const confirmedType =
    confirmedEvents[0]?.weakness_type ??
    moments[0]?.weaknessType ??
    "";

  const pillarForWeakness: Record<string, FoundationPillarId> = {
    guard_drop_after_cross: "guard_recovery",
    dropping_guard_on_kick: "guard_recovery",
    slow_guard_return: "guard_recovery",
    chin_up: "head_position",
    chin_up_in_clinch: "head_position",
    elbow_flare_on_cross: "strike_mechanics",
    overcommitting_weight: "hip_power",
    no_pivot_on_roundhouse: "kick_mechanics",
    kicking_with_foot_not_shin: "kick_mechanics",
    no_chamber_on_knee: "kick_mechanics",
  };

  if (confirmedType && pillarForWeakness[confirmedType]) {
    return {
      pillar: pillarForWeakness[confirmedType],
      weaknessType: confirmedType,
    };
  }

  const weakest = [...pillars].sort((a, b) => a.score - b.score)[0];
  const momentForPillar = moments.find((m) => m.pillar === weakest?.id);
  return {
    pillar: weakest?.id ?? "guard_recovery",
    weaknessType:
      momentForPillar?.weaknessType ??
      (weakest?.id === "guard_recovery"
        ? "guard_drop_after_cross"
        : weakest?.id === "head_position"
          ? "chin_up"
          : weakest?.id === "strike_mechanics"
            ? "elbow_flare_on_cross"
            : "overcommitting_weight"),
  };
}

/** Foundation skill scan from pose timeline — drives specific, timestamped upload coaching. */
export function analyzeSkillFoundation(
  timeline: LandmarkTimeline,
  sport: SportId,
  confirmedEvents: ConfirmedPoseEvent[] = []
): SkillFoundationReport {
  if (timeline.length < 5) {
    return {
      pillars: [],
      primaryGap: "guard_recovery",
      primaryWeaknessType: "guard_drop_after_cross",
      moments: [],
      summary: "Not enough movement data — film with full body in frame.",
      coachSummarySeed: "Re-upload with your whole body visible from the side.",
      drillName: PILLAR_DRILLS.guard_recovery,
      mechanicalFix: "Film from the side with full body in frame at 12+ seconds.",
      frequencyLabel: "Insufficient tracking data",
    };
  }

  const context = buildTimelineContext(timeline);

  const moments = [
    ...guardMomentsToFoundation(timeline),
    ...extractChinMoments(context),
    ...extractElbowMoments(context),
    ...extractFlatHipMoments(context),
    ...(sport === "muaythai" || sport === "mma"
      ? extractKickMoments(context)
      : []),
  ].sort((a, b) => a.timeSeconds - b.timeSeconds);

  const pillars = computePillars(context, sport, moments);
  const { pillar: primaryGap, weaknessType: primaryWeaknessType } =
    pickPrimaryGap(pillars, moments, confirmedEvents);

  const primaryMoment =
    moments.find((m) => m.weaknessType === primaryWeaknessType) ??
    moments.find((m) => m.pillar === primaryGap) ??
    moments[0];

  const primaryPillar = pillars.find((p) => p.id === primaryGap);
  const gapLabel = primaryPillar?.label ?? "Fundamentals";
  const frequencyLabel =
    confirmedEvents.length > 0
      ? `${confirmedEvents.length} pose-confirmed instance${confirmedEvents.length === 1 ? "" : "s"} in this clip`
      : moments.length > 0
        ? `${moments.length} tracked moment${moments.length === 1 ? "" : "s"} in this clip`
        : "No major foundation gaps flagged";

  const summary = primaryMoment
    ? `Foundation gap: ${gapLabel.toLowerCase()}. ${primaryMoment.detail}`
    : primaryPillar
      ? `${gapLabel}: ${primaryPillar.evidence}`
      : "Foundation looks solid on this clip — keep building on what you did well.";

  const coachSummarySeed = primaryMoment
    ? `${gapLabel} is your base to fix first. ${primaryMoment.detail} Start at ${primaryMoment.timestamp}.`
    : `Strongest foundation area: ${[...pillars].sort((a, b) => b.score - a.score)[0]?.label ?? "movement quality"}.`;

  return {
    pillars,
    primaryGap,
    primaryWeaknessType,
    moments,
    summary,
    coachSummarySeed,
    drillName: PILLAR_DRILLS[primaryGap],
    mechanicalFix:
      primaryMoment?.fix ??
      `Address ${humanLabelForWeakness(primaryWeaknessType).toLowerCase()} with the drill below.`,
    frequencyLabel,
  };
}

export function enrichConfirmedEvents(
  timeline: LandmarkTimeline,
  events: ConfirmedPoseEvent[],
  foundation: SkillFoundationReport
): ConfirmedPoseEvent[] {
  if (events.length === 0) return events;

  const { frames } = buildTimelineContext(timeline);

  return events.map((event) => {
    const moment =
      foundation.moments.find(
        (m) =>
          m.weaknessType === event.weakness_type &&
          Math.abs(m.timeSeconds - event.timeSeconds) < 1.0
      ) ??
      foundation.moments.find((m) => m.weaknessType === event.weakness_type);

    if (moment) {
      return {
        ...event,
        label: moment.title,
        detail: moment.detail,
        mechanical_fix: moment.fix,
        evidence: moment.detail,
        pillar: moment.pillar,
        jointHighlight: moment.joint,
      };
    }

    const frame = frames.find(
      (f) => Math.abs(f.timeSeconds - event.timeSeconds) < 0.35
    );
    if (!frame) return event;

    const built = buildEventCopyFromFrame(event.weakness_type, frame);
    return {
      ...event,
      label: built.title,
      detail: built.detail,
      mechanical_fix: built.fix,
      evidence: built.detail,
      jointHighlight: jointForWeakness(event.weakness_type),
    };
  });
}

function buildEventCopyFromFrame(
  weaknessType: string,
  frame: FrameAnalysis
): { title: string; detail: string; fix: string } {
  const at = formatTime(frame.timeSeconds);
  const m = frame.metrics;

  switch (weaknessType) {
    case "guard_drop_after_cross":
    case "dropping_guard_on_kick":
    case "slow_guard_return": {
      const hand = handFromMetrics(m);
      return {
        title: hand === "lead" ? "Lead hand dropped" : "Rear hand dropped",
        detail: `At ${at}, ${hand} hand sat below cheek height${duringExtension(frame) ? " during punch recovery" : ""} (guard confidence ${Math.round(m.guard_confidence * 100)}%).`,
        fix: `At ${at}, snap ${hand} hand back to cheek before feet move or the next shot.`,
      };
    }
    case "elbow_flare_on_cross":
      return {
        title: "Elbow flared on extension",
        detail: `At ${at}, rear elbow at ${Math.round(m.right_elbow_angle ?? 0)}° on extension — telegraphs the cross.`,
        fix: `At ${at}, keep elbow on the rib line until the hand extends.`,
      };
    case "chin_up":
      return {
        title: "Chin riding up",
        detail: `At ${at}, chin lifted above shoulder line mid-exchange.`,
        fix: `At ${at}, tuck chin to lead shoulder before throwing again.`,
      };
    default:
      return {
        title: humanLabelForWeakness(weaknessType),
        detail: `At ${at}, ${humanLabelForWeakness(weaknessType).toLowerCase()} detected on this frame.`,
        fix: `At ${at}, reset fundamentals before the next combination.`,
      };
  }
}

function handFromMetrics(m: FrameMetrics): "lead" | "rear" | "both" {
  if (m.left_wrist_below_guard && m.right_wrist_below_guard) return "both";
  if (m.left_wrist_below_guard) return "lead";
  return "rear";
}
