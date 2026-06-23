"use client";

import { getClientPoseLandmarker } from "@/lib/pose/clientPoseLandmarker";
import { LandmarkLiveBuffer, processLivePoseFrame } from "@/lib/pose/mediapipePose";
import { PersonLockTracker, type RawPose } from "@/lib/pose/personLock";
import type { FrameLandmarks } from "@/types";

type RunningMode = "IMAGE" | "VIDEO";

export interface PersonCandidate {
  pose: RawPose;
  isAutoPick: boolean;
}

/**
 * Non-blocking pose inference — always consumes the freshest frame.
 * Inference never blocks the requestAnimationFrame render loop.
 */
export class AsyncPoseEngine {
  private readonly mode: RunningMode;
  private readonly onLandmarks: (landmarks: FrameLandmarks | null) => void;
  private readonly onCandidates?: (candidates: PersonCandidate[], calibrating: boolean) => void;
  private readonly liveBuffer = new LandmarkLiveBuffer();
  private readonly personLock = new PersonLockTracker();
  private active = false;
  private inferring = false;
  private pendingVideo: HTMLVideoElement | null = null;
  private pendingTimestampMs = 0;
  private consecutiveErrors = 0;
  private landmarkerInit: ReturnType<typeof getClientPoseLandmarker>;

  constructor(
    mode: RunningMode,
    onLandmarks: (landmarks: FrameLandmarks | null) => void,
    onCandidates?: (candidates: PersonCandidate[], calibrating: boolean) => void
  ) {
    this.mode = mode;
    this.onLandmarks = onLandmarks;
    this.onCandidates = onCandidates;
    this.landmarkerInit = getClientPoseLandmarker(mode, mode === "VIDEO");
  }

  start(): void {
    this.active = true;
    this.personLock.reset();
  }

  /** User tapped a specific detected person during the scan window */
  lockOnto(pose: RawPose): void {
    this.personLock.forceLock(pose);
  }

  /** True once inference has failed many times in a row — likely WASM/model load issue */
  get hasFailed(): boolean {
    return this.consecutiveErrors >= 30;
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
          | null
          | undefined;

        if (this.mode === "VIDEO" && landmarker.detectForVideo) {
          const result = landmarker.detectForVideo(
            video,
            timestampMs || performance.now()
          );
          pose = this.personLock.select(result.landmarks);

          if (this.onCandidates) {
            const calibrating = this.personLock.isCalibrating();
            const autoPickIndex = this.personLock.autoPickIndex;
            this.onCandidates(
              result.landmarks.map((p, i) => ({ pose: p, isAutoPick: i === autoPickIndex })),
              calibrating
            );
          }
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
          this.consecutiveErrors = 0;
          const processed = processLivePoseFrame(pose, this.liveBuffer);
          if (processed) {
            this.onLandmarks(processed);
          }
        }
      } catch (error) {
        this.consecutiveErrors += 1;
        if (this.consecutiveErrors === 1 || this.consecutiveErrors % 60 === 0) {
          console.error(
            `[AsyncPoseEngine] inference failed (${this.consecutiveErrors} consecutive):`,
            error
          );
        }
      } finally {
        this.inferring = false;
      }
    }
  }
}
