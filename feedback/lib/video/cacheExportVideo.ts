import { mkdir, readdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { tmpdir } from "os";
import {
  countDrawableLandmarkFrames,
  hasExportableLandmarks,
} from "@/components/video/landmarkPlayback";
import { extractFrames } from "@/lib/analysis/extractFrames";
import { detectPose } from "@/lib/analysis/poseDetection";
import { parseGuardCalibration } from "@/lib/analysis/guardCalibration";
import {
  getReportBySessionId,
  getSessionById,
  updateReportExportUrl,
} from "@/lib/db/queries";
import { isCloudinaryConfigured } from "@/lib/config/env";
import { uploadExportVideo } from "@/lib/storage/cloudinary";
import type { ConfirmedPoseEvent, LandmarkTimeline, Session, SportId } from "@/types";
import { exportFromAnalysisFrames } from "@/lib/video/exportFromAnalysisFrames";
import { exportWatermarkedVideo } from "@/lib/video/exportWatermarkedVideo";
import {
  clearExportManifest,
  localExportFilePath,
  readExportManifest,
  writeExportManifest,
} from "@/lib/video/exportManifest";

export interface CacheExportOptions {
  framePaths?: string[];
  timeline?: LandmarkTimeline;
  videoWidth?: number;
  videoHeight?: number;
  guardCalibration?: ReturnType<typeof parseGuardCalibration>;
  confirmedEvents?: ConfirmedPoseEvent[];
  /** Ignore cached export and burn fresh overlay */
  forceRebuild?: boolean;
}

function sessionFramesDir(sessionId: string): string {
  return join(tmpdir(), "feedback-frames", sessionId);
}

async function resolveFramePaths(
  sessionId: string,
  videoUrl: string,
  provided?: string[],
  forceRefresh = false
): Promise<string[]> {
  if (provided && provided.length > 0) return provided;

  const sessionDir = sessionFramesDir(sessionId);
  if (!forceRefresh) {
    try {
      const files = await readdir(sessionDir);
      const existing = files
        .filter((name) => name.startsWith("frame_") && name.endsWith(".jpg"))
        .sort()
        .map((name) => join(sessionDir, name));
      if (existing.length > 0) return existing;
    } catch {
      /* extract below */
    }
  }

  return extractFrames(videoUrl, sessionId, { forceRefresh });
}

function timelineHasStoredLandmarks(timeline: LandmarkTimeline): boolean {
  return timeline.some(
    (frame) => frame.landmarks && Object.keys(frame.landmarks).length > 0
  );
}

async function buildExportBuffer(
  sessionId: string,
  session: Session,
  timeline: LandmarkTimeline,
  guardCalibration: ReturnType<typeof parseGuardCalibration>,
  confirmedEvents: ConfirmedPoseEvent[],
  framePaths?: string[],
  clientProvidedTimeline = false
): Promise<{ buffer: Buffer; skeletonBurned: boolean }> {
  const hasClientPose =
    hasExportableLandmarks(timeline) || timelineHasStoredLandmarks(timeline);

  if (hasClientPose && clientProvidedTimeline) {
    const resolvedFrames = await resolveFramePaths(
      sessionId,
      session.video_url,
      framePaths,
      true
    );

    const buffer = await exportFromAnalysisFrames(
      sessionId,
      resolvedFrames,
      timeline,
      { guardCalibration, confirmedEvents }
    );

    return { buffer, skeletonBurned: true };
  }

  if (hasClientPose) {
    const result = await exportWatermarkedVideo(
      session.video_url,
      sessionId,
      {
        landmarkTimeline: timeline,
        guardCalibration,
        confirmedEvents,
      }
    );
    return { buffer: result.buffer, skeletonBurned: true };
  }

  if (clientProvidedTimeline) {
    throw new Error(
      "Not enough pose data to burn skeleton overlay — re-film with your full body in frame"
    );
  }

  const resolvedFrames = await resolveFramePaths(
    sessionId,
    session.video_url,
    framePaths
  );

  if (resolvedFrames.length > 0) {
    let exportTimeline = timeline;
    if (!timelineHasStoredLandmarks(exportTimeline)) {
      exportTimeline = await detectPose(
        resolvedFrames,
        session.sport as SportId
      );
    }

    const buffer = await exportFromAnalysisFrames(
      sessionId,
      resolvedFrames,
      exportTimeline,
      { guardCalibration, confirmedEvents }
    );

    const drawable = countDrawableLandmarkFrames(exportTimeline);
    return { buffer, skeletonBurned: drawable >= 2 };
  }

  const result = await exportWatermarkedVideo(session.video_url, sessionId);
  return { buffer: result.buffer, skeletonBurned: false };
}

/** Build overlay export during analysis — download is instant after this */
export async function cacheExportVideo(
  sessionId: string,
  options?: CacheExportOptions
): Promise<string> {
  if (!options?.forceRebuild) {
    const manifest = await readExportManifest(sessionId);
    if (manifest?.url) return manifest.url;
  } else {
    await clearExportManifest(sessionId);
  }

  const session = await getSessionById(sessionId);
  const report = await getReportBySessionId(sessionId);
  if (!session) throw new Error("Session not found");
  if (!report) throw new Error("Report not found");

  const timeline = options?.timeline ?? report.raw_landmark_data ?? [];
  const guardCalibration =
    options?.guardCalibration ??
    parseGuardCalibration(report.landmark_summary);
  const confirmedEvents = options?.confirmedEvents ?? report.confirmed_events ?? [];

  const { buffer, skeletonBurned } = await buildExportBuffer(
    sessionId,
    session,
    timeline,
    guardCalibration,
    confirmedEvents,
    options?.framePaths,
    Boolean(options?.timeline)
  );

  if (!skeletonBurned) {
    throw new Error(
      "Could not burn skeleton overlay — re-film with your full body in frame"
    );
  }

  let exportUrl: string;
  if (isCloudinaryConfigured()) {
    exportUrl = await uploadExportVideo(buffer, sessionId);
  } else {
    const filePath = localExportFilePath(sessionId);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    exportUrl = filePath;
  }

  await writeExportManifest(sessionId, exportUrl, { hasSkeleton: true }).catch(
    () => undefined
  );
  await updateReportExportUrl(sessionId, exportUrl).catch((error) => {
    console.warn("[cacheExportVideo] DB export URL not saved:", error);
  });

  return exportUrl;
}
