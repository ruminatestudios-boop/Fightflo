import { buildTimelineContext } from "@/lib/analysis/timelineAnalysis";
import {
  isWeaknessConfirmedInFrame,
  jointForWeakness,
  humanLabelForWeakness,
} from "@/lib/analysis/poseMetrics";
import type {
  ConfirmedPoseEvent,
  LandmarkTimeline,
  PatternAnalysisResult,
  SportId,
} from "@/types";
import type { PoseDetectionResult } from "@/lib/analysis/poseDetectionCore";
import { detectPoseWithMetaSubprocess } from "@/lib/analysis/poseDetectionSubprocess";

export type { PoseDetectionResult } from "@/lib/analysis/poseDetectionCore";

function runsInsideNextBundle(): boolean {
  return (
    typeof window === "undefined" && Boolean(process.env.NEXT_RUNTIME)
  );
}

export async function detectPose(
  framePaths: string[],
  sport: SportId
): Promise<LandmarkTimeline> {
  const result = await detectPoseWithMeta(framePaths, sport);
  return result.timeline;
}

export async function detectPoseWithMeta(
  framePaths: string[],
  sport: SportId
): Promise<PoseDetectionResult> {
  if (runsInsideNextBundle()) {
    return detectPoseWithMetaSubprocess(framePaths, sport);
  }

  const { detectPoseWithMeta: detectInNode } = await import(
    "@/lib/analysis/poseDetectionCore"
  );
  return detectInNode(framePaths, sport);
}

export function buildConfirmedEvents(
  timeline: LandmarkTimeline,
  patternData: PatternAnalysisResult
): ConfirmedPoseEvent[] {
  const { frames } = buildTimelineContext(timeline);
  const events: ConfirmedPoseEvent[] = [];
  const seen = new Set<string>();

  for (const event of patternData.events) {
    const analysis = frames[event.start_frame];
    if (!analysis) continue;

    if (
      !isWeaknessConfirmedInFrame(
        event.weakness_type,
        analysis.metrics,
        analysis.kick
      )
    ) {
      continue;
    }

    const key = `${event.weakness_type}-${event.start_timestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      weakness_type: event.weakness_type,
      timestamp: event.start_timestamp,
      timeSeconds: analysis.timeSeconds,
      jointHighlight: jointForWeakness(event.weakness_type),
      label: humanLabelForWeakness(event.weakness_type),
      confidence: event.confidence,
    });
  }

  return events;
}

export function parseTimestampToSeconds(ts: string): number {
  const parts = ts.trim().split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
