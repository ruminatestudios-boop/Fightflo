"use client";

import { getClientPoseLandmarker } from "@/lib/pose/clientPoseLandmarker";
import { LandmarkLiveBuffer, processLivePoseFrame } from "@/lib/pose/mediapipePose";
import type { FrameLandmarks } from "@/types";

type RunningMode = "IMAGE" | "VIDEO";

/**
 * Non-blocking pose inference — always consumes the freshest frame.
 * Inference never blocks the requestAnimationFrame render loop.
 */
export class AsyncPoseEngine {
  private readonly mode: RunningMode;
  private readonly onLandmarks: (landmarks: FrameLandmarks | null) => void;
  private readonly liveBuffer = new LandmarkLiveBuffer();
  private active = false;
  private inferring = false;
  private pendingVideo: HTMLVideoElement | null = null;
  private pendingTimestampMs = 0;
  private landmarkerInit: ReturnType<typeof getClientPoseLandmarker>;

  constructor(
    mode: RunningMode,
    onLandmarks: (landmarks: FrameLandmarks | null) => void
  ) {
    this.mode = mode;
    this.onLandmarks = onLandmarks;
    this.landmarkerInit = getClientPoseLandmarker(mode, mode === "VIDEO");
  }

  start(): void {
    this.active = true;
  }

  stop(): void {
    this.active = false;
    this.pendingVideo = null;
    this.inferring = false;
    this.liveBuffer.reset();
  }

  /** Queue the latest frame; skips backlog while inference is in flight */
  scheduleFrame(video: HTMLVideoElement, timestampMs?: number): void {
    if (!this.active) return;
    this.pendingVideo = video;
    if (timestampMs !== undefined) {
      this.pendingTimestampMs = timestampMs;
    }
    if (!this.inferring) {
      void this.drainQueue();
    }
  }

  private async drainQueue(): Promise<void> {
    if (this.inferring || !this.active) return;

    while (this.pendingVideo && this.active) {
      const video = this.pendingVideo;
      const timestampMs = this.pendingTimestampMs;
      this.pendingVideo = null;
      this.inferring = true;

      try {
        await this.landmarkerInit;
        const landmarker = await getClientPoseLandmarker(
          this.mode,
          this.mode === "VIDEO"
        );

        let pose:
          | Array<{ x: number; y: number; z: number; visibility?: number }>
          | undefined;

        if (this.mode === "VIDEO" && landmarker.detectForVideo) {
          const result = landmarker.detectForVideo(
            video,
            timestampMs || performance.now()
          );
          pose = result.landmarks[0];
        } else if (video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const result = landmarker.detect(canvas);
            pose = result.landmarks[0];
          }
        }

        if (pose) {
          const processed = processLivePoseFrame(pose, this.liveBuffer);
          if (processed) {
            this.onLandmarks(processed);
          }
        }
      } catch {
        /* model loading / GPU fallback — retain last landmarks */
      } finally {
        this.inferring = false;
      }
    }
  }
}
