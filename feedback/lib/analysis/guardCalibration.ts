import type { GuardCalibration } from "@/lib/analysis/poseMetrics";

/** Read persisted guard calibration from report landmark_summary (client-safe). */
export function parseGuardCalibration(
  summary: Record<string, unknown> | null | undefined
): GuardCalibration | null {
  if (!summary) return null;
  const y = summary.guard_line_y;
  const t = summary.guard_threshold;
  if (typeof y !== "number" || typeof t !== "number") return null;
  return { guardLineY: y, guardThreshold: t };
}
