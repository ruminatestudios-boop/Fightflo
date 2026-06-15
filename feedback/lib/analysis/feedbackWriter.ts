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
  }
): Promise<CoachingFeedback> {
  const rootCause = diagnoseRootCause(patternData, sport);

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
    });
  } catch (error) {
    console.error("[generateFeedback] Gemini failed:", error);
    return buildFallbackFeedback(
      patternData,
      sport,
      level,
      rootCause,
      options?.confirmedEvents ?? [],
      options?.observedStrengths ?? []
    );
  }
}

function buildFallbackFeedback(
  patternData: PatternAnalysisResult,
  sport: SportId,
  level: SkillLevel,
  rootCause: ReturnType<typeof diagnoseRootCause>,
  confirmedEvents: ConfirmedPoseEvent[],
  observedStrengths: ObservedStrength[]
): CoachingFeedback {
  const sportConfig = getSportConfig(sport);
  const primary = confirmedEvents[0];
  const timestamp =
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
          why_it_matters: "Verified from pose tracking on your footage.",
        }))
      : [
          {
            timestamp: "—",
            title: "Limited pose data for strengths",
            technical_detail:
              "Re-upload with full body visible for positive moment detection.",
            why_it_matters: "Clearer angle improves tracking accuracy.",
          },
        ];

  return {
    positives,
    main_weakness: {
      timestamp,
      title:
        primary?.label ??
        humanLabelForWeakness(patternData.primary_weakness || rootCause.weakness_type),
      what_is_happening: rootCause.what_is_happening,
      root_cause: rootCause.root_cause,
      fight_consequence: rootCause.fight_consequence,
      frequency:
        confirmedEvents.length > 0
          ? `${confirmedEvents.length} pose-confirmed instance${confirmedEvents.length === 1 ? "" : "s"}`
          : `Pattern signal in ${patternData.frequency} frames`,
      mechanical_fix: rootCause.mechanical_fix,
      elite_reference: rootCause.elite_reference,
    },
    pattern_insight:
      confirmedEvents.length > 0
        ? "Coaching derived from pose-confirmed moments in your video."
        : "Analysis limited — improve camera angle and retry for fuller feedback.",
    drill: {
      name: `${sportConfig.name} correction drill`,
      description: rootCause.mechanical_fix,
      success_marker:
        "Weakness absent for 3 consecutive reps without conscious effort.",
    },
    coach_summary: `${level} — ${rootCause.mechanical_fix.slice(0, 120)}`,
  };
}
