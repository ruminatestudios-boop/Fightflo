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
import { buildSessionHistoryEntry } from "@/lib/analysis/sessionHistory";
import { applyPoseConfirmation } from "@/lib/analysis/poseConfirmation";
import { deleteVideo, uploadClip } from "@/lib/storage/cloudinary";
import { parseGuardCalibration } from "@/lib/analysis/guardCalibration";
import { cacheExportVideo } from "@/lib/video/cacheExportVideo";
import { buildFollowUpComparison } from "@/lib/insights/followUpComparison";
import {
  getReportBySessionId,
  getSessionById,
  saveReport,
  updateReportClips,
  updateSessionSport,
  updateSessionStatus,
  upsertWeakness,
} from "@/lib/db/queries";
import { detectSportFromFrames } from "@/lib/analysis/sportDetector";
import { loadFrameSamples } from "@/lib/analysis/frameSamples";
import { findObservedStrengths } from "@/lib/analysis/positiveFinder";
import {
  analyzeSkillFoundation,
  enrichConfirmedEvents,
} from "@/lib/analysis/skillFoundation";
import { humanLabelForWeakness } from "@/lib/analysis/poseMetrics";
import { getSportConfig } from "@/config/sports";
import {
  getScanCostCollector,
  initScanCostFromSession,
} from "@/lib/telemetry/scanCost";
import type { ReportClip, SkillLevel, SportId } from "@/types";

export async function runAnalysisPipeline(sessionId: string): Promise<void> {
  const session = await getSessionById(sessionId);
  if (!session) throw new Error("Session not found");

  await initScanCostFromSession(session);

  let reportSaved = false;

  try {
    await updateSessionStatus(sessionId, "processing", {
      step: "extracting_frames",
      message: "Pulling frames from your video at 12 fps…",
    });

    const framePaths = await extractFrames(session.video_url, sessionId);
    const collector = getScanCostCollector();
    if (collector) collector.frameCount = framePaths.length;

    await updateSessionStatus(sessionId, "processing", {
      step: "extracting_frames",
      message: `Extracted ${framePaths.length} frames — preparing for analysis…`,
    });

    await updateSessionStatus(sessionId, "processing", {
      step: "detecting_sport",
      message: `Checking whether this is ${getSportConfig(session.sport as SportId).name} footage…`,
    });

    let sport = session.sport as SportId;
    const detection = await detectSportFromFrames(framePaths, sport);
    if (detection.confidence >= 0.8 && detection.sport !== sport) {
      sport = detection.sport;
      await updateSessionSport(sessionId, sport);
      await updateSessionStatus(sessionId, "processing", {
        step: "detecting_sport",
        message: `Detected ${getSportConfig(sport).name} (${Math.round(detection.confidence * 100)}% confidence) — updating analysis…`,
      });
    } else if (detection.techniques_seen.length > 0) {
      await updateSessionStatus(sessionId, "processing", {
        step: "detecting_sport",
        message: `Confirmed ${getSportConfig(sport).name} — spotted ${detection.techniques_seen.slice(0, 3).join(", ")}…`,
      });
    }

    await updateSessionStatus(sessionId, "processing", {
      step: "analysing_movement",
      message: `Mapping movement on ${framePaths.length} frames…`,
    });

    const poseResult = await detectPoseWithMeta(framePaths, sport);
    const { timeline, quality, landmark_summary } = poseResult;

    await updateSessionStatus(sessionId, "processing", {
      step: "analysing_movement",
      message: `Tracked ${timeline.length} body poses (${quality.frames_with_pose}/${quality.frames_total} frames with a clear figure)…`,
    });

    await updateSessionStatus(sessionId, "processing", {
      step: "finding_patterns",
      message: "Scanning for dropped guard, chin position, and repeated mistakes…",
    });

    let patternData = await findPatterns(timeline, sport);
    patternData = applyPoseConfirmation(timeline, patternData);
    let confirmedEvents = buildConfirmedEvents(timeline, patternData);
    const skillFoundation = analyzeSkillFoundation(
      timeline,
      sport,
      confirmedEvents
    );
    confirmedEvents = enrichConfirmedEvents(
      timeline,
      confirmedEvents,
      skillFoundation
    );
    const landmark_summary_enriched = {
      ...landmark_summary,
      skill_foundation: {
        pillars: skillFoundation.pillars,
        primary_gap: skillFoundation.primaryGap,
        primary_weakness: skillFoundation.primaryWeaknessType,
        summary: skillFoundation.summary,
        moment_count: skillFoundation.moments.length,
      },
    };
    const observedStrengths = findObservedStrengths(timeline);
    const frameSamples = await loadFrameSamples(framePaths, 10);

    const primaryLabel = patternData.primary_weakness
      ? humanLabelForWeakness(patternData.primary_weakness)
      : null;

    await updateSessionStatus(sessionId, "processing", {
      step: "finding_patterns",
      message: primaryLabel
        ? `Found ${confirmedEvents.length} confirmed issue${confirmedEvents.length === 1 ? "" : "s"} — main focus: ${primaryLabel}…`
        : `Verified ${observedStrengths.length} strength${observedStrengths.length === 1 ? "" : "s"} from your movement…`,
    });

    if (!quality.usable && confirmedEvents.length === 0 && frameSamples.length === 0) {
      throw new Error(
        "Could not track your movement in this video. Film from the side or front with your full body in frame."
      );
    }

    await updateSessionStatus(sessionId, "processing", {
      step: "writing_report",
      message: `Preparing your coaching notes from ${confirmedEvents.length} tracked moments…`,
    });

    const parentSessionId = session.parent_session_id ?? null;
    let sessionHistory: Record<string, unknown>[] = [];
    let parentSession = null;
    let parentReport = null;

    if (parentSessionId) {
      parentSession = await getSessionById(parentSessionId);
      parentReport = parentSession
        ? await getReportBySessionId(parentSessionId)
        : null;
      if (parentSession && parentReport) {
        sessionHistory = [
          buildSessionHistoryEntry(parentSession, parentReport, {
            isFollowUpParent: true,
          }),
        ];
        await updateSessionStatus(sessionId, "processing", {
          step: "writing_report",
          message: `Comparing to your last clip — "${parentReport.main_weakness.title}"…`,
        });
      }
    }

    const feedback = await generateFeedback(
      patternData,
      sport,
      session.level as SkillLevel,
      {
        techniquesSeen: detection.techniques_seen,
        poseQuality: quality,
        landmarkSummary: landmark_summary_enriched,
        confirmedEvents,
        observedStrengths,
        frameSamples,
        sessionHistory,
        isFollowUp: sessionHistory.length > 0,
        skillFoundation,
      }
    );

    let followUpComparison = null;
    if (parentSession && parentReport) {
      followUpComparison = buildFollowUpComparison(parentSession, parentReport, {
        main_weakness: feedback.main_weakness,
        positives: feedback.positives,
        confirmed_events: confirmedEvents,
        pose_quality: quality,
      });
      followUpComparison.summary = feedback.pattern_insight;
    }

    await updateSessionStatus(sessionId, "processing", {
      step: "writing_report",
      message: `Drafted report — main weakness: "${feedback.main_weakness.title}"…`,
    });

    // Save report immediately (no clips yet) so the user can start reading
    const partialReport = await saveReport({
      sessionId,
      userId: session.user_id,
      sport,
      feedback,
      landmarkData: timeline,
      clips: [],
      poseQuality: quality,
      confirmedEvents,
      landmarkSummary: landmark_summary_enriched,
      followUpComparison,
      markComplete: false,
    });

    reportSaved = true;

    // Mark session ready so the report page shows immediately
    await updateSessionStatus(sessionId, "complete", {
      step: "complete",
      message: "Your report is ready — clips loading…",
    });

    await updateSessionStatus(sessionId, "processing", {
      step: "generating_clips",
      message: "Cutting highlight clips at each coaching timestamp…",
    });

    const clips = await generateClips(
      session.video_url,
      sessionId,
      feedback,
      async (id, progress) => {
        await updateSessionStatus(id, "processing", progress);
      }
    );

    // Update report with clips now that they're ready
    await updateReportClips(sessionId, partialReport.id, clips);

    if (session.user_id && patternData.primary_weakness) {
      await upsertWeakness(
        session.user_id,
        patternData.primary_weakness,
        session.session_number,
        patternData.frequency
      );
    }

    await updateSessionStatus(sessionId, "processing", {
      step: "preparing_download",
      message: "Burning skeleton overlay into your downloadable video…",
    });

    try {
      await cacheExportVideo(sessionId, {
        framePaths,
        timeline,
        guardCalibration: landmark_summary
          ? parseGuardCalibration(landmark_summary)
          : null,
        confirmedEvents,
      });
    } catch (exportError) {
      console.error("[pipeline] export cache failed:", exportError);
      const { recordClientError } = await import("@/lib/db/queries");
      await recordClientError({
        message:
          exportError instanceof Error
            ? exportError.message
            : "Export cache failed (unknown error)",
        stack: exportError instanceof Error ? exportError.stack : undefined,
        context: "export-cache",
        userId: session.user_id,
      }).catch(() => undefined);
    }

    const publicId = (session as { cloudinary_public_id?: string })
      .cloudinary_public_id;
    if (publicId && process.env.DELETE_SOURCE_VIDEO_AFTER_ANALYSIS === "true") {
      await deleteVideo(publicId).catch(() => undefined);
    }

    await cleanupSessionFiles(sessionId);

    await updateSessionStatus(sessionId, "complete", {
      step: "complete",
      message: "Your report is ready.",
    });
  } catch (error: unknown) {
    // If the report was already saved, keep the session as complete — clips/export
    // failing after the report is written shouldn't hide the user's results.
    if (reportSaved) {
      await updateSessionStatus(sessionId, "complete", {
        step: "complete",
        message: "Your report is ready.",
      }).catch(() => undefined);
    } else {
      await updateSessionStatus(sessionId, "failed", {
        step: "failed",
        message: error instanceof Error ? error.message : "Analysis failed",
      });
    }
    throw error;
  }
}

async function generateClips(
  videoUrl: string,
  sessionId: string,
  feedback: {
    main_weakness: { timestamp: string; title: string };
    secondary_weaknesses?: { timestamp: string; title: string }[];
    positives: { timestamp: string; title: string }[];
  },
  onProgress?: (
    sessionId: string,
    progress: { step: string; message: string }
  ) => Promise<void>
): Promise<ReportClip[]> {
  const clips: ReportClip[] = [];
  const timestamps = [
    {
      ts: feedback.main_weakness.timestamp,
      type: "weakness" as const,
      description: feedback.main_weakness.title,
      label: "weakness",
    },
    ...(feedback.secondary_weaknesses ?? []).map((w, i) => ({
      ts: w.timestamp,
      type: "weakness" as const,
      description: w.title,
      label: `weakness_${i + 2}`,
    })),
    ...feedback.positives.map((p, i) => ({
      ts: p.timestamp,
      type: "positive" as const,
      description: p.title,
      label: `positive_${i}`,
    })),
  ];

  for (let i = 0; i < timestamps.length; i++) {
    const item = timestamps[i];
    await onProgress?.(sessionId, {
      step: "generating_clips",
      message: `Exporting clip ${i + 1}/${timestamps.length} at ${item.ts} — ${item.description}…`,
    });

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
