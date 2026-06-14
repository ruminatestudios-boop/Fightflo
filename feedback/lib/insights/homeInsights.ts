import { getReportBySessionId, getUserSessionLibrary } from "@/lib/db/queries";
import type { Report, WeaknessTrend } from "@/types";
import type {
  CoachShareInsight,
  CompareInsight,
  CompareSessionSnapshot,
  HomeInsights,
  ProgressInsight,
  ReuploadInsight,
  WeeklyFocusInsight,
} from "./types";

function snapshotFromSession(
  session: Awaited<ReturnType<typeof getUserSessionLibrary>>[number],
  report: Report | null
): CompareSessionSnapshot {
  return {
    id: session.id,
    title: session.resolved_title,
    date: new Date(session.created_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    weaknessTitle: report?.main_weakness?.title ?? "No main fault logged",
    coachSummary:
      report?.coach_summary?.trim() ||
      session.resolved_summary ||
      "No summary yet",
    issueCount: report?.confirmed_events?.length ?? 0,
  };
}

function buildProgressPoints(
  sessions: Awaited<ReturnType<typeof getUserSessionLibrary>>,
  reports: Map<string, Report | null>
): ProgressInsight | null {
  const complete = sessions
    .filter((s) => s.status === "complete")
    .slice()
    .sort((a, b) => a.session_number - b.session_number);

  if (complete.length === 0) return null;

  const latest = complete[complete.length - 1];
  const latestReport = reports.get(latest.id);
  const weaknessLabel =
    latestReport?.main_weakness?.title ?? "Technique faults flagged";

  const points = complete.map((session) => {
    const report = reports.get(session.id);
    const count = report?.confirmed_events?.length ?? 1;
    return {
      session: session.session_number,
      count,
      date: new Date(session.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
  });

  const firstCount = points[0]?.count ?? 0;
  const lastCount = points[points.length - 1]?.count ?? 0;
  const delta =
    firstCount > 0
      ? Math.round(((lastCount - firstCount) / firstCount) * 100)
      : 0;

  let trend: WeaknessTrend = "stable";
  if (lastCount < firstCount) trend = "improving";
  else if (lastCount > firstCount) trend = "worse";

  const summary =
    complete.length === 1
      ? "Upload more clips to start tracking trends across sessions."
      : trend === "improving"
        ? `Fault count down ${Math.abs(delta)}% since your first analysed clip.`
        : trend === "worse"
          ? `Fault count up ${Math.abs(delta)}% — focus on this week's drill.`
          : "Fault count is steady — keep drilling the same fix.";

  return {
    weaknessLabel,
    trend,
    percentageChange: delta,
    points,
    summary,
  };
}

function buildCompareInsight(
  sessions: Awaited<ReturnType<typeof getUserSessionLibrary>>,
  reports: Map<string, Report | null>
): CompareInsight | null {
  const complete = sessions
    .filter((s) => s.status === "complete")
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  if (complete.length < 2) return null;

  const [newer, older] = complete;
  const reportNew = reports.get(newer.id);
  const reportOld = reports.get(older.id);
  const snapNew = snapshotFromSession(newer, reportNew ?? null);
  const snapOld = snapshotFromSession(older, reportOld ?? null);

  const issueDelta = snapNew.issueCount - snapOld.issueCount;
  let insight = "Compare how your main fault shifted between these two clips.";
  if (issueDelta < 0) {
    insight = `You flagged ${Math.abs(issueDelta)} fewer issues in your latest clip — progress.`;
  } else if (issueDelta > 0) {
    insight = `Latest clip flagged ${issueDelta} more issues — re-film the drill and upload again.`;
  } else if (snapNew.weaknessTitle === snapOld.weaknessTitle) {
    insight = `Same main fault both times: "${snapNew.weaknessTitle}". Drill it, then re-upload.`;
  } else {
    insight = `Main fault shifted from "${snapOld.weaknessTitle}" to "${snapNew.weaknessTitle}".`;
  }

  return {
    sessionA: snapNew,
    sessionB: snapOld,
    insight,
  };
}

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

  if (latestComplete && latestReport) {
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
  }

  return {
    completeCount: complete.length,
    latestComplete,
    reupload,
    weeklyFocus,
    progress: buildProgressPoints(sessions, reports),
    compare: buildCompareInsight(sessions, reports),
    coachShare,
  };
}
