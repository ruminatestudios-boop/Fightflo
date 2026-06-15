import { analyzeGuardFromReport } from "@/lib/guard/guardAnalysis";
import { defaultSessionTitle } from "@/lib/sessions/library";
import type {
  ComparisonItem,
  FollowUpComparison,
  FollowUpVerdict,
  Report,
  Session,
} from "@/types";

function issueCount(report: Pick<Report, "confirmed_events">): number {
  return report.confirmed_events?.length ?? 0;
}

function positiveCount(report: Pick<Report, "positives">): number {
  return report.positives?.length ?? 0;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function buildHeadline(
  verdict: FollowUpVerdict,
  improved: ComparisonItem[],
  regressed: ComparisonItem[],
  parentWeakness: string,
  newWeakness: string
): string {
  if (verdict === "fixed") {
    return `Main fault cleared — was "${parentWeakness}", now "${newWeakness}".`;
  }
  if (verdict === "partial") {
    const win = improved[0]?.label ?? "Some areas";
    return `${win} improved; keep working "${parentWeakness}".`;
  }
  if (verdict === "not_fixed") {
    return `Still seeing "${newWeakness}" — same focus as last clip.`;
  }
  const up = improved.map((item) => item.label).slice(0, 2).join(", ");
  const down = regressed.map((item) => item.label).slice(0, 2).join(", ");
  return `Mixed session — improved: ${up || "—"}; slipped: ${down || "—"}.`;
}

function inferVerdict(
  improved: ComparisonItem[],
  regressed: ComparisonItem[],
  parentWeakness: string,
  newWeakness: string
): FollowUpVerdict {
  const sameMainFault =
    normalizeLabel(parentWeakness) === normalizeLabel(newWeakness);

  if (!sameMainFault && regressed.length === 0) return "fixed";
  if (!sameMainFault && improved.length > 0) return "partial";
  if (sameMainFault && regressed.length > 0 && improved.length === 0) {
    return "not_fixed";
  }
  if (improved.length > 0 && regressed.length > 0) return "mixed";
  if (improved.length > 0 && regressed.length === 0) return "partial";
  if (regressed.length > 0) return "not_fixed";
  return sameMainFault ? "not_fixed" : "partial";
}

/** Deterministic before/after comparison for follow-up uploads. */
export function buildFollowUpComparison(
  parentSession: Session,
  parentReport: Report,
  newReport: Pick<
    Report,
    "main_weakness" | "positives" | "confirmed_events" | "pose_quality"
  >
): FollowUpComparison {
  const improved: ComparisonItem[] = [];
  const regressed: ComparisonItem[] = [];
  const unchanged: ComparisonItem[] = [];

  const parentIssues = issueCount(parentReport);
  const newIssues = issueCount(newReport);
  const parentWeakness = parentReport.main_weakness.title;
  const newWeakness = newReport.main_weakness.title;
  const sameMainFault =
    normalizeLabel(parentWeakness) === normalizeLabel(newWeakness);

  if (newIssues < parentIssues) {
    improved.push({
      label: "Flagged issues",
      status: "improved",
      detail: `Down from ${parentIssues} to ${newIssues} timestamped faults.`,
      priorValue: parentIssues,
      currentValue: newIssues,
    });
  } else if (newIssues > parentIssues) {
    regressed.push({
      label: "Flagged issues",
      status: "worse",
      detail: `Up from ${parentIssues} to ${newIssues} timestamped faults.`,
      priorValue: parentIssues,
      currentValue: newIssues,
    });
  } else {
    unchanged.push({
      label: "Flagged issues",
      status: "unchanged",
      detail: `${newIssues} faults — same count as last clip.`,
      priorValue: parentIssues,
      currentValue: newIssues,
    });
  }

  const parentGuard = analyzeGuardFromReport(parentReport);
  const newGuard = analyzeGuardFromReport({
    ...parentReport,
    confirmed_events: newReport.confirmed_events ?? [],
    main_weakness: newReport.main_weakness,
  });

  if (newGuard.dropCount < parentGuard.dropCount) {
    improved.push({
      label: "Guard drops",
      status: "improved",
      detail: `Down from ${parentGuard.dropCount} to ${newGuard.dropCount} guard drop${newGuard.dropCount === 1 ? "" : "s"}.`,
      priorValue: parentGuard.dropCount,
      currentValue: newGuard.dropCount,
    });
  } else if (newGuard.dropCount > parentGuard.dropCount) {
    regressed.push({
      label: "Guard drops",
      status: "worse",
      detail: `Up from ${parentGuard.dropCount} to ${newGuard.dropCount} guard drop${newGuard.dropCount === 1 ? "" : "s"}.`,
      priorValue: parentGuard.dropCount,
      currentValue: newGuard.dropCount,
    });
  } else if (parentGuard.dropCount > 0) {
    unchanged.push({
      label: "Guard drops",
      status: "unchanged",
      detail: `Still ${newGuard.dropCount} guard drop${newGuard.dropCount === 1 ? "" : "s"}.`,
      priorValue: parentGuard.dropCount,
      currentValue: newGuard.dropCount,
    });
  }

  const parentPositives = positiveCount(parentReport);
  const newPositives = positiveCount(newReport);
  if (newPositives > parentPositives) {
    improved.push({
      label: "Strengths flagged",
      status: "improved",
      detail: `Coach spotted ${newPositives} strength${newPositives === 1 ? "" : "s"} vs ${parentPositives} last time.`,
      priorValue: parentPositives,
      currentValue: newPositives,
    });
  } else if (newPositives < parentPositives) {
    regressed.push({
      label: "Strengths flagged",
      status: "worse",
      detail: `Only ${newPositives} strength${newPositives === 1 ? "" : "s"} flagged vs ${parentPositives} before.`,
      priorValue: parentPositives,
      currentValue: newPositives,
    });
  }

  if (sameMainFault) {
    regressed.push({
      label: "Target fault",
      status: "worse",
      detail: `"${newWeakness}" is still your main fault — keep drilling the fix from last session.`,
      priorValue: parentWeakness,
      currentValue: newWeakness,
    });
  } else {
    improved.push({
      label: "Target fault",
      status: "improved",
      detail: `Main fault shifted from "${parentWeakness}" to "${newWeakness}".`,
      priorValue: parentWeakness,
      currentValue: newWeakness,
    });
  }

  const parentPose = parentReport.pose_quality?.score;
  const newPose = newReport.pose_quality?.score;
  if (
    typeof parentPose === "number" &&
    typeof newPose === "number" &&
    parentPose > 0
  ) {
    if (newPose > parentPose + 3) {
      improved.push({
        label: "Tracking quality",
        status: "improved",
        detail: `Clearer body tracking (${Math.round(parentPose)} → ${Math.round(newPose)}).`,
        priorValue: Math.round(parentPose),
        currentValue: Math.round(newPose),
      });
    } else if (newPose < parentPose - 3) {
      regressed.push({
        label: "Tracking quality",
        status: "worse",
        detail: `Harder to track you this time (${Math.round(parentPose)} → ${Math.round(newPose)}). Film full body in frame.`,
        priorValue: Math.round(parentPose),
        currentValue: Math.round(newPose),
      });
    }
  }

  const verdict = inferVerdict(
    improved,
    regressed,
    parentWeakness,
    newWeakness
  );

  return {
    parentSessionId: parentSession.id,
    parentTitle:
      parentSession.display_name?.trim() || defaultSessionTitle(parentSession),
    parentWeaknessTitle: parentWeakness,
    headline: buildHeadline(
      verdict,
      improved,
      regressed,
      parentWeakness,
      newWeakness
    ),
    improved,
    regressed,
    unchanged,
    verdict,
    summary: "",
  };
}
