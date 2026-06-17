import { runPromptChain } from "@/lib/ai/chainPrompts";
import { diagnoseRootCause } from "@/lib/analysis/rootCause";
import { humanLabelForWeakness } from "@/lib/analysis/poseMetrics";
import { getSportConfig } from "@/config/sports";
import type {
  CoachingFeedback,
  ConfirmedPoseEvent,
  PatternAnalysisResult,
  PoseQualityReport,
  SkillLevel,
  SportId,
} from "@/types";
import type { ObservedStrength } from "@/lib/analysis/positiveFinder";
import type { SkillFoundationReport } from "@/lib/analysis/skillFoundation";

export async function generateFeedback(
  patternData: PatternAnalysisResult,
  sport: SportId,
  level: SkillLevel,
  options?: {
    sessionHistory?: Record<string, unknown>[];
    isFollowUp?: boolean;
    techniquesSeen?: string[];
    poseQuality?: PoseQualityReport;
    landmarkSummary?: Record<string, unknown>;
    confirmedEvents?: ConfirmedPoseEvent[];
    observedStrengths?: ObservedStrength[];
    frameSamples?: string[];
    skillFoundation?: SkillFoundationReport;
  }
): Promise<CoachingFeedback> {
  const rootCause = diagnoseRootCause(
    patternData,
    sport,
    options?.skillFoundation
  );

  try {
    return await runPromptChain({
      patternData,
      sport,
      level,
      sessionHistory: options?.sessionHistory,
      isFollowUp: options?.isFollowUp,
      techniquesSeen: options?.techniquesSeen,
      poseQuality: options?.poseQuality,
      landmarkSummary: options?.landmarkSummary,
      confirmedEvents: options?.confirmedEvents,
      observedStrengths: options?.observedStrengths,
      frameSamples: options?.frameSamples,
      skillFoundation: options?.skillFoundation,
    });
  } catch (error) {
    console.error("[generateFeedback] Gemini failed:", error);
    return buildFallbackFeedback(
      patternData,
      sport,
      level,
      rootCause,
      options?.confirmedEvents ?? [],
      options?.observedStrengths ?? [],
      options?.skillFoundation
    );
  }
}

function buildFallbackFeedback(
  patternData: PatternAnalysisResult,
  sport: SportId,
  level: SkillLevel,
  rootCause: ReturnType<typeof diagnoseRootCause>,
  confirmedEvents: ConfirmedPoseEvent[],
  observedStrengths: ObservedStrength[],
  skillFoundation?: SkillFoundationReport
): CoachingFeedback {
  const sportConfig = getSportConfig(sport);
  const primary = confirmedEvents[0];
  const primaryMoment = skillFoundation?.moments[0];
  const timestamp =
    primaryMoment?.timestamp ??
    primary?.timestamp ??
    patternData.events[0]?.start_timestamp ??
    observedStrengths[0]?.timestamp ??
    "0:00";

  const positives =
    observedStrengths.length > 0
      ? observedStrengths.slice(0, 3).map((s) => ({
          timestamp: s.timestamp,
          title: s.title,
          technical_detail: s.detail,
          why_it_matters: "Verified from movement analysis on your footage.",
        }))
      : [
          {
            timestamp: "—",
            title: "Limited movement data for strengths",
            technical_detail:
              "Re-upload with full body visible for positive moment detection.",
            why_it_matters: "Clearer angle improves analysis accuracy.",
          },
        ];

  return {
    positives,
    main_weakness: {
      timestamp,
      title:
        primaryMoment?.title ??
        primary?.label ??
        humanLabelForWeakness(patternData.primary_weakness || rootCause.weakness_type),
      what_is_happening:
        primaryMoment?.detail ??
        primary?.detail ??
        rootCause.what_is_happening,
      root_cause: rootCause.root_cause,
      fight_consequence: rootCause.fight_consequence,
      frequency:
        skillFoundation?.frequencyLabel ??
        (confirmedEvents.length > 0
          ? `${confirmedEvents.length} pose-confirmed instance${confirmedEvents.length === 1 ? "" : "s"}`
          : `Pattern signal in ${patternData.frequency} frames`),
      mechanical_fix:
        primaryMoment?.fix ??
        primary?.mechanical_fix ??
        skillFoundation?.mechanicalFix ??
        rootCause.mechanical_fix,
      elite_reference: rootCause.elite_reference,
    },
    pattern_insight:
      skillFoundation?.summary ??
      (confirmedEvents.length > 0
        ? "Coaching derived from pose-confirmed moments in your video."
        : "Analysis limited — improve camera angle and retry for fuller feedback."),
    drill: {
      name: skillFoundation?.drillName ?? `${sportConfig.name} correction drill`,
      description:
        primaryMoment?.fix ??
        skillFoundation?.mechanicalFix ??
        rootCause.mechanical_fix,
      success_marker:
        "Weakness absent for 3 consecutive reps without conscious effort.",
    },
    coach_summary:
      skillFoundation?.coachSummarySeed ??
      `${level} — ${(primaryMoment?.fix ?? rootCause.mechanical_fix).slice(0, 120)}`,
  };
}
