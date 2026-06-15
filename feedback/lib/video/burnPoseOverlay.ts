import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { createCanvas } from "@napi-rs/canvas";
import type { ConfirmedPoseEvent, LandmarkTimeline } from "@/types";
import {
  computeFrameMetrics,
  type GuardCalibration,
} from "@/lib/analysis/poseMetrics";
import { getInterpolatedLandmarksAtTime } from "@/components/video/landmarkPlayback";
import { computeVideoContentRect } from "@/components/video/videoLayout";
import {
  drawBiomechanics,
  drawGuardLine,
  drawGuardWarning,
  drawMotionTrails,
  drawSkeleton,
  type WristTrailPoint,
} from "@/lib/video/poseOverlayDraw";
import type { VideoProbe } from "@/lib/video/videoProbe";

const MAX_EXPORT_FRAMES = 720;

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

function exportFpsForDuration(sourceFps: number, duration: number): number {
  let fps = Math.min(sourceFps, 12);
  const frameCount = duration * fps;
  if (frameCount > MAX_EXPORT_FRAMES) {
    fps = Math.max(8, MAX_EXPORT_FRAMES / Math.max(duration, 1));
  }
  return Math.round(fps * 100) / 100;
}

/** Render transparent PNG overlay frames matching the on-screen skeleton */
export async function renderOverlayFrameSequence(
  workDir: string,
  probe: VideoProbe,
  timeline: LandmarkTimeline,
  options?: {
    guardCalibration?: GuardCalibration | null;
    confirmedEvents?: ConfirmedPoseEvent[];
  }
): Promise<{ pattern: string; fps: number }> {
  const overlayDir = join(workDir, "overlays");
  await mkdir(overlayDir, { recursive: true });

  const { width, height, duration } = probe;
  const fps = exportFpsForDuration(probe.fps, duration);
  const frameCount = Math.max(1, Math.ceil(duration * fps));
  const layout = computeVideoContentRect(width, height, width, height);
  const trails = { left: [] as WristTrailPoint[], right: [] as WristTrailPoint[] };
  const guardCalibration = options?.guardCalibration ?? null;
  const confirmedEvents = options?.confirmedEvents ?? [];

  for (let i = 0; i < frameCount; i++) {
    const t = i / fps;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, width, height);

    const frameLandmarks = getInterpolatedLandmarksAtTime(timeline, t);
    if (frameLandmarks) {
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
      });
      drawBiomechanics(ctx, frameLandmarks, layout, metrics);
      drawGuardWarning(ctx, width, guardDropped, pulsePhase);
    }

    const filename = `overlay_${String(i).padStart(6, "0")}.png`;
    await writeFile(join(overlayDir, filename), canvas.toBuffer("image/png"));
  }

  return {
    pattern: join(overlayDir, "overlay_%06d.png"),
    fps,
  };
}
