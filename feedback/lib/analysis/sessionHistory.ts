import { analyzeGuardFromReport } from "@/lib/guard/guardAnalysis";
import { defaultSessionTitle } from "@/lib/sessions/library";
import type { Report, Session } from "@/types";

export function buildSessionHistoryEntry(
  session: Session,
  report: Report,
  options?: { isFollowUpParent?: boolean }
): Record<string, unknown> {
  const guard = analyzeGuardFromReport(report);
  const issueTypes = [
    ...new Set((report.confirmed_events ?? []).map((event) => event.weakness_type)),
  ];

  return {
    session_id: session.id,
    session_number: session.session_number,
    session_title:
      session.display_name?.trim() || defaultSessionTitle(session),
    is_follow_up_parent: options?.isFollowUpParent ?? false,
    main_weakness: {
      title: report.main_weakness.title,
      mechanical_fix: report.main_weakness.mechanical_fix,
      frequency: report.main_weakness.frequency,
      what_is_happening: report.main_weakness.what_is_happening,
    },
    drill: {
      name: report.drill.name,
      success_marker: report.drill.success_marker,
    },
    positives: report.positives.map((positive) => ({
      title: positive.title,
      timestamp: positive.timestamp,
    })),
    confirmed_issue_count: report.confirmed_events?.length ?? 0,
    guard_drops: guard.dropCount,
    issue_types: issueTypes,
    coach_summary: report.coach_summary,
    pattern_insight: report.pattern_insight,
  };
}
