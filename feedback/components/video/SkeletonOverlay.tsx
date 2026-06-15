"use client";

import type { RefObject } from "react";
import type { FrameLandmarks } from "@/types";
import {
  drawGuardLine,
  drawSkeleton,
  drawGuardWarning,
  POSE_CONNECTIONS,
  type SkeletonDrawOptions,
  type WristTrailPoint,
} from "@/lib/video/poseOverlayDraw";

export {
  drawGuardLine,
  drawSkeleton,
  drawMotionTrails,
  drawBiomechanics,
  drawGuardWarning,
  POSE_CONNECTIONS,
  type WristTrailPoint,
} from "@/lib/video/poseOverlayDraw";

interface SkeletonOverlayProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  landmarks: FrameLandmarks | null;
  options: SkeletonDrawOptions;
}

/** Imperative canvas overlay — call via ref from parent draw loop */
export function SkeletonOverlay({
  canvasRef,
  landmarks,
  options,
}: SkeletonOverlayProps) {
  if (!landmarks || !canvasRef.current) return null;

  const ctx = canvasRef.current.getContext("2d");
  if (!ctx) return null;

  drawGuardLine(ctx, landmarks, options);
  drawSkeleton(ctx, landmarks, options);
  drawGuardWarning(ctx, options.width, options.guardDropped ?? false);

  return null;
}
