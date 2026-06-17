import { callGemini, callGeminiVision } from "@/lib/ai/gemini";
import { getSportPrompts } from "@/lib/ai/prompts";
import { diagnoseRootCause } from "@/lib/analysis/rootCause";
import type { SkillFoundationReport } from "@/lib/analysis/skillFoundation";
import {
  humanLabelForWeakness,
} from "@/lib/analysis/poseMetrics";
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
import type { ObservedStrength } from "@/lib/analysis/positiveFinder";

interface RawCoachingFeedback {
  positives: CoachingFeedback["positives"];
  main_weakness: CoachingFeedback["main_weakness"];
  secondary_weaknesses?: CoachingFeedback["secondary_weaknesses"];
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
    secondary_weaknesses: raw.secondary_weaknesses ?? [],
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

function formatFrequency(
  patternData: PatternAnalysisResult,
  confirmedEvents: ConfirmedPoseEvent[]
): string {
  const total = patternData.session_landmarks.length;
  const count = confirmedEvents.length || patternData.frequency;
  if (count > 0 && total > 0) {
    return `${count} confirmed instance${count === 1 ? "" : "s"} across ${total} analysed frames`;
  }
  if (patternData.frequency > 0) {
    return `${patternData.frequency} detected instances in ${total} frames`;
  }
  return "Observed in this session footage";
}

export async function runPromptChain(input: {
  patternData: PatternAnalysisResult;
  sport: SportId;
  level: SkillLevel;
  sessionHistory?: Record<string, unknown>[];
  isFollowUp?: boolean;
  techniquesSeen?: string[];
  poseQuality?: PoseQualityReport;
  landmarkSummary?: Record<string, unknown>;
  confirmedEvents?: ConfirmedPoseEvent[];
  observedStrengths?: ObservedStrength[];
  frameSamples?: string[];
  skillFoundation?: SkillFoundationReport;
}): Promise<CoachingFeedback> {
  const sportConfig = getSportConfig(input.sport);
  const prompts = getSportPrompts(input.sport);
  const confirmedEvents = input.confirmedEvents ?? [];
  const rootCause = diagnoseRootCause(input.patternData, input.sport);

  const primaryEvent = confirmedEvents[0];
  const verifiedPattern = {
    primary_weakness: input.patternData.primary_weakness || primaryEvent?.weakness_type || "",
    human_title:
      primaryEvent?.label ??
      humanLabelForWeakness(input.patternData.primary_weakness),
    frequency: formatFrequency(input.patternData, confirmedEvents),
    event_count: input.patternData.events.length,
    confirmed_event_count: confirmedEvents.length,
    fatigue_detected: input.patternData.fatigue_detected,
    events: input.patternData.events.slice(0, 12),
  };

  // Build ranked list of ALL detected weaknesses for Gemini — primary + secondary
  const weaknessCounts = (input.patternData.pattern_data?.weaknessCounts ?? {}) as Record<string, number>;
  const allDetectedWeaknesses = Object.entries(weaknessCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({
      weakness_type: type,
      human_label: humanLabelForWeakness(type),
      count,
      confirmed_events: confirmedEvents.filter(e => e.weakness_type === type),
    }));

  const sessionData = {
    sport: input.sport,
    sport_name: sportConfig.name,
    level: input.level,
    verified_pattern: verifiedPattern,
    all_detected_weaknesses: allDetectedWeaknesses,
    root_cause_from_pose: rootCause,
    confirmed_pose_events: confirmedEvents,
    observed_strengths: input.observedStrengths ?? [],
    techniques_seen: input.techniquesSeen ?? [],
    pose_quality: input.poseQuality ?? null,
    landmark_summary: input.landmarkSummary ?? {},
    skill_foundation: input.skillFoundation ?? null,
    session_history: input.sessionHistory ?? [],
    progress_note:
      input.isFollowUp && (input.sessionHistory?.length ?? 0) > 0
        ? "This is a FOLLOW-UP clip after the athlete drilled the fix from the parent session in session_history. In pattern_insight, explicitly state what improved vs what got worse compared to that prior clip. Reference the parent main_weakness and drill."
        : (input.sessionHistory?.length ?? 0) > 0
          ? "Compare to prior sessions in session_history."
          : "First tracked session — focus on this footage only.",
  };

  const landmarkData = input.patternData.session_landmarks.slice(0, 80);

  const coachingPayload = {
    sessionData,
    landmarkData,
    instruction:
      "Write coaching ONLY for what is supported by skill_foundation, confirmed_pose_events, observed_strengths, techniques_seen, landmark_summary, and the attached video frames. Use exact timestamps and measurements from skill_foundation.moments — never generic sport clichés.",
  };

  const raw =
    input.frameSamples && input.frameSamples.length > 0
      ? await callGeminiVision<RawCoachingFeedback>(
          prompts.coachingVoice,
          input.frameSamples,
          coachingPayload,
          { usageLabel: "coaching" }
        )
      : await callGemini<RawCoachingFeedback>(
          prompts.coachingVoice,
          coachingPayload,
          { usageLabel: "coaching" }
        );

  const feedback = normalizeFeedback(raw);

  const foundation = input.skillFoundation;
  const primaryMoment =
    foundation?.moments.find(
      (m) => m.weaknessType === foundation.primaryWeaknessType
    ) ?? foundation?.moments[0];

  const weaknessTimestamp =
    primaryMoment?.timestamp ??
    primaryEvent?.timestamp ??
    (feedback.main_weakness.timestamp ||
      input.patternData.events[0]?.start_timestamp ||
      "0:00");

  feedback.main_weakness = {
    ...feedback.main_weakness,
    timestamp: weaknessTimestamp,
    what_is_happening:
      primaryMoment?.detail ??
      confirmedEvents[0]?.detail ??
      (feedback.main_weakness.what_is_happening || rootCause.what_is_happening),
    root_cause: feedback.main_weakness.root_cause || rootCause.root_cause,
    fight_consequence:
      feedback.main_weakness.fight_consequence || rootCause.fight_consequence,
    mechanical_fix:
      primaryMoment?.fix ??
      confirmedEvents[0]?.mechanical_fix ??
      foundation?.mechanicalFix ??
      (feedback.main_weakness.mechanical_fix || rootCause.mechanical_fix),
    elite_reference:
      feedback.main_weakness.elite_reference || rootCause.elite_reference,
    frequency:
      foundation?.frequencyLabel ??
      (feedback.main_weakness.frequency || verifiedPattern.frequency),
    title:
      primaryMoment?.title ??
      confirmedEvents[0]?.label ??
      (feedback.main_weakness.title ||
        primaryEvent?.label ||
        verifiedPattern.human_title),
  };

  if (foundation?.drillName && feedback.drill) {
    feedback.drill = {
      ...feedback.drill,
      name: feedback.drill.name || foundation.drillName,
      description:
        primaryMoment?.fix ??
        foundation.mechanicalFix ??
        feedback.drill.description,
    };
  }

  if (foundation?.coachSummarySeed) {
    feedback.coach_summary = foundation.coachSummarySeed;
  }

  if (input.observedStrengths?.length && feedback.positives.length > 0) {
    // Ground Gemini's positives with pose-verified timestamps and details.
    // Only override fields where Gemini was vague — keep Gemini's richer language
    // when it's more specific than the template text from positiveFinder.
    feedback.positives = feedback.positives.map((positive, i) => {
      const observed = input.observedStrengths?.[i];
      if (!observed) return positive;
      return {
        ...positive,
        // Use observed timestamp only if Gemini's is a placeholder or missing
        timestamp: positive.timestamp && positive.timestamp !== "0:00" ? positive.timestamp : observed.timestamp,
        // Keep Gemini's title if it's more specific than the generic template
        title: positive.title.length > observed.title.length ? positive.title : observed.title,
        // Prefer Gemini's detail if longer/richer, else use observed measurement
        technical_detail: positive.technical_detail.length >= 40
          ? positive.technical_detail
          : observed.detail,
      };
    }).slice(0, 5);
  } else if (!input.observedStrengths?.length) {
    // No pose-verified strengths — trim Gemini positives to what's actually confirmed
    // Keep at most 2 without pose verification to avoid fabrication
    feedback.positives = feedback.positives.slice(0, 2);
  }

  if (!feedback.pattern_insight) {
    feedback.pattern_insight =
      foundation?.summary ??
      (confirmedEvents.length > 0
        ? `${verifiedPattern.human_title} shows up as a repeatable mechanical pattern — fix the root cause and downstream errors resolve.`
        : "Review the attached footage cues and drill focus for this session.");
  }

  return feedback;
}
