"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useLivePoseLandmarks } from "@/hooks/useLivePoseLandmarks";
import {
  computeFrameMetrics,
  type GuardCalibration,
} from "@/lib/analysis/poseMetrics";
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
import { getInterpolatedLandmarksAtTime, hasUsableStoredLandmarks } from "./landmarkPlayback";
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
  /** Hide bottom timestamp pill — used when cinema UI shows the same note */
  suppressAnnotationLabel?: boolean;
  /** Always flag guard drops from pose — guard-only report mode */
  guardFocusMode?: boolean;
  /** Server-calibrated guard line — matches analysis pipeline */
  guardCalibration?: GuardCalibration | null;
}

function resolveLivePoseEnabled(
  useLivePose: boolean | undefined,
  storedReady: boolean
): boolean {
  if (useLivePose === true) return true;
  // Stored-only when we have server pose; otherwise fall back to live tracking
  if (useLivePose === false) return !storedReady;
  return !storedReady;
}

function shouldShowGuardAlert(
  guardDropped: boolean,
  lookupTime: number,
  confirmedEvents: ConfirmedPoseEvent[],
  usingLivePose: boolean,
  guardFocusMode = false
): boolean {
  if (!guardDropped) return false;
  if (guardFocusMode || usingLivePose) return true;
  if (confirmedEvents.length === 0) return guardDropped;
  return confirmedEvents.some(
    (e) =>
      (e.weakness_type.includes("guard") ||
        e.weakness_type.includes("chin")) &&
      Math.abs(e.timeSeconds - lookupTime) < 2.5
  );
}

function drawVideoWatermark(
  ctx: CanvasRenderingContext2D,
  layout: ReturnType<typeof getVideoContentRect>
) {
  const mark = "FIGHTFLO";
  const dot = ".";
  const fontSize = Math.max(11, Math.min(14, layout.drawWidth * 0.038));
  const padX = fontSize * 0.9;
  const padY = fontSize * 0.45;
  const bottomGap = Math.max(10, layout.drawHeight * 0.04);

  ctx.save();
  ctx.font = `700 ${fontSize}px var(--font-display, system-ui)`;
  const markWidth = ctx.measureText(mark).width;
  const dotWidth = ctx.measureText(dot).width;
  const boxW = markWidth + dotWidth + padX * 2;
  const boxH = fontSize + padY * 2;
  const x = layout.offsetX + layout.drawWidth / 2 - boxW / 2;
  const y = layout.offsetY + layout.drawHeight - boxH - bottomGap;

  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 6);
  ctx.fill();

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 6;
  ctx.fillText(mark, x + padX, y + boxH / 2);

  ctx.fillStyle = "#e6544e";
  ctx.fillText(dot, x + padX + markWidth, y + boxH / 2);
  ctx.restore();
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
  wristTrails: { left: WristTrailPoint[]; right: WristTrailPoint[] },
  suppressAnnotationLabel = false,
  guardFocusMode = false,
  guardCalibration: GuardCalibration | null = null,
  usingLivePose = false
) {
  ctx.clearRect(0, 0, width, height);

  const layout = getVideoContentRect(video, width, height);
  const lookupTime = currentTime + landmarkTimeOffset;

  drawVideoWatermark(ctx, layout);

  const interpolated = getInterpolatedLandmarksAtTime(
    storedLandmarks,
    lookupTime
  );

  const frameLandmarks =
    liveLandmarks !== null && usingLivePose
      ? liveLandmarks
      : interpolated;

  if (frameLandmarks) {
    const lw = frameLandmarks.left_wrist;
    const rw = frameLandmarks.right_wrist;
    if (lw) {
      const p = {
        x: layout.offsetX + lw.x * layout.drawWidth,
        y: layout.offsetY + lw.y * layout.drawHeight,
        age: 0,
      };
      wristTrails.left = [p, ...wristTrails.left.map((t) => ({ ...t, age: t.age + 1 }))].slice(0, 14);
    }
    if (rw) {
      const p = {
        x: layout.offsetX + rw.x * layout.drawWidth,
        y: layout.offsetY + rw.y * layout.drawHeight,
        age: 0,
      };
      wristTrails.right = [p, ...wristTrails.right.map((t) => ({ ...t, age: t.age + 1 }))].slice(0, 14);
    }
  }

  if (!frameLandmarks) return;

  const metrics = computeFrameMetrics(frameLandmarks, guardCalibration);
  const guardDropped = shouldShowGuardAlert(
    metrics.guard_dropped,
    lookupTime,
    confirmedEvents,
    usingLivePose,
    guardFocusMode
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
    guardCalibration,
  });

  drawSkeleton(ctx, frameLandmarks, {
    width,
    height,
    layout,
    guardDropped,
    highlightedJoint: annotation?.jointHighlight,
    pulsePhase,
    guardCalibration,
  });

  drawBiomechanics(ctx, frameLandmarks, layout, metrics, guardCalibration);

  if (!guardFocusMode) {
    drawGuardWarning(ctx, width, guardDropped, pulsePhase, guardFocusMode);
  }

  if (annotation && !suppressAnnotationLabel) {
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
  useLivePose = false,
  confirmedEvents = [],
  suppressAnnotationLabel = false,
  guardFocusMode = false,
  guardCalibration = null,
}: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pulseRef = useRef(0);
  const trailsRef = useRef<{ left: WristTrailPoint[]; right: WristTrailPoint[] }>({
    left: [],
    right: [],
  });

  const storedReady = useMemo(
    () => hasUsableStoredLandmarks(landmarks),
    [landmarks]
  );
  const liveEnabled = resolveLivePoseEnabled(useLivePose, storedReady);
  const liveLandmarks = useLivePoseLandmarks(videoRef, liveEnabled);

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
      if (!ctx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      pulseRef.current += 0.016;
      const rect = video.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
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
          trailsRef.current,
          suppressAnnotationLabel,
          guardFocusMode,
          guardCalibration,
          liveEnabled
        );
      }

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
    suppressAnnotationLabel,
    guardFocusMode,
    guardCalibration,
    liveEnabled,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-[3] h-full w-full ${className}`}
      aria-hidden
    />
  );
}
