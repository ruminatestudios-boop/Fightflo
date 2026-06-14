"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLivePoseLandmarks } from "@/hooks/useLivePoseLandmarks";
import { computeFrameMetrics } from "@/lib/analysis/poseMetrics";
import type { ConfirmedPoseEvent, FrameLandmarks } from "@/types";
import type { Annotation, LandmarkFrame } from "./types";
import {
  drawBiomechanics,
  drawGuardLine,
  drawGuardWarning,
  drawMotionTrails,
  drawSkeleton,
  type WristTrailPoint,
} from "./SkeletonOverlay";
import { getInterpolatedLandmarksAtTime } from "./landmarkPlayback";
import { getAnnotationAt } from "./utils";
import { getVideoContentRect } from "./videoLayout";

interface OverlayCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarks: LandmarkFrame[];
  annotations: Annotation[];
  className?: string;
  landmarkTimeOffset?: number;
  useLivePose?: boolean;
  confirmedEvents?: ConfirmedPoseEvent[];
}

function shouldShowGuardAlert(
  guardDropped: boolean,
  lookupTime: number,
  confirmedEvents: ConfirmedPoseEvent[],
  usingLivePose: boolean
): boolean {
  if (!guardDropped) return false;
  if (usingLivePose) return true;
  if (confirmedEvents.length === 0) return guardDropped;
  return confirmedEvents.some(
    (e) =>
      (e.weakness_type.includes("guard") ||
        e.weakness_type.includes("chin")) &&
      Math.abs(e.timeSeconds - lookupTime) < 2.5
  );
}

export function drawOverlayFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  currentTime: number,
  storedLandmarks: LandmarkFrame[],
  liveLandmarks: FrameLandmarks | null,
  annotations: Annotation[],
  landmarkTimeOffset: number,
  pulsePhase: number,
  confirmedEvents: ConfirmedPoseEvent[],
  wristTrails: { left: WristTrailPoint[]; right: WristTrailPoint[] }
) {
  ctx.clearRect(0, 0, width, height);

  const layout = getVideoContentRect(video, width, height);
  const lookupTime = currentTime + landmarkTimeOffset;

  const interpolated = getInterpolatedLandmarksAtTime(
    storedLandmarks,
    lookupTime
  );

  const frameLandmarks = liveLandmarks ?? interpolated;
  if (!frameLandmarks) return;

  const metrics = computeFrameMetrics(frameLandmarks);
  const usingLivePose = liveLandmarks !== null;
  const guardDropped = shouldShowGuardAlert(
    metrics.guard_dropped,
    lookupTime,
    confirmedEvents,
    usingLivePose
  );
  const annotation = getAnnotationAt(annotations, lookupTime);

  drawMotionTrails(ctx, wristTrails);

  drawGuardLine(ctx, frameLandmarks, {
    width,
    height,
    layout,
    guardDropped,
    flashGuardLine: guardDropped,
    highlightedJoint: annotation?.jointHighlight,
    pulsePhase,
  });

  drawSkeleton(ctx, frameLandmarks, {
    width,
    height,
    layout,
    guardDropped,
    highlightedJoint: annotation?.jointHighlight,
    pulsePhase,
  });

  drawBiomechanics(ctx, frameLandmarks, layout, metrics);

  drawGuardWarning(ctx, width, guardDropped, pulsePhase);

  if (annotation) {
    drawAnnotation(ctx, annotation, width, height);
  }
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  width: number,
  height: number
) {
  const isWeakness = annotation.type === "weakness";
  const bg = isWeakness
    ? "rgba(250, 65, 65, 0.92)"
    : "rgba(34, 197, 94, 0.92)";
  const label = isWeakness
    ? `${annotation.title.toUpperCase()} ⚠`
    : annotation.title.toUpperCase();

  ctx.save();
  ctx.font = "600 12px var(--font-display, system-ui)";
  const textWidth = ctx.measureText(label).width;
  const padX = 12;
  const boxH = 32;
  const boxW = textWidth + padX * 2;
  const x = width / 2 - boxW / 2;
  const y = height - boxH - 16;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect(x - 2, y - 2, boxW + 4, boxH + 4, 10);
  ctx.fill();

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 8);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, width / 2, y + boxH / 2);

  if (annotation.message) {
    ctx.font = "500 11px var(--font-inter, system-ui)";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(annotation.message, width / 2, y - 10);
  }

  ctx.restore();
}

export function OverlayCanvas({
  videoRef,
  landmarks,
  annotations,
  className = "",
  landmarkTimeOffset = 0,
  useLivePose = true,
  confirmedEvents = [],
}: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pulseRef = useRef(0);
  const trailsRef = useRef<{ left: WristTrailPoint[]; right: WristTrailPoint[] }>({
    left: [],
    right: [],
  });
  const liveLandmarks = useLivePoseLandmarks(videoRef, useLivePose);

  const syncCanvasSize = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const rect = video.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    syncCanvasSize();

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      pulseRef.current += 0.016;
      const rect = video.getBoundingClientRect();
      const layout = getVideoContentRect(video, rect.width, rect.height);

      const lookupTime = video.currentTime + landmarkTimeOffset;
      const interpolated = getInterpolatedLandmarksAtTime(landmarks, lookupTime);
      const frameLandmarks = liveLandmarks ?? interpolated;

      if (frameLandmarks && layout) {
        const lw = frameLandmarks.left_wrist;
        const rw = frameLandmarks.right_wrist;
        if (lw) {
          const p = {
            x: layout.offsetX + lw.x * layout.drawWidth,
            y: layout.offsetY + lw.y * layout.drawHeight,
            age: 0,
          };
          trailsRef.current.left = [p, ...trailsRef.current.left.map((t) => ({ ...t, age: t.age + 1 }))].slice(0, 14);
        }
        if (rw) {
          const p = {
            x: layout.offsetX + rw.x * layout.drawWidth,
            y: layout.offsetY + rw.y * layout.drawHeight,
            age: 0,
          };
          trailsRef.current.right = [p, ...trailsRef.current.right.map((t) => ({ ...t, age: t.age + 1 }))].slice(0, 14);
        }
      }

      drawOverlayFrame(
        ctx,
        video,
        rect.width,
        rect.height,
        video.currentTime,
        landmarks,
        liveLandmarks,
        annotations,
        landmarkTimeOffset,
        pulseRef.current,
        confirmedEvents,
        trailsRef.current
      );

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const onResize = () => syncCanvasSize();
    window.addEventListener("resize", onResize);
    video.addEventListener("loadedmetadata", syncCanvasSize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      video.removeEventListener("loadedmetadata", syncCanvasSize);
    };
  }, [
    videoRef,
    landmarks,
    annotations,
    syncCanvasSize,
    landmarkTimeOffset,
    liveLandmarks,
    confirmedEvents,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    />
  );
}
