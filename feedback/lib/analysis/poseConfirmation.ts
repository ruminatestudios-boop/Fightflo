import { parseTimestamp } from "@/lib/analysis/extractFrames";
import { computeFrameMetrics, isWeaknessConfirmedInFrame } from "@/lib/analysis/poseMetrics";
import type { LandmarkTimeline, PatternAnalysisResult, PatternEvent } from "@/types";

/** Keep only pattern events that pose metrics confirm at that frame */
export function filterConfirmedPatternEvents(
  timeline: LandmarkTimeline,
  events: PatternEvent[]
): PatternEvent[] {
  return events.filter((event) => {
    const frame = timeline[event.start_frame];
    if (!frame) return false;
    const metrics = computeFrameMetrics(frame.landmarks);
    return isWeaknessConfirmedInFrame(event.weakness_type, metrics);
  });
}

/** Adjust pattern frequency to confirmed events only */
export function applyPoseConfirmation(
  timeline: LandmarkTimeline,
  patternData: PatternAnalysisResult
): PatternAnalysisResult {
  const confirmedEvents = filterConfirmedPatternEvents(
    timeline,
    patternData.events
  );

  const weaknessCounts: Record<string, number> = {};
  for (const event of confirmedEvents) {
    weaknessCounts[event.weakness_type] =
      (weaknessCounts[event.weakness_type] ?? 0) + 1;
  }

  const primaryWeakness =
    Object.entries(weaknessCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const confirmedFrequency = primaryWeakness
    ? (weaknessCounts[primaryWeakness] ?? 0)
    : 0;

  return {
    ...patternData,
    primary_weakness: primaryWeakness || patternData.primary_weakness,
    frequency: confirmedFrequency,
    events: confirmedEvents,
    pattern_data: {
      ...patternData.pattern_data,
      weaknessCounts,
      confirmed_event_count: confirmedEvents.length,
      total_event_count: patternData.events.length,
    },
  };
}

export function isGuardConfirmedAtTime(
  timeline: LandmarkTimeline,
  timeSeconds: number,
  windowSeconds = 0.4
): boolean {
  for (const frame of timeline) {
    const t = parseTimestamp(frame.timestamp);
    if (Math.abs(t - timeSeconds) > windowSeconds) continue;
    if (computeFrameMetrics(frame.landmarks).guard_dropped) return true;
  }
  return false;
}
