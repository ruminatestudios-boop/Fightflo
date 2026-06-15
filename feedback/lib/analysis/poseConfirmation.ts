import { buildTimelineContext } from "@/lib/analysis/timelineAnalysis";
import { isWeaknessConfirmedInFrame } from "@/lib/analysis/poseMetrics";
import type { LandmarkTimeline, PatternAnalysisResult, PatternEvent } from "@/types";

/** Keep only pattern events that pose metrics confirm at that frame */
export function filterConfirmedPatternEvents(
  timeline: LandmarkTimeline,
  events: PatternEvent[]
): PatternEvent[] {
  const { frames } = buildTimelineContext(timeline);

  return events.filter((event) => {
    const analysis = frames[event.start_frame];
    if (!analysis) return false;
    return isWeaknessConfirmedInFrame(
      event.weakness_type,
      analysis.metrics,
      analysis.kick
    );
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
  const { frames } = buildTimelineContext(timeline);

  for (const analysis of frames) {
    if (Math.abs(analysis.timeSeconds - timeSeconds) > windowSeconds) continue;
    if (analysis.metrics.guard_dropped && analysis.metrics.metrics_reliable) {
      return true;
    }
  }
  return false;
}
