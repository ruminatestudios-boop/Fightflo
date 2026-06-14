import {
  extractClip,
  extractFrames,
  cleanupSessionFiles,
  parseTimestamp,
} from "@/lib/analysis/extractFrames";
import {
  buildConfirmedEvents,
  detectPoseWithMeta,
} from "@/lib/analysis/poseDetection";
import { findPatterns } from "@/lib/analysis/patternFinder";
import { generateFeedback } from "@/lib/analysis/feedbackWriter";
import { applyPoseConfirmation } from "@/lib/analysis/poseConfirmation";
import { deleteVideo, uploadClip } from "@/lib/storage/cloudinary";
import {
  getSessionById,
  saveReport,
  updateSessionSport,
  updateSessionStatus,
  upsertWeakness,
} from "@/lib/db/queries";
import { detectSportFromFrames } from "@/lib/analysis/sportDetector";
import type { ReportClip, SkillLevel, SportId } from "@/types";

export async function runAnalysisPipeline(sessionId: string): Promise<void> {
  const session = await getSessionById(sessionId);
  if (!session) throw new Error("Session not found");

  try {
    await updateSessionStatus(sessionId, "processing", {
      step: "extracting_frames",
      message: "Extracting frames...",
    });

    const framePaths = await extractFrames(session.video_url, sessionId);

    await updateSessionStatus(sessionId, "processing", {
      step: "detecting_sport",
      message: "Identifying techniques...",
    });

    let sport = session.sport as SportId;
    const detection = await detectSportFromFrames(framePaths, sport);
    if (detection.confidence >= 0.65 && detection.sport !== sport) {
      sport = detection.sport;
      await updateSessionSport(sessionId, sport);
    }

    await updateSessionStatus(sessionId, "processing", {
      step: "analysing_movement",
      message: "Tracking your movement...",
    });

    const poseResult = await detectPoseWithMeta(framePaths, sport);
    const { timeline, quality, landmark_summary } = poseResult;

    await updateSessionStatus(sessionId, "processing", {
      step: "finding_patterns",
      message: "Finding patterns...",
    });

    let patternData = await findPatterns(timeline, sport);
    patternData = applyPoseConfirmation(timeline, patternData);
    const confirmedEvents = buildConfirmedEvents(timeline, patternData);

    await updateSessionStatus(sessionId, "processing", {
      step: "writing_report",
      message: "Writing your coaching report...",
    });

    const feedback = await generateFeedback(
      patternData,
      sport,
      session.level as SkillLevel,
      {
        techniquesSeen: detection.techniques_seen,
        poseQuality: quality,
        landmarkSummary: landmark_summary,
        confirmedEvents,
      }
    );

    await updateSessionStatus(sessionId, "processing", {
      step: "generating_clips",
      message: "Almost ready...",
    });

    const clips = await generateClips(
      session.video_url,
      sessionId,
      feedback
    );

    await saveReport({
      sessionId,
      userId: session.user_id,
      sport,
      feedback,
      landmarkData: timeline,
      clips,
      poseQuality: quality,
      confirmedEvents,
      landmarkSummary: landmark_summary,
    });

    if (session.user_id) {
      await upsertWeakness(
        session.user_id,
        patternData.primary_weakness,
        session.session_number,
        patternData.frequency
      );
    }

    const publicId = (session as { cloudinary_public_id?: string })
      .cloudinary_public_id;
    if (publicId && process.env.DELETE_SOURCE_VIDEO_AFTER_ANALYSIS === "true") {
      await deleteVideo(publicId).catch(() => undefined);
    }

    await cleanupSessionFiles(sessionId);
  } catch (error) {
    await updateSessionStatus(sessionId, "failed", {
      step: "failed",
      message:
        error instanceof Error ? error.message : "Analysis failed",
    });
    throw error;
  }
}

async function generateClips(
  videoUrl: string,
  sessionId: string,
  feedback: {
    main_weakness: { timestamp: string; title: string };
    positives: { timestamp: string; title: string }[];
  }
): Promise<ReportClip[]> {
  const clips: ReportClip[] = [];
  const timestamps = [
    {
      ts: feedback.main_weakness.timestamp,
      type: "weakness" as const,
      description: feedback.main_weakness.title,
      label: "weakness",
    },
    ...feedback.positives.map((p, i) => ({
      ts: p.timestamp,
      type: "positive" as const,
      description: p.title,
      label: `positive_${i}`,
    })),
  ];

  for (const item of timestamps) {
    try {
      const seconds = parseTimestamp(item.ts);
      const clipPath = await extractClip(
        videoUrl,
        sessionId,
        seconds,
        item.label
      );
      const clipUrl = await uploadClip(clipPath, sessionId, item.label);
      clips.push({
        timestamp: item.ts,
        clip_url: clipUrl,
        clip_type: item.type,
        description: item.description,
      });
    } catch {
      clips.push({
        timestamp: item.ts,
        clip_url: "",
        clip_type: item.type,
        description: item.description,
      });
    }
  }

  return clips;
}
