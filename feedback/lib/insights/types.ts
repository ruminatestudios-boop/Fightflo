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

export interface ProgressInsight {
  weaknessLabel: string;
  trend: WeaknessTrend;
  percentageChange: number;
  points: ProgressDataPoint[];
  summary: string;
}

export interface CompareSessionSnapshot {
  id: string;
  title: string;
  date: string;
  weaknessTitle: string;
  coachSummary: string;
  issueCount: number;
}

export interface CompareInsight {
  sessionA: CompareSessionSnapshot;
  sessionB: CompareSessionSnapshot;
  insight: string;
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
  compare: CompareInsight | null;
  coachShare: CoachShareInsight | null;
}
