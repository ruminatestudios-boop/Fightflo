import { findPatterns } from "@/lib/analysis/patternFinder";
import { generateFeedback } from "@/lib/analysis/feedbackWriter";
import { detectPose } from "@/lib/analysis/poseDetection";
import {
  getSessionById,
  saveReport,
  updateSessionStatus,
  upsertWeakness,
} from "@/lib/db/queries";
import type { LandmarkTimeline, ReportClip, SkillLevel, SportId } from "@/types";

const STEPS = [
  { step: "extracting_frames", message: "Pulling frames from your video…", ms: 1200 },
  { step: "detecting_sport", message: "Spotting techniques in footage…", ms: 900 },
  { step: "analysing_movement", message: "Tracking joints frame by frame…", ms: 1500 },
  { step: "finding_patterns", message: "Detecting repeated mistakes…", ms: 1200 },
  { step: "writing_report", message: "AI coach reviewing your footage…", ms: 1800 },
  { step: "generating_clips", message: "Putting the final touches on…", ms: 800 },
] as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Demo analysis when Supabase/Gemini/Cloudinary are not configured */
export async function runDemoAnalysisPipeline(
  sessionId: string
): Promise<void> {
  const session = await getSessionById(sessionId);
  if (!session) throw new Error("Session not found");

  try {
    for (const { step, message, ms } of STEPS) {
      await updateSessionStatus(sessionId, "processing", { step, message });
      await sleep(ms);
    }

    const sport = session.sport as SportId;
    const level = session.level as SkillLevel;

    const timeline: LandmarkTimeline = await detectPose([], sport);
    const patternData = await findPatterns(timeline, sport);
    const feedback = await generateFeedback(patternData, sport, level);

    const clips: ReportClip[] = [
      {
        timestamp: feedback.main_weakness.timestamp,
        clip_url: "",
        clip_type: "weakness",
        description: feedback.main_weakness.title,
      },
      ...feedback.positives.map((p) => ({
        timestamp: p.timestamp,
        clip_url: "",
        clip_type: "positive" as const,
        description: p.title,
      })),
    ];

    await saveReport({
      sessionId,
      userId: session.user_id,
      sport,
      feedback,
      landmarkData: timeline,
      clips,
    });

    if (session.user_id) {
      await upsertWeakness(
        session.user_id,
        patternData.primary_weakness,
        session.session_number,
        patternData.frequency
      );
    }
  } catch (error) {
    await updateSessionStatus(sessionId, "failed", {
      step: "failed",
      message: error instanceof Error ? error.message : "Analysis failed",
    });
    throw error;
  }
}
