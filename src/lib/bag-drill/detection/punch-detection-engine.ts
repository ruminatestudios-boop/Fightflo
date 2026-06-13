"use client";

import type { HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { BagStance } from "../calibration";
import { ComboSequencer, type CompletedCombo } from "./combo-sequencer";
import {
  FUSION_MIC_VELOCITY_MAX_MS,
  FUSION_WINDOW_MS,
  GUARD_CHECK_MS,
  MIN_LOG_CONFIDENCE,
  PUNCH_COOLDOWN_MS,
} from "./constants";
import { GuardMonitor, type GuardBaseline, type GuardState } from "./guard-monitor";
import {
  createHandLandmarker,
  detectHands,
  resetHandLandmarker,
} from "./hand-landmarker";
import { bodyVisible } from "./landmarks";
import { MicPunchDetector } from "./mic-punch-detector";
import {
  classifyPunchTemporal,
  type ClassifiedPunch,
} from "./punch-classifier";
import {
  createPoseLandmarker,
  detectPose,
  resetPoseLandmarker,
} from "./pose-landmarker";
import { TemporalMotionBuffer } from "./temporal-motion-buffer";
import { WristVelocityTracker } from "./wrist-velocity";

export interface DevAccuracyLog {
  frame: number;
  micFired: boolean;
  mediapipeFired: boolean;
  velocityFired: boolean;
  handTracked: boolean;
  temporalFrames: number;
  poseTier: string;
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
  bagProfile?: import("@/lib/bag-drill/detection/bag-thud-detector").BagThudProfile;
  strictSession?: boolean;
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
  private handLandmarker: HandLandmarker | null = null;
  private poseGpu = false;
  private handGpu = false;
  private poseTier = "lite";
  private mic: MicPunchDetector | null = null;
  private velocity = new WristVelocityTracker();
  private motion = new TemporalMotionBuffer();
  private guard = new GuardMonitor();
  private combo = new ComboSequencer((c) => this.handleComboFlush(c));
  private rafId: number | null = null;
  private guardInterval: ReturnType<typeof setInterval> | null = null;
  private frameNumber = 0;
  private running = false;
  private lastLandmarks: import("@mediapipe/tasks-vision").NormalizedLandmark[] | null =
    null;
  private lastHands: import("@mediapipe/tasks-vision").NormalizedLandmark[][] | null =
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

  async start(): Promise<{ gpu: boolean; poseTier: string }> {
    const [{ landmarker, gpu, tier }, handPack] = await Promise.all([
      createPoseLandmarker(),
      createHandLandmarker(),
    ]);

    this.landmarker = landmarker;
    this.handLandmarker = handPack.landmarker;
    this.poseGpu = gpu;
    this.handGpu = handPack.gpu;
    this.poseTier = tier;

    if (!gpu) this.options.onGpuFallback?.();

    this.mic = new MicPunchDetector({
      threshold: this.options.micThreshold,
      bagProfile: this.options.bagProfile,
      strictSession: this.options.strictSession,
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

    return { gpu, poseTier: tier };
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
    this.handLandmarker?.close();
    this.handLandmarker = null;
    resetPoseLandmarker();
    resetHandLandmarker();
    this.velocity.reset();
    this.motion.clear();
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

    const runHandThisFrame =
      this.handLandmarker != null &&
      (this.handGpu || this.frameNumber % 2 === 0);

    if (runHandThisFrame && this.handLandmarker) {
      const handResult = detectHands(this.handLandmarker, video, now);
      this.lastHands = handResult?.landmarks ?? null;
    }

    this.motion.push({
      at: now,
      landmarks,
      hands: this.lastHands,
      width: w,
      height: h,
    });

    const velHit = this.velocity.update(landmarks, w, h, now);
    if (velHit) {
      this.lastVelocityHit = velHit;
      this.pushSignal("velocity", now);
      // Pose confirms body tracking during strike motion — not every idle frame.
      if (bodyVisible(landmarks)) {
        this.pushSignal("pose", now);
      }
    }

    this.tryFuse(now);
  }

  private pushSignal(kind: SignalEvent["kind"], at: number): void {
    this.signals.push({ kind, at });
    const cutoff = at - FUSION_WINDOW_MS;
    this.signals = this.signals.filter((s) => s.at >= cutoff);
  }

  private tryFuse(now: number): void {
    const landmarks = this.lastLandmarks;
    if (!landmarks) return;

    const height = this.options.video.videoHeight || 480;
    const recent = this.signals.filter((s) => now - s.at <= FUSION_WINDOW_MS);
    const micEvents = recent.filter((s) => s.kind === "mic");
    const velEvents = recent.filter((s) => s.kind === "velocity");
    const micFired = micEvents.length > 0;
    const mediapipeFired = recent.some((s) => s.kind === "pose");
    const velocityFired = velEvents.length > 0;
    const allThree = micFired && mediapipeFired && velocityFired;

    const lastMicAt = micEvents.at(-1)?.at ?? 0;
    const lastVelAt = velEvents.at(-1)?.at ?? 0;
    const micVelocityAligned =
      micFired &&
      velocityFired &&
      Math.abs(lastMicAt - lastVelAt) <= FUSION_MIC_VELOCITY_MAX_MS;

    let punchLogged = false;
    let confidence = 0;
    const guardState = this.guard.check(landmarks, height);
    const temporalFrames = this.motion.getRecent();

    if (
      allThree &&
      micVelocityAligned &&
      this.lastVelocityHit &&
      now - this.lastPunchAt > PUNCH_COOLDOWN_MS
    ) {
      const classified = classifyPunchTemporal(
        temporalFrames,
        this.options.stance,
        this.lastVelocityHit
      );
      if (classified && classified.confidence >= MIN_LOG_CONFIDENCE) {
        punchLogged = true;
        confidence = classified.confidence;
        this.lastPunchAt = now;
        this.guard.recordPunch();
        this.signals = [];
        this.motion.clear();
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
        handTracked: (this.lastHands?.length ?? 0) > 0,
        temporalFrames: temporalFrames.length,
        poseTier: this.poseTier,
        allThreeFired: allThree,
        punchLogged,
        confidence,
        guardLeft: guardState.left,
        guardRight: guardState.right,
      };
      if (allThree || punchLogged) {
        console.debug("[fightflo]", log);
      }
    }
  }

  private handleComboFlush(combo: CompletedCombo): void {
    const drops = this.guard.consumeComboGuardDrops();
    this.options.onComboComplete(combo, drops);
  }
}
