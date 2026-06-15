import { buildTimelineContext } from "@/lib/analysis/timelineAnalysis";
import { parseTimestamp } from "@/lib/analysis/timestamps";
import type { LandmarkTimeline } from "@/types";

export interface ObservedStrength {
  timestamp: string;
  timeSeconds: number;
  title: string;
  detail: string;
}

const MIN_GAP_SECONDS = 8;

function pickSpread(
  candidates: ObservedStrength[],
  max: number
): ObservedStrength[] {
  const sorted = [...candidates].sort((a, b) => a.timeSeconds - b.timeSeconds);
  const picked: ObservedStrength[] = [];

  for (const item of sorted) {
    if (picked.some((p) => Math.abs(p.timeSeconds - item.timeSeconds) < MIN_GAP_SECONDS)) {
      continue;
    }
    picked.push(item);
    if (picked.length >= max) break;
  }

  return picked;
}

/** Pose-verified strengths with real timestamps — not generic filler. */
export function findObservedStrengths(
  timeline: LandmarkTimeline
): ObservedStrength[] {
  if (timeline.length < 5) return [];

  const { frames, kickEvents } = buildTimelineContext(timeline);
  const candidates: ObservedStrength[] = [];

  for (const event of kickEvents) {
    if (
      !event.lowChamber &&
      !event.insufficientPivot &&
      !event.footStrikeLikely &&
      event.chamberHeight >= 0.05
    ) {
      candidates.push({
        timestamp: event.peak_timestamp,
        timeSeconds: parseTimestamp(event.peak_timestamp),
        title: "Clean kick mechanics",
        detail: `Hip turn and chamber on ${event.side} kick — pivot ${(event.plantedPivotLateral * 100).toFixed(0)}% lateral shift.`,
      });
    }
  }

  for (const analysis of frames) {
    const m = analysis.metrics;
    if (!m.metrics_reliable) continue;

    const ts = analysis.timestamp;
    const timeSeconds = analysis.timeSeconds;

    if (
      !m.guard_dropped &&
      m.right_elbow_angle !== null &&
      m.right_elbow_angle >= 158 &&
      analysis.postRearExtension
    ) {
      candidates.push({
        timestamp: ts,
        timeSeconds,
        title: "Clean extension with guard held",
        detail: `Right elbow at ${Math.round(m.right_elbow_angle)}° with wrists above guard line.`,
      });
    }

    if (
      !m.guard_dropped &&
      m.hip_rotation_deg !== null &&
      m.hip_rotation_deg >= 30 &&
      m.hip_rotation_deg <= 55
    ) {
      candidates.push({
        timestamp: ts,
        timeSeconds,
        title: "Hip-shoulder rotation synced",
        detail: `Hip rotation ${Math.round(m.hip_rotation_deg)}° with guard maintained.`,
      });
    }

    if (!m.chin_elevated && !m.guard_dropped && m.guard_confidence >= 0.55) {
      candidates.push({
        timestamp: ts,
        timeSeconds,
        title: "Stable chin and guard posture",
        detail: "Chin tucked with hands at guard height.",
      });
    }
  }

  return pickSpread(candidates, 3);
}
