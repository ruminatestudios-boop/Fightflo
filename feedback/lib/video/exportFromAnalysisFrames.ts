import { mkdir, readFile, writeFile, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import ffmpeg from "fluent-ffmpeg";
import type { ConfirmedPoseEvent, LandmarkTimeline } from "@/types";
import {
  computeFrameMetrics,
  type GuardCalibration,
} from "@/lib/analysis/poseMetrics";
import { FRAMES_PER_SECOND } from "@/lib/analysis/timestamps";
import { configureFfmpeg } from "@/lib/config/ffmpeg";
import {
  countDrawableLandmarkFrames,
  frameTimeSeconds,
  getInterpolatedLandmarksAtTime,
} from "@/components/video/landmarkPlayback";
import {
  drawBiomechanics,
  drawGuardLine,
  drawGuardWarning,
  drawMotionTrails,
  drawSkeleton,
  type WristTrailPoint,
} from "@/lib/video/poseOverlayDraw";
import { computeVideoContentRect } from "@/components/video/videoLayout";
import { probeVideo } from "@/lib/video/videoProbe";

const WATERMARK_FILTER =
  "drawtext=text='FIGHTFLO.':fontcolor=white@0.82:fontsize=32:x=(w-tw)/2:y=h-th-28:shadowcolor=black@0.55:shadowx=2:shadowy=2";

function guardAlertAtTime(
  guardDropped: boolean,
  time: number,
  confirmedEvents: ConfirmedPoseEvent[]
): boolean {
  if (!guardDropped) return false;
  if (confirmedEvents.length === 0) return guardDropped;
  return confirmedEvents.some(
    (e) =>
      (e.weakness_type.includes("guard") ||
        e.weakness_type.includes("chin")) &&
      Math.abs(e.timeSeconds - time) < 2.5
  );
}

function sessionFramesDir(sessionId: string): string {
  return join(tmpdir(), "feedback-frames", sessionId);
}

export function analysisSourceVideoPath(sessionId: string): string {
  return join(sessionFramesDir(sessionId), "source.mp4");
}

/** Fast burn: draw skeleton directly on analysis frames, then encode once */
export async function exportFromAnalysisFrames(
  sessionId: string,
  framePaths: string[],
  timeline: LandmarkTimeline,
  options?: {
    guardCalibration?: GuardCalibration | null;
    confirmedEvents?: ConfirmedPoseEvent[];
  }
): Promise<Buffer> {
  const workDir = join(tmpdir(), "feedback-export", sessionId);
  const compositedDir = join(workDir, "composited");
  await mkdir(compositedDir, { recursive: true });

  const sourcePath = analysisSourceVideoPath(sessionId);
  const outputPath = join(workDir, "overlay-export.mp4");
  const guardCalibration = options?.guardCalibration ?? null;
  const confirmedEvents = options?.confirmedEvents ?? [];
  const trails = { left: [] as WristTrailPoint[], right: [] as WristTrailPoint[] };

  const frameCount = framePaths.length;
  if (frameCount === 0) {
    throw new Error("No analysis frames to export");
  }

  let drawnFrames = 0;

  let videoDuration = frameCount / FRAMES_PER_SECOND;
  try {
    const probe = await probeVideo(sourcePath);
    videoDuration = probe.duration;
  } catch {
    /* use frame-derived duration */
  }

  for (let i = 0; i < frameCount; i++) {
    const image = await loadImage(framePaths[i]);
    const width = image.width;
    const height = image.height;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

    ctx.drawImage(image as unknown as CanvasImageSource, 0, 0, width, height);

    const layout = computeVideoContentRect(width, height, width, height);
    const timelineFrame = timeline[i];
    const t =
      timelineFrame !== undefined
        ? frameTimeSeconds(timelineFrame)
        : frameCount > 1
          ? (i / (frameCount - 1)) * videoDuration
          : 0;
    const frameLandmarks =
      getInterpolatedLandmarksAtTime(timeline, t) ?? timelineFrame?.landmarks;

    if (frameLandmarks && Object.keys(frameLandmarks).length > 0) {
      const lw = frameLandmarks.left_wrist;
      const rw = frameLandmarks.right_wrist;
      if (lw) {
        const p = {
          x: layout.offsetX + lw.x * layout.drawWidth,
          y: layout.offsetY + lw.y * layout.drawHeight,
          age: 0,
        };
        trails.left = [p, ...trails.left.map((pt) => ({ ...pt, age: pt.age + 1 }))].slice(
          0,
          14
        );
      }
      if (rw) {
        const p = {
          x: layout.offsetX + rw.x * layout.drawWidth,
          y: layout.offsetY + rw.y * layout.drawHeight,
          age: 0,
        };
        trails.right = [
          p,
          ...trails.right.map((pt) => ({ ...pt, age: pt.age + 1 })),
        ].slice(0, 14);
      }

      const metrics = computeFrameMetrics(frameLandmarks, guardCalibration);
      const guardDropped = guardAlertAtTime(
        metrics.guard_dropped,
        t,
        confirmedEvents
      );
      const pulsePhase = t * 2;

      drawMotionTrails(ctx, trails);
      drawGuardLine(ctx, frameLandmarks, {
        width,
        height,
        layout,
        guardDropped,
        flashGuardLine: guardDropped,
        pulsePhase,
        guardCalibration,
      });
      drawSkeleton(ctx, frameLandmarks, {
        width,
        height,
        layout,
        guardDropped,
        pulsePhase,
        guardCalibration,
        minVisibility: 0.1,
      });
      drawBiomechanics(ctx, frameLandmarks, layout, metrics);
      drawGuardWarning(ctx, width, guardDropped, pulsePhase);
      drawnFrames++;
    }

    const outPath = join(compositedDir, `frame_${String(i).padStart(4, "0")}.jpg`);
    await writeFile(outPath, canvas.toBuffer("image/jpeg", 92));
  }

  configureFfmpeg();

  const hasSourceAudio = await stat(sourcePath)
    .then(() => true)
    .catch(() => false);

  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg()
      .input(join(compositedDir, "frame_%04d.jpg"))
      .inputOptions([`-framerate ${FRAMES_PER_SECOND}`]);

    if (hasSourceAudio) {
      command.input(sourcePath);
    }

    const outputOptions = hasSourceAudio
      ? [
          "-map",
          "0:v",
          "-map",
          "1:a?",
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
        ]
      : [
          "-map",
          "0:v",
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
          "-movflags",
          "+faststart",
        ];

    command
      .videoFilters([WATERMARK_FILTER])
      .outputOptions(outputOptions)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });

  if (drawnFrames < 2 && countDrawableLandmarkFrames(timeline) < 2) {
    throw new Error("Not enough pose data to burn skeleton overlay");
  }

  return readFile(outputPath);
}
