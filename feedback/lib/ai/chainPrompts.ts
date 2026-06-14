import { callGemini } from "@/lib/ai/gemini";
import { getSportPrompts } from "@/lib/ai/prompts";
import { getSportConfig } from "@/config/sports";
import type {
  CoachingFeedback,
  ConfirmedPoseEvent,
  DrillRecommendation,
  PatternAnalysisResult,
  PoseQualityReport,
  SkillLevel,
  SportId,
} from "@/types";

interface PatternFinderResult {
  primary_weakness: string;
  human_title: string;
  frequency: string;
  confidence: number;
  correlated_movements: string[];
  fatigue_factor: boolean;
  summary: string;
}

interface RootCauseResult {
  what_is_happening: string;
  root_cause: string;
  fight_consequence: string;
  mechanical_fix: string;
  elite_reference: string;
}

interface ProgressResult {
  trend: string;
  percentage_change: number;
  sessions_tracked: number;
  insight: string;
  pattern_insight: string;
}

interface RawCoachingFeedback {
  positives: CoachingFeedback["positives"];
  main_weakness: CoachingFeedback["main_weakness"];
  pattern_insight: string;
  drill?: DrillRecommendation;
  drill_for_next_session?: DrillRecommendation;
  coach_summary?: string;
  coach_voice_summary?: string;
}

function normalizeFeedback(raw: RawCoachingFeedback): CoachingFeedback {
  return {
    positives: raw.positives,
    main_weakness: raw.main_weakness,
    pattern_insight: raw.pattern_insight,
    drill: raw.drill ?? raw.drill_for_next_session ?? {
      name: "Technical correction drill",
      description: raw.main_weakness.mechanical_fix,
      success_marker: "Weakness absent for 3 consecutive reps",
    },
    coach_summary:
      raw.coach_summary ??
      raw.coach_voice_summary ??
      "Fix the root cause first. Everything else follows.",
  };
}

export async function runPromptChain(input: {
  patternData: PatternAnalysisResult;
  sport: SportId;
  level: SkillLevel;
  sessionHistory?: Record<string, unknown>[];
  techniquesSeen?: string[];
  poseQuality?: PoseQualityReport;
  landmarkSummary?: Record<string, unknown>;
  confirmedEvents?: ConfirmedPoseEvent[];
}): Promise<CoachingFeedback> {
  const sportConfig = getSportConfig(input.sport);
  const prompts = getSportPrompts(input.sport);

  const sessionData = {
    sport: input.sport,
    sport_name: sportConfig.name,
    level: input.level,
    primary_weakness: input.patternData.primary_weakness,
    frequency: input.patternData.frequency,
    fatigue_detected: input.patternData.fatigue_detected,
    events: input.patternData.events,
    pattern_data: input.patternData.pattern_data,
    mechanics_standards: sportConfig.mechanics_standards,
    common_weaknesses: sportConfig.common_weaknesses,
    elite_references: sportConfig.elite_references,
    session_history: input.sessionHistory ?? [],
    techniques_seen: input.techniquesSeen ?? [],
    pose_quality: input.poseQuality ?? null,
    landmark_summary: input.landmarkSummary ?? {},
    confirmed_pose_events: input.confirmedEvents ?? [],
  };

  const landmarkData = input.patternData.session_landmarks;

  const pattern = await callGemini<PatternFinderResult>(
    prompts.patternFinder,
    { sessionData, landmarkData: landmarkData.slice(0, 80) }
  );

  const rootCause = await callGemini<RootCauseResult>(
    prompts.rootCauseFinder,
    { pattern, landmarkData: landmarkData.slice(0, 80) }
  );

  const progress = await callGemini<ProgressResult>(
    prompts.progressChecker,
    {
      sessionHistory: input.sessionHistory ?? [],
      currentSession: input.patternData,
      primaryWeakness: pattern.primary_weakness,
    }
  );

  const coachingPrompt = prompts.coachingVoice
    .replace("{sessionData}", JSON.stringify({ ...sessionData, pattern, rootCause, progress }))
    .replace("{landmarkData}", JSON.stringify(landmarkData.slice(0, 100)));

  const raw = await callGemini<RawCoachingFeedback>(
    coachingPrompt,
    { note: "Return JSON only per schema in system prompt" }
  );

  const feedback = normalizeFeedback(raw);

  feedback.main_weakness = {
    ...feedback.main_weakness,
    what_is_happening:
      feedback.main_weakness.what_is_happening || rootCause.what_is_happening,
    root_cause: feedback.main_weakness.root_cause || rootCause.root_cause,
    fight_consequence:
      feedback.main_weakness.fight_consequence || rootCause.fight_consequence,
    mechanical_fix:
      feedback.main_weakness.mechanical_fix || rootCause.mechanical_fix,
    elite_reference:
      feedback.main_weakness.elite_reference || rootCause.elite_reference,
    frequency: feedback.main_weakness.frequency || String(pattern.frequency),
    title: feedback.main_weakness.title || pattern.human_title,
  };

  feedback.pattern_insight =
    feedback.pattern_insight || progress.pattern_insight;

  return feedback;
}
