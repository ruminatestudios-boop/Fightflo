import { analyzeGuardFromReport } from "@/lib/guard/guardAnalysis";
import { getReportBySessionId, getUserSessionLibrary } from "@/lib/db/queries";
import type { Report } from "@/types";
import { buildProgressInsight } from "@/lib/insights/progressMetrics";
import type {
  CoachShareInsight,
  GuardInsight,
  HomeInsights,
  ReuploadInsight,
  WeeklyFocusInsight,
} from "./types";

export async function buildHomeInsights(userId: string): Promise<HomeInsights> {
  const sessions = await getUserSessionLibrary(userId);
  const complete = sessions.filter((s) => s.status === "complete");

  const reports = new Map<string, Report | null>();
  await Promise.all(
    complete.map(async (session) => {
      reports.set(session.id, await getReportBySessionId(session.id));
    })
  );

  const latestComplete =
    complete
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] ?? null;

  const latestReport = latestComplete
    ? reports.get(latestComplete.id) ?? null
    : null;

  let weeklyFocus: WeeklyFocusInsight | null = null;
  let reupload: ReuploadInsight | null = null;
  let coachShare: CoachShareInsight | null = null;
  let guard: GuardInsight | null = null;

  if (latestComplete && latestReport) {
    const guardAnalysis = analyzeGuardFromReport(latestReport);

    weeklyFocus = {
      sessionId: latestComplete.id,
      weaknessTitle: latestReport.main_weakness.title,
      drillName: latestReport.drill.name,
      drillDescription: latestReport.drill.description,
      successMarker: latestReport.drill.success_marker,
      patternInsight: latestReport.pattern_insight,
    };

    reupload = {
      sessionId: latestComplete.id,
      title: latestComplete.resolved_title,
      weaknessTitle: latestReport.main_weakness.title,
      mechanicalFix: latestReport.main_weakness.mechanical_fix,
      drillName: latestReport.drill.name,
    };

    coachShare = {
      sessionId: latestComplete.id,
      title: latestComplete.resolved_title,
      summary:
        latestReport.coach_summary?.trim() ||
        latestComplete.resolved_summary ||
        latestReport.main_weakness.title,
    };

    guard = {
      sessionId: latestComplete.id,
      title: latestComplete.resolved_title,
      dropCount: guardAnalysis.dropCount,
      dropPercent: guardAnalysis.dropPercent,
      summary: guardAnalysis.summary,
      mechanicalFix: guardAnalysis.mechanicalFix,
      drillName: guardAnalysis.drillName,
      moments: guardAnalysis.moments,
    };
  }

  return {
    completeCount: complete.length,
    latestComplete,
    reupload,
    guard,
    weeklyFocus,
    progress: buildProgressInsight(sessions, reports),
    coachShare,
  };
}
