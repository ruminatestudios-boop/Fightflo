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

  // Track consecutive frames for sustained posture — avoid flagging single-frame flukes
  let chinGuardStreak = 0;
  let chinGuardStreakStart: { ts: string; timeSeconds: number } | null = null;

  for (const analysis of frames) {
    const m = analysis.metrics;
    if (!m.metrics_reliable) continue;

    const ts = analysis.timestamp;
    const timeSeconds = analysis.timeSeconds;

    // Clean extension: must be post-punch (postRearExtension) AND guard held AND full extension
    // High bar: 165°+ (near-full lockout) — not just "extended"
    if (
      !m.guard_dropped &&
      m.right_elbow_angle !== null &&
      m.right_elbow_angle >= 165 &&
      m.guard_confidence >= 0.6 &&
      analysis.postRearExtension
    ) {
      candidates.push({
        timestamp: ts,
        timeSeconds,
        title: "Full extension with guard held",
        detail: `Right elbow at ${Math.round(m.right_elbow_angle)}° at extension with wrists above guard line — both hands returned.`,
      });
    }

    // Hip rotation: only flag genuine rotation (≥35°), not just any hip movement
    // Must also have guard maintained (not a coincidence of guard being up while rotating)
    if (
      !m.guard_dropped &&
      m.hip_rotation_deg !== null &&
      m.hip_rotation_deg >= 35 &&
      m.hip_rotation_deg <= 55 &&
      m.guard_confidence >= 0.6
    ) {
      candidates.push({
        timestamp: ts,
        timeSeconds,
        title: "Hip-shoulder rotation",
        detail: `Hip rotation ${Math.round(m.hip_rotation_deg)}° while guard held — power generated from the base.`,
      });
    }

    // Chin and guard: only flag if sustained for 6+ consecutive reliable frames (~0.5s at 12fps)
    // A single clean frame is baseline, not a positive
    if (!m.chin_elevated && !m.guard_dropped && m.guard_confidence >= 0.65) {
      if (!chinGuardStreakStart) chinGuardStreakStart = { ts, timeSeconds };
      chinGuardStreak++;
      if (chinGuardStreak === 6) {
        // Confirmed sustained — add the start of the streak
        candidates.push({
          timestamp: chinGuardStreakStart.ts,
          timeSeconds: chinGuardStreakStart.timeSeconds,
          title: "Consistent defensive posture",
          detail: `Chin tucked and guard maintained across ${chinGuardStreak}+ consecutive frames — no exposure during this sequence.`,
        });
      }
    } else {
      chinGuardStreak = 0;
      chinGuardStreakStart = null;
    }
  }

  return pickSpread(candidates, 5);
}
