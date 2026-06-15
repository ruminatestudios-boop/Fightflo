import type { ProgressDataPoint, WeaknessTrend } from "@/types";
import type { SessionLibraryEntry } from "@/lib/sessions/library";

export interface WeeklyFocusInsight {
  sessionId: string;
  weaknessTitle: string;
  drillName: string;
  drillDescription: string;
  successMarker: string;
  patternInsight: string;
}

export type ProgressMetricId =
  | "positives"
  | "total_faults"
  | "guard_drops"
  | "fault_variety"
  | "pose_quality";

export interface ProgressHighlight {
  title: string;
  detail: string;
}

export interface ProgressMetric {
  id: ProgressMetricId;
  label: string;
  explanation: string;
  trend: WeaknessTrend;
  lowerIsBetter: boolean;
  group: "strength" | "focus";
  unit: string;
  percentageChange: number;
  points: ProgressDataPoint[];
  summary: string;
  improvementDetail: string;
  firstValue: number;
  lastValue: number;
}

export interface ProgressInsight {
  sessionCount: number;
  headline: string;
  headlineDetail: string;
  latestMainFault: string;
  latestStrengthTitle: string | null;
  latestPositives: ProgressHighlight[];
  defaultMetricId: ProgressMetricId;
  metrics: ProgressMetric[];
}

export interface CoachShareInsight {
  sessionId: string;
  title: string;
  summary: string;
}

export interface ReuploadInsight {
  sessionId: string;
  title: string;
  weaknessTitle: string;
  mechanicalFix: string;
  drillName: string;
}

export interface GuardInsight {
  sessionId: string;
  title: string;
  dropCount: number;
  dropPercent: number;
  summary: string;
  mechanicalFix: string;
  drillName: string;
}

export interface HomeInsights {
  completeCount: number;
  latestComplete: SessionLibraryEntry | null;
  reupload: ReuploadInsight | null;
  guard: GuardInsight | null;
  weeklyFocus: WeeklyFocusInsight | null;
  progress: ProgressInsight | null;
  coachShare: CoachShareInsight | null;
}
