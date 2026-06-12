"use client";

import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { BagStance } from "../calibration";
import { ComboSequencer, type CompletedCombo } from "./combo-sequencer";
import {
  FUSION_WINDOW_MS,
  GUARD_CHECK_MS,
  MIN_LOG_CONFIDENCE,
} from "./constants";
import { GuardMonitor, type GuardBaseline, type GuardState } from "./guard-monitor";
import { bodyVisible } from "./landmarks";
import { MicPunchDetector } from "./mic-punch-detector";
import { classifyPunch, type ClassifiedPunch } from "./punch-classifier";
import { createPoseLandmarker, detectPose } from "./pose-landmarker";
import { WristVelocityTracker } from "./wrist-velocity";

export interface DevAccuracyLog {
  frame: number;
  micFired: boolean;
  mediapipeFired: boolean;
  velocityFired: boolean;
  allThreeFired: boolean;
  punchLogged: boolean;
  confidence: number;
  guardLeft: "up" | "down";
  guardRight: "up" | "down";
}

export interface PunchDetectionEngineOptions {
  video: HTMLVideoElement;
  stream: MediaStream;
  stance: BagStance;
  micThreshold?: number;
  guardBaseline?: GuardBaseline;
  devMode?: boolean;
  onPunch: (punch: ClassifiedPunch) => void;
  onComboComplete: (combo: CompletedCombo, guardDrops: string[]) => void;
  onGuardWarning: (state: GuardState) => void;
  onGpuFallback?: () => void;
}

interface SignalEvent {
  kind: "mic" | "pose" | "velocity";
  at: number;
}

export class PunchDetectionEngine {
  private readonly options: PunchDetectionEngineOptions;
  private landmarker: PoseLandmarker | null = null;
  private mic: MicPunchDetector | null = null;
  private velocity = new WristVelocityTracker();
  private guard = new GuardMonitor();
  private combo = new ComboSequencer((c) => this.handleComboFlush(c));
  private rafId: number | null = null;
  private guardInterval: ReturnType<typeof setInterval> | null = null;
  private lastPoseAt = 0;
  private frameNumber = 0;
  private running = false;
  private lastLandmarks: import("@mediapipe/tasks-vision").NormalizedLandmark[] | null =
    null;
  private signals: SignalEvent[] = [];
  private lastVelocityHit: import("./wrist-velocity").VelocityHit | null = null;
  private lastPunchAt = 0;

  constructor(options: PunchDetectionEngineOptions) {
    this.options = options;
    if (options.guardBaseline) {
      this.guard.setBaseline(options.guardBaseline);
    }
  }

  async start(): Promise<{ gpu: boolean }> {
    const { landmarker, gpu } = await createPoseLandmarker();
    this.landmarker = landmarker;
    if (!gpu) this.options.onGpuFallback?.();

    this.mic = new MicPunchDetector({
      threshold: this.options.micThreshold,
      onSpike: (peak, at) => {
        void peak;
        this.pushSignal("mic", at);
      },
    });
    this.mic.start(this.options.stream);

    this.running = true;
    this.loop();

    this.guardInterval = setInterval(() => {
      if (!this.lastLandmarks) return;
      const h = this.options.video.videoHeight || 480;
      const state = this.guard.check(this.lastLandmarks, h);
      this.options.onGuardWarning(state);
    }, GUARD_CHECK_MS);

    return { gpu };
  }

  stop(): void {
    this.running = false;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.guardInterval) clearInterval(this.guardInterval);
    this.guardInterval = null;
    this.mic?.stop();
    this.mic = null;
    this.landmarker?.close();
    this.landmarker = null;
    this.velocity.reset();
    this.combo.reset();
    this.guard.reset();
  }

  getGuardDropCount(): number {
    return this.guard.getDropCount();
  }

  private loop(): void {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(() => {
      this.tick();
      this.loop();
    });
  }

  private tick(): void {
    const video = this.options.video;
    const landmarker = this.landmarker;
    if (!landmarker || !video.videoWidth) return;

    const now = performance.now();
    const result = detectPose(landmarker, video, now);
    this.frameNumber += 1;

    const landmarks = result?.landmarks?.[0];
    if (!landmarks) return;

    this.lastLandmarks = landmarks;
    const w = video.videoWidth;
    const h = video.videoHeight;

    if (bodyVisible(landmarks)) {
      this.lastPoseAt = now;
      this.pushSignal("pose", now);
    }

    const velHit = this.velocity.update(landmarks, w, h, now);
    if (velHit) {
      this.lastVelocityHit = velHit;
      this.pushSignal("velocity", now);
    }

    this.tryFuse(landmarks, w, h, now);
  }

  private pushSignal(kind: SignalEvent["kind"], at: number): void {
    this.signals.push({ kind, at });
    const cutoff = at - FUSION_WINDOW_MS;
    this.signals = this.signals.filter((s) => s.at >= cutoff);
  }

  private tryFuse(
    landmarks: import("@mediapipe/tasks-vision").NormalizedLandmark[],
    width: number,
    height: number,
    now: number
  ): void {
    const recent = this.signals.filter((s) => now - s.at <= FUSION_WINDOW_MS);
    const micFired = recent.some((s) => s.kind === "mic");
    const mediapipeFired = recent.some((s) => s.kind === "pose");
    const velocityFired = recent.some((s) => s.kind === "velocity");
    const allThree = micFired && mediapipeFired && velocityFired;

    let punchLogged = false;
    let confidence = 0;
    const guardState = this.guard.check(landmarks, height);

    if (allThree && this.lastVelocityHit && now - this.lastPunchAt > 120) {
      const classified = classifyPunch(
        landmarks,
        this.options.stance,
        this.lastVelocityHit,
        width,
        height
      );
      if (classified && classified.confidence >= MIN_LOG_CONFIDENCE) {
        punchLogged = true;
        confidence = classified.confidence;
        this.lastPunchAt = now;
        this.guard.recordPunch();
        this.signals = [];
        this.combo.push(classified.punchNumber);
        this.options.onPunch(classified);
      }
    }

    if (this.options.devMode) {
      const log: DevAccuracyLog = {
        frame: this.frameNumber,
        micFired,
        mediapipeFired,
        velocityFired,
        allThreeFired: allThree,
        punchLogged,
        confidence,
        guardLeft: guardState.left,
        guardRight: guardState.right,
      };
      if (allThree || punchLogged) {
        console.debug("[FlowBag]", log);
      }
    }
  }

  private handleComboFlush(combo: CompletedCombo): void {
    const drops = this.guard.consumeComboGuardDrops();
    this.options.onComboComplete(combo, drops);
  }
}
