import { mkdir, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import ffmpeg from "fluent-ffmpeg";
import { configureFfmpeg } from "@/lib/config/ffmpeg";
import type { ConfirmedPoseEvent, LandmarkTimeline } from "@/types";
import type { GuardCalibration } from "@/lib/analysis/poseMetrics";
import { materializeVideoToPath } from "@/lib/video/materializeVideo";
import { renderOverlayFrameSequence } from "@/lib/video/burnPoseOverlay";
import { probeVideo } from "@/lib/video/videoProbe";
import { hasExportableLandmarks } from "@/components/video/landmarkPlayback";
import { watermarkFilters } from "@/lib/video/watermark";

export interface ExportVideoOptions {
  landmarkTimeline?: LandmarkTimeline | null;
  guardCalibration?: GuardCalibration | null;
  confirmedEvents?: ConfirmedPoseEvent[];
  isPro?: boolean;
}

/** Export session video with pose overlay + FIGHTFLO. watermark burned in */
export async function exportWatermarkedVideo(
  videoUrl: string,
  sessionId: string,
  options?: ExportVideoOptions
): Promise<{ buffer: Buffer; filename: string }> {
  const workDir = join(tmpdir(), "feedback-export", sessionId);
  await mkdir(workDir, { recursive: true });

  const sourcePath = join(workDir, "source.mp4");
  const outputPath = join(workDir, "feedback-export.mp4");

  await materializeVideoToPath(videoUrl, sourcePath);
  configureFfmpeg();

  const probe = await probeVideo(sourcePath);
  const hasLandmarks = hasExportableLandmarks(options?.landmarkTimeline ?? []);

  if (hasLandmarks && options?.landmarkTimeline) {
    const { pattern, fps } = await renderOverlayFrameSequence(
      workDir,
      probe,
      options.landmarkTimeline,
      {
        guardCalibration: options?.guardCalibration,
        confirmedEvents: options?.confirmedEvents,
      }
    );

    const marks = watermarkFilters(Boolean(options?.isPro));
    const filterComplex = [
      `[1:v][0:v]scale2ref=force_original_aspect_ratio=disable[ovl][base]`,
      "[base][ovl]overlay=0:0:format=auto:shortest=1:eof_action=pass[v]",
      marks.length > 0 ? `[v]${marks[0]}[out]` : "[v]copy[out]",
    ].join(";");

    await new Promise<void>((resolve, reject) => {
      ffmpeg(sourcePath)
        .input(pattern)
        .inputFPS(fps)
        .complexFilter(filterComplex)
        .outputOptions([
          "-map",
          "[out]",
          "-map",
          "0:a?",
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
          "-profile:v",
          "main",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          "-shortest",
        ])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(sourcePath)
        .videoFilters(watermarkFilters(Boolean(options?.isPro)))
        .outputOptions([
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
          "-profile:v",
          "main",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
        ])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  }

  const buffer = await readFile(outputPath);
  return {
    buffer,
    filename: `feedback-${sessionId.slice(0, 8)}.mp4`,
  };
}
