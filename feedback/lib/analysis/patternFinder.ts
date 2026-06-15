import { getSportConfig } from "@/config/sports";
import {
  kickEventToConfidence,
  type KickEvent,
} from "@/lib/analysis/kickAnalysis";
import {
  buildTimelineContext,
  guardDropInRecoveryWindow,
  type TimelineContext,
} from "@/lib/analysis/timelineAnalysis";
import { isWeaknessConfirmedInFrame } from "@/lib/analysis/poseMetrics";
import type {
  LandmarkTimeline,
  PatternAnalysisResult,
  PatternEvent,
  SportId,
} from "@/types";

const MIN_GUARD_STREAK = 4;

export async function findPatterns(
  timeline: LandmarkTimeline,
  sport: SportId
): Promise<PatternAnalysisResult> {
  const sportConfig = getSportConfig(sport);
  const context = buildTimelineContext(timeline);
  const events: PatternEvent[] = [];
  const weaknessCounts: Record<string, number> = {};

  for (const weakness of sportConfig.common_weaknesses) {
    const detected = detectWeakness(context, weakness, sport, timeline);
    if (detected.length > 0) {
      weaknessCounts[weakness] = detected.length;
      events.push(...detected);
    }
  }

  const primaryWeakness = pickPrimaryWeakness(weaknessCounts, context, sport);

  const frequency = primaryWeakness ? (weaknessCounts[primaryWeakness] ?? 0) : 0;
  const fatigueDetected = detectFatigue(timeline, events);

  return {
    primary_weakness: primaryWeakness,
    frequency,
    pattern_data: {
      weaknessCounts,
      eventCount: events.length,
      guard_calibrated: context.calibration !== null,
      kick_events: context.kickEvents.length,
    },
    fatigue_detected: fatigueDetected,
    events,
    session_landmarks: timeline,
  };
}

function detectWeakness(
  context: TimelineContext,
  weaknessType: string,
  sport: SportId,
  timeline: LandmarkTimeline
): PatternEvent[] {
  switch (weaknessType) {
    case "guard_drop_after_cross":
    case "dropping_guard_on_kick":
    case "slow_guard_return":
      return detectGuardDrop(context, weaknessType);
    case "elbow_flare_on_cross":
      return detectElbowFlare(context);
    case "chin_up":
    case "chin_up_in_clinch":
      return detectChinUp(context);
    case "no_head_movement":
      return detectStaticHead(timeline);
    case "over_the_top_swing":
      return detectOverTheTop(context, timeline);
    case "no_unit_turn":
      return detectNoUnitTurn(context);
    case "overcommitting_weight":
      return detectOvercommittingWeight(context);
    case "no_pivot_on_roundhouse":
      return kickEventsToPatterns(context.kickEvents, "no_pivot_on_roundhouse");
    case "kicking_with_foot_not_shin":
      return kickEventsToPatterns(
        context.kickEvents,
        "kicking_with_foot_not_shin"
      );
    case "no_chamber_on_knee":
      return kickEventsToPatterns(context.kickEvents, "no_chamber_on_knee");
    default:
      return [];
  }
}

function kickEventsToPatterns(
  kickEvents: KickEvent[],
  weaknessType: string
): PatternEvent[] {
  return kickEvents
    .filter((event) => {
      if (weaknessType === "no_pivot_on_roundhouse") {
        return event.insufficientPivot;
      }
      if (weaknessType === "kicking_with_foot_not_shin") {
        return event.footStrikeLikely;
      }
      if (weaknessType === "no_chamber_on_knee") {
        return event.lowChamber;
      }
      return false;
    })
    .map((event) => ({
      weakness_type: weaknessType,
      start_frame: event.chamberStartIdx,
      end_frame: event.endIdx,
      start_timestamp: event.start_timestamp,
      end_timestamp: event.end_timestamp,
      confidence: kickEventToConfidence(event),
    }));
}

function pickPrimaryWeakness(
  weaknessCounts: Record<string, number>,
  context: TimelineContext,
  sport: SportId
): string {
  const ranked = Object.entries(weaknessCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (ranked.length > 0) return ranked[0][0];

  if (context.frames.length < 8) return "";

  let guardDropFrames = 0;
  let lowElbowFrames = 0;
  let chinUpFrames = 0;
  let lowHipRotation = 0;
  let highHipRotation = 0;
  const n = context.frames.length;

  for (const { metrics } of context.frames) {
    if (!metrics.metrics_reliable) continue;
    if (metrics.guard_dropped) guardDropFrames++;
    if (
      metrics.right_elbow_angle !== null &&
      metrics.right_elbow_angle < 152
    ) {
      lowElbowFrames++;
    }
    if (metrics.chin_elevated) chinUpFrames++;
    if (
      metrics.hip_rotation_deg !== null &&
      metrics.hip_rotation_deg < 20
    ) {
      lowHipRotation++;
    }
    if (
      metrics.hip_rotation_deg !== null &&
      metrics.hip_rotation_deg > 58
    ) {
      highHipRotation++;
    }
  }

  const guardRatio = guardDropFrames / n;
  const elbowRatio = lowElbowFrames / n;
  const chinRatio = chinUpFrames / n;
  const hipRatio = lowHipRotation / n;
  const overcommitRatio = highHipRotation / n;

  if (sport === "muaythai" || sport === "mma") {
    const badKicks = context.kickEvents.filter((e) => e.insufficientPivot);
    const footKicks = context.kickEvents.filter((e) => e.footStrikeLikely);
    const lowChamber = context.kickEvents.filter((e) => e.lowChamber);
    if (badKicks.length >= 2) return "no_pivot_on_roundhouse";
    if (footKicks.length >= 2) return "kicking_with_foot_not_shin";
    if (lowChamber.length >= 2) return "no_chamber_on_knee";
    if (guardRatio > 0.18) return "dropping_guard_on_kick";
    if (hipRatio > 0.32) return "no_pivot_on_roundhouse";
  }

  if (guardRatio > 0.18) return "guard_drop_after_cross";
  if (elbowRatio > 0.15) return "elbow_flare_on_cross";
  if (chinRatio > 0.22) return "chin_up";
  if (overcommitRatio > 0.22 && sport === "boxing") {
    return "overcommitting_weight";
  }
  if (hipRatio > 0.32 && sport === "boxing") return "overcommitting_weight";

  return "";
}

function detectGuardDrop(
  context: TimelineContext,
  weaknessType: string
): PatternEvent[] {
  const events: PatternEvent[] = [];
  let streak = 0;
  let startIdx = 0;
  let confidenceSum = 0;

  const flush = (endIdx: number) => {
    if (streak < MIN_GUARD_STREAK) {
      streak = 0;
      confidenceSum = 0;
      return;
    }
    const start = context.frames[startIdx];
    const end = context.frames[endIdx];
    if (!start || !end) return;

    events.push({
      weakness_type: weaknessType,
      start_frame: start.frame,
      end_frame: end.frame,
      start_timestamp: start.timestamp,
      end_timestamp: end.timestamp,
      confidence: Math.min(
        1,
        (confidenceSum / streak) * Math.min(1, streak / 8)
      ),
    });
    streak = 0;
    confidenceSum = 0;
  };

  for (let i = 0; i < context.frames.length; i++) {
    const analysis = context.frames[i];
    const inWindow = guardDropInRecoveryWindow(analysis, weaknessType);

    if (inWindow) {
      if (streak === 0) startIdx = i;
      streak++;
      confidenceSum += analysis.metrics.guard_confidence;
    } else if (streak > 0) {
      flush(i - 1);
    }
  }

  if (streak > 0) {
    flush(context.frames.length - 1);
  }

  return events;
}

function detectElbowFlare(context: TimelineContext): PatternEvent[] {
  const events: PatternEvent[] = [];
  let streak = 0;
  let startIdx = 0;

  for (let i = 0; i < context.frames.length; i++) {
    const frame = context.frames[i];
    const m = frame.metrics;
    const flared =
      m.metrics_reliable &&
      isWeaknessConfirmedInFrame("elbow_flare_on_cross", m, frame.kick) &&
      frame.postRearExtension;

    if (flared) {
      if (streak === 0) startIdx = i;
      streak++;
    } else if (streak >= 3) {
      const start = context.frames[startIdx];
      const end = context.frames[i - 1];
      events.push({
        weakness_type: "elbow_flare_on_cross",
        start_frame: start.frame,
        end_frame: end.frame,
        start_timestamp: start.timestamp,
        end_timestamp: end.timestamp,
        confidence: Math.min(1, 0.65 + streak * 0.05),
      });
      streak = 0;
    } else {
      streak = 0;
    }
  }

  return events;
}

function detectChinUp(context: TimelineContext): PatternEvent[] {
  const events: PatternEvent[] = [];
  let streak = 0;
  let startIdx = 0;

  for (let i = 0; i < context.frames.length; i++) {
    const m = context.frames[i].metrics;
    if (m.metrics_reliable && m.chin_elevated) {
      if (streak === 0) startIdx = i;
      streak++;
    } else if (streak >= 6) {
      const start = context.frames[startIdx];
      const end = context.frames[i - 1];
      events.push({
        weakness_type: "chin_up",
        start_frame: start.frame,
        end_frame: end.frame,
        start_timestamp: start.timestamp,
        end_timestamp: end.timestamp,
        confidence: Math.min(1, 0.55 + streak * 0.04),
      });
      streak = 0;
    } else {
      streak = 0;
    }
  }

  return events;
}

function detectOvercommittingWeight(context: TimelineContext): PatternEvent[] {
  const events: PatternEvent[] = [];
  let streak = 0;
  let startIdx = 0;

  for (let i = 0; i < context.frames.length; i++) {
    const frame = context.frames[i];
    const over =
      frame.metrics.metrics_reliable &&
      isWeaknessConfirmedInFrame(
        "overcommitting_weight",
        frame.metrics,
        frame.kick
      ) &&
      (frame.postRearExtension || frame.postLeadExtension);

    if (over) {
      if (streak === 0) startIdx = i;
      streak++;
    } else if (streak >= 4) {
      const start = context.frames[startIdx];
      const end = context.frames[i - 1];
      events.push({
        weakness_type: "overcommitting_weight",
        start_frame: start.frame,
        end_frame: end.frame,
        start_timestamp: start.timestamp,
        end_timestamp: end.timestamp,
        confidence: Math.min(1, 0.6 + streak * 0.05),
      });
      streak = 0;
    } else {
      streak = 0;
    }
  }

  return events;
}

function detectStaticHead(timeline: LandmarkTimeline): PatternEvent[] {
  if (timeline.length < 20) return [];

  const nosePositions = timeline
    .map((f) => f.landmarks.nose)
    .filter(Boolean) as { x: number; y: number }[];

  if (nosePositions.length < 20) return [];

  const xs = nosePositions.map((p) => p.x);
  const range = Math.max(...xs) - Math.min(...xs);

  if (range < 0.03) {
    return [
      {
        weakness_type: "no_head_movement",
        start_frame: 0,
        end_frame: timeline.length - 1,
        start_timestamp: timeline[0].timestamp,
        end_timestamp: timeline[timeline.length - 1].timestamp,
        confidence: 0.8,
      },
    ];
  }

  return [];
}

function detectOverTheTop(
  context: TimelineContext,
  timeline: LandmarkTimeline
): PatternEvent[] {
  const events: PatternEvent[] = [];

  for (let i = 5; i < context.frames.length; i++) {
    if (!context.frames[i].metrics.metrics_reliable) continue;

    const frame = timeline[i];
    const lw = frame?.landmarks.left_wrist;
    const le = frame?.landmarks.left_elbow;
    const ls = frame?.landmarks.left_shoulder;

    if (!lw || !le || !ls) continue;

    const overTheTop = lw.y < ls.y && le.x > ls.x + 0.1;
    if (overTheTop) {
      events.push({
        weakness_type: "over_the_top_swing",
        start_frame: frame.frame,
        end_frame: frame.frame + 5,
        start_timestamp: frame.timestamp,
        end_timestamp: frame.timestamp,
        confidence: 0.65,
      });
    }
  }

  return events;
}

function detectNoUnitTurn(context: TimelineContext): PatternEvent[] {
  const events: PatternEvent[] = [];

  for (const analysis of context.frames) {
    const m = analysis.metrics;
    if (
      m.metrics_reliable &&
      m.hip_rotation_deg !== null &&
      m.hip_rotation_deg < 12 &&
      analysis.postRearExtension
    ) {
      events.push({
        weakness_type: "no_unit_turn",
        start_frame: analysis.frame,
        end_frame: analysis.frame + 3,
        start_timestamp: analysis.timestamp,
        end_timestamp: analysis.timestamp,
        confidence: 0.65,
      });
    }
  }

  return events;
}

function detectFatigue(
  timeline: LandmarkTimeline,
  events: PatternEvent[]
): boolean {
  if (timeline.length < 30 || events.length < 4) return false;

  const midpoint = Math.floor(timeline.length / 2);
  const firstHalf = events.filter((e) => e.start_frame < midpoint).length;
  const secondHalf = events.filter((e) => e.start_frame >= midpoint).length;

  return secondHalf > firstHalf * 1.5;
}
