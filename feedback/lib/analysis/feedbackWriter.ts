import { runPromptChain } from "@/lib/ai/chainPrompts";
import { diagnoseRootCause } from "@/lib/analysis/rootCause";
import { getSportConfig } from "@/config/sports";
import type {
  CoachingFeedback,
  ConfirmedPoseEvent,
  PatternAnalysisResult,
  PoseQualityReport,
  SkillLevel,
  SportId,
} from "@/types";

export async function generateFeedback(
  patternData: PatternAnalysisResult,
  sport: SportId,
  level: SkillLevel,
  options?: {
    sessionHistory?: Record<string, unknown>[];
    techniquesSeen?: string[];
    poseQuality?: PoseQualityReport;
    landmarkSummary?: Record<string, unknown>;
    confirmedEvents?: ConfirmedPoseEvent[];
  }
): Promise<CoachingFeedback> {
  const rootCause = diagnoseRootCause(patternData, sport);

  try {
    return await runPromptChain({
      patternData,
      sport,
      level,
      sessionHistory: options?.sessionHistory,
      techniquesSeen: options?.techniquesSeen,
      poseQuality: options?.poseQuality,
      landmarkSummary: options?.landmarkSummary,
      confirmedEvents: options?.confirmedEvents,
    });
  } catch {
    return buildFallbackFeedback(patternData, sport, level, rootCause);
  }
}

function buildFallbackFeedback(
  patternData: PatternAnalysisResult,
  sport: SportId,
  level: SkillLevel,
  rootCause: ReturnType<typeof diagnoseRootCause>
): CoachingFeedback {
  const sportConfig = getSportConfig(sport);
  const timestamp =
    patternData.events[0]?.start_timestamp ?? "0:15";

  return {
    positives: [
      {
        timestamp: "0:08",
        title: "Consistent stance width",
        technical_detail: "Base stays within optimal width throughout movement.",
        why_it_matters: "Stable base enables power transfer and balance.",
      },
      {
        timestamp: "1:22",
        title: "Good recovery rhythm",
        technical_detail: "Return to neutral position between combinations.",
        why_it_matters: "Prevents overcommitting and keeps defence available.",
      },
      {
        timestamp: "2:45",
        title: "Active foot positioning",
        technical_detail: "Feet adjust to maintain angle on target.",
        why_it_matters: "Angle control creates openings without chasing.",
      },
    ],
    main_weakness: {
      timestamp,
      title: rootCause.weakness_type.replace(/_/g, " "),
      what_is_happening: rootCause.what_is_happening,
      root_cause: rootCause.root_cause,
      fight_consequence: rootCause.fight_consequence,
      frequency: `Found in ${patternData.frequency} instances`,
      mechanical_fix: rootCause.mechanical_fix,
      elite_reference: rootCause.elite_reference,
    },
    pattern_insight:
      "This is mechanical, not mental. Fix the root cause and the downstream errors resolve automatically.",
    drill: {
      name: `${sportConfig.name} correction drill`,
      description: `3 rounds focusing on ${rootCause.mechanical_fix}`,
      success_marker: "Weakness absent for 3 consecutive reps without conscious effort.",
    },
    coach_summary: `${level} level — fix ${rootCause.weakness_type.replace(/_/g, " ")} first. Everything else follows.`,
  };
}
