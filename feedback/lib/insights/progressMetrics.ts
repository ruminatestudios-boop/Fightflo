import { analyzeGuardFromReport } from "@/lib/guard/guardAnalysis";
import { getReportBySessionId, getUserSessionLibrary } from "@/lib/db/queries";
import type { Report, WeaknessTrend } from "@/types";
import type { ProgressInsight, ProgressMetric, ProgressMetricId } from "./types";

interface SessionSnapshot {
  session: number;
  date: string;
  positiveCount: number;
  totalFaults: number;
  guardDrops: number;
  faultVariety: number;
  poseScore: number | null;
}

type SnapshotValueKey = keyof Pick<
  SessionSnapshot,
  "positiveCount" | "totalFaults" | "guardDrops" | "faultVariety" | "poseScore"
>;

function calcTrend(
  first: number,
  last: number,
  lowerIsBetter: boolean
): WeaknessTrend {
  if (last < first) return lowerIsBetter ? "improving" : "worse";
  if (last > first) return lowerIsBetter ? "worse" : "improving";
  return "stable";
}

function buildMetricPoints(
  snapshots: SessionSnapshot[],
  valueKey: SnapshotValueKey
): { session: number; count: number; date: string }[] {
  return snapshots.map((snap) => ({
    session: snap.session,
    count: snap[valueKey] ?? 0,
    date: snap.date,
  }));
}

function buildChangeDetail(
  label: string,
  points: { session: number; count: number }[],
  trend: WeaknessTrend,
  firstValue: number,
  lastValue: number,
  unit: string,
  lowerIsBetter: boolean
): string {
  if (points.length === 1) {
    return `Session #${points[0].session}: ${lastValue} ${unit}. Upload more clips to track change.`;
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (trend === "improving") {
    const verb = lowerIsBetter ? "improved" : "building";
    return `${label} ${verb} — ${firstValue} → ${lastValue} ${unit} (session #${first.session} to #${last.session}).`;
  }
  if (trend === "worse") {
    const verb = lowerIsBetter ? "slipped" : "fell off";
    return `${label} ${verb} — ${firstValue} → ${lastValue} ${unit} (session #${first.session} to #${last.session}).`;
  }
  return `${label} holding steady at about ${lastValue} ${unit} per clip.`;
}

function buildMetric(
  id: ProgressMetricId,
  label: string,
  explanation: string,
  snapshots: SessionSnapshot[],
  valueKey: SnapshotValueKey,
  lowerIsBetter: boolean,
  group: "strength" | "focus",
  unit: string
): ProgressMetric {
  const points = buildMetricPoints(snapshots, valueKey);
  const firstValue = points[0]?.count ?? 0;
  const lastValue = points[points.length - 1]?.count ?? 0;
  const trend = calcTrend(firstValue, lastValue, lowerIsBetter);
  const delta =
    firstValue > 0
      ? Math.round(((lastValue - firstValue) / firstValue) * 100)
      : lastValue === 0
        ? 0
        : 100;

  const summary =
    points.length === 1
      ? "One session logged — keep uploading to see trends."
      : trend === "improving"
        ? lowerIsBetter
          ? `Down ${Math.abs(delta)}% since session #${points[0].session}.`
          : `Up ${Math.abs(delta)}% since session #${points[0].session}.`
        : trend === "worse"
          ? lowerIsBetter
            ? `Up ${Math.abs(delta)}% since session #${points[0].session}.`
            : `Down ${Math.abs(delta)}% since session #${points[0].session}.`
          : `Flat across ${points.length} sessions.`;

  return {
    id,
    label,
    explanation,
    trend,
    lowerIsBetter,
    group,
    unit,
    percentageChange: delta,
    points,
    firstValue,
    lastValue,
    summary,
    improvementDetail: buildChangeDetail(
      label,
      points,
      trend,
      firstValue,
      lastValue,
      unit,
      lowerIsBetter
    ),
  };
}

function extractSnapshot(
  session: Awaited<ReturnType<typeof getUserSessionLibrary>>[number],
  report: Report | null
): SessionSnapshot {
  const events = report?.confirmed_events ?? [];
  const guard = report ? analyzeGuardFromReport(report) : null;

  return {
    session: session.session_number,
    date: new Date(session.created_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    positiveCount: report?.positives?.length ?? 0,
    totalFaults: events.length,
    guardDrops: guard?.dropCount ?? 0,
    faultVariety: new Set(events.map((event) => event.weakness_type)).size,
    poseScore:
      typeof report?.pose_quality?.score === "number"
        ? Math.round(report.pose_quality.score)
        : null,
  };
}

export function buildProgressInsight(
  sessions: Awaited<ReturnType<typeof getUserSessionLibrary>>,
  reports: Map<string, Report | null>
): ProgressInsight | null {
  const complete = sessions
    .filter((session) => session.status === "complete")
    .slice()
    .sort((a, b) => a.session_number - b.session_number);

  if (complete.length === 0) return null;

  const snapshots = complete.map((session) =>
    extractSnapshot(session, reports.get(session.id) ?? null)
  );

  const latestReport = reports.get(complete[complete.length - 1].id) ?? null;
  const latestMainFault =
    latestReport?.main_weakness?.title ?? "your main fault";
  const latestPositives = (latestReport?.positives ?? []).map((positive) => ({
    title: positive.title,
    detail: positive.technical_detail,
  }));
  const latestStrengthTitle = latestPositives[0]?.title ?? null;

  const metrics: ProgressMetric[] = [
    buildMetric(
      "positives",
      "Strengths flagged",
      "Techniques and habits the coach called out as working well in each clip.",
      snapshots,
      "positiveCount",
      false,
      "strength",
      "strengths"
    ),
    buildMetric(
      "guard_drops",
      "Guard drops",
      "Moments hands fell below guard height or chin was exposed.",
      snapshots,
      "guardDrops",
      true,
      "focus",
      "drops"
    ),
    buildMetric(
      "total_faults",
      "Total flagged issues",
      "Every timestamped fault detected in the clip — guard, footwork, habits combined.",
      snapshots,
      "totalFaults",
      true,
      "focus",
      "issues"
    ),
    buildMetric(
      "fault_variety",
      "Fault variety",
      "How many different fault types showed up in one clip. Fewer often means tighter focus.",
      snapshots,
      "faultVariety",
      true,
      "focus",
      "fault types"
    ),
  ];

  const hasPoseScores = snapshots.some((snap) => snap.poseScore !== null);
  if (hasPoseScores) {
    metrics.push(
      buildMetric(
        "pose_quality",
        "Pose tracking quality",
        "How reliably we could track your body in the clip. Higher means clearer footage for analysis.",
        snapshots,
        "poseScore",
        false,
        "strength",
        "score"
      )
    );
  }

  const strengthMetrics = metrics.filter((metric) => metric.group === "strength");
  const focusMetrics = metrics.filter((metric) => metric.group === "focus");
  const improvingStrength = strengthMetrics.filter(
    (metric) => metric.trend === "improving"
  ).length;
  const improvingFocus = focusMetrics.filter(
    (metric) => metric.trend === "improving"
  ).length;
  const worseFocus = focusMetrics.filter((metric) => metric.trend === "worse").length;

  const headline =
    complete.length === 1
      ? "First session logged"
      : improvingStrength > 0 && worseFocus === 0
        ? "Strengths building"
        : improvingFocus > worseFocus
          ? "Overall trending up"
          : worseFocus > improvingFocus
            ? "Some areas need attention"
            : "Holding steady";

  const headlineDetail =
    complete.length === 1
      ? "Upload more clips — we'll chart strengths and issues across sessions."
      : latestStrengthTitle
        ? `Latest strength: ${latestStrengthTitle}. Main fault to sharpen: ${latestMainFault}.`
        : `Main fault to sharpen: ${latestMainFault}. Keep uploading to surface more strengths.`;

  return {
    sessionCount: complete.length,
    headline,
    headlineDetail,
    latestMainFault,
    latestStrengthTitle,
    latestPositives,
    defaultMetricId: latestPositives.length > 0 ? "positives" : "guard_drops",
    metrics,
  };
}

export async function buildProgressInsightForUser(
  userId: string
): Promise<ProgressInsight | null> {
  const sessions = await getUserSessionLibrary(userId);
  const complete = sessions.filter((session) => session.status === "complete");

  const reports = new Map<string, Report | null>();
  await Promise.all(
    complete.map(async (session) => {
      reports.set(session.id, await getReportBySessionId(session.id));
    })
  );

  return buildProgressInsight(sessions, reports);
}
