"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAudioImpactDetector,
  startMediaCapture,
  type MediaCaptureHandles,
} from "@/lib/bag-drill/media-capture";
import { prepareBagSpeech, speakCombo, stopSpeech } from "@/lib/bag-drill/speech";
import type {
  BagSessionRecord,
  BagTrainingConfig,
  DetectionMode,
} from "@/lib/bag-drill/types";

export type FlurryPhase = "idle" | "countdown" | "go" | "done";

export interface BagFlurryState {
  phase: FlurryPhase;
  countdown: number;
  secondsLeft: number;
  punchCount: number;
  punchesPerSecond: number;
  peakRate: number;
  detectionMode: DetectionMode;
  statusMessage: string | null;
  isActive: boolean;
  flurrySeconds: number;
  personalBest: number | null;
}

export interface UseBagFlurryResult {
  state: BagFlurryState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: (config: BagTrainingConfig) => Promise<void>;
  stop: () => BagSessionRecord | null;
  tapPunch: () => void;
}

const PUNCH_DEBOUNCE_MS = 90;

const INITIAL: BagFlurryState = {
  phase: "idle",
  countdown: 3,
  secondsLeft: 30,
  punchCount: 0,
  punchesPerSecond: 0,
  peakRate: 0,
  detectionMode: "audio-hybrid",
  statusMessage: null,
  isActive: false,
  flurrySeconds: 30,
  personalBest: null,
};

export function useBagFlurry(): UseBagFlurryResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<BagFlurryState>(INITIAL);

  const configRef = useRef<BagTrainingConfig | null>(null);
  const mediaRef = useRef<MediaCaptureHandles | null>(null);
  const cleanupAudioRef = useRef<(() => void) | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flurryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const punchCountRef = useRef(0);
  const lastPunchAtRef = useRef(0);
  const windowStartRef = useRef(0);
  const peakRateRef = useRef(0);
  const sessionStartRef = useRef<string>("");
  const mountedRef = useRef(true);
  const startedRef = useRef(false);
  const phaseRef = useRef<FlurryPhase>("idle");
  const scoringEnabledRef = useRef(false);

  const stopScoring = useCallback(() => {
    scoringEnabledRef.current = false;
    cleanupAudioRef.current?.();
    cleanupAudioRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (flurryRef.current) clearInterval(flurryRef.current);
    countdownRef.current = null;
    flurryRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    clearTimers();
    stopScoring();
    stopSpeech();
    mediaRef.current?.stop();
    mediaRef.current = null;
    startedRef.current = false;
    phaseRef.current = "idle";
  }, [clearTimers, stopScoring]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      teardown();
    };
  }, [teardown]);

  const registerImpact = useCallback(() => {
    if (!scoringEnabledRef.current || phaseRef.current !== "go") return;
    const now = Date.now();
    if (now - lastPunchAtRef.current < PUNCH_DEBOUNCE_MS) return;
    lastPunchAtRef.current = now;
    punchCountRef.current += 1;

    const elapsed = (now - windowStartRef.current) / 1000;
    const rate = elapsed > 0 ? punchCountRef.current / elapsed : 0;
    if (rate > peakRateRef.current) peakRateRef.current = rate;

    setState((s) => ({
      ...s,
      punchCount: punchCountRef.current,
      punchesPerSecond: rate,
      peakRate: peakRateRef.current,
    }));
  }, []);

  const endFlurry = useCallback(() => {
    if (phaseRef.current === "done") return;
    phaseRef.current = "done";
    stopScoring();
    clearTimers();
    setState((s) => ({
      ...s,
      phase: "done",
      isActive: false,
      secondsLeft: 0,
    }));
  }, [clearTimers, stopScoring]);

  const beginFlurryWindow = useCallback(() => {
    const config = configRef.current;
    if (!config) return;
    const seconds = config.flurrySeconds ?? 30;
    scoringEnabledRef.current = true;
    phaseRef.current = "go";
    windowStartRef.current = Date.now();
    punchCountRef.current = 0;
    peakRateRef.current = 0;

    setState((s) => ({
      ...s,
      phase: "go",
      secondsLeft: seconds,
      punchCount: 0,
      punchesPerSecond: 0,
      peakRate: 0,
    }));

    void speakCombo("Go", config.difficulty, { prefix: undefined });

    let left = seconds;
    flurryRef.current = setInterval(() => {
      left -= 1;
      const elapsed = seconds - left;
      const rate = elapsed > 0 ? punchCountRef.current / elapsed : 0;
      if (rate > peakRateRef.current) peakRateRef.current = rate;

      if (!mountedRef.current) return;
      setState((s) => ({
        ...s,
        secondsLeft: Math.max(0, left),
        punchesPerSecond: rate,
        peakRate: peakRateRef.current,
      }));

      if (left <= 0) {
        stopScoring();
        endFlurry();
      }
    }, 1000);
  }, [endFlurry, stopScoring]);

  const startCountdown = useCallback(() => {
    let n = 3;
    phaseRef.current = "countdown";
    setState((s) => ({ ...s, phase: "countdown", countdown: n }));

    countdownRef.current = setInterval(() => {
      n -= 1;
      if (!mountedRef.current) return;
      if (n <= 0) {
        clearTimers();
        beginFlurryWindow();
        return;
      }
      setState((s) => ({ ...s, countdown: n }));
    }, 1000);
  }, [beginFlurryWindow, clearTimers]);

  const start = useCallback(
    async (config: BagTrainingConfig) => {
      if (startedRef.current) return;
      teardown();
      startedRef.current = true;
      configRef.current = config;
      sessionStartRef.current = new Date().toISOString();
      const seconds = config.flurrySeconds ?? 30;

      scoringEnabledRef.current = false;
      phaseRef.current = "idle";

      setState({
        ...INITIAL,
        isActive: true,
        flurrySeconds: seconds,
        secondsLeft: seconds,
        statusMessage: "Mic counts every hit — tap if the bag is quiet",
      });

      await prepareBagSpeech();

      const video = videoRef.current;
      let mode: DetectionMode = "timer-fallback";
      let status = "Tap each hit if mic misses";

      if (video) {
        const media = await startMediaCapture(video, {
          facingMode: config.cameraMode === "fighter" ? "user" : "environment",
          highQuality: config.cameraMode === "fighter",
        });
        mediaRef.current = media.handles;

        if (media.hasMic && media.handles.stream && media.handles.audioContext) {
          mode = "audio-hybrid";
          status = "Mic counts hits — tap any strike the mic misses";
          cleanupAudioRef.current = createAudioImpactDetector(
            media.handles.stream,
            media.handles.audioContext,
            () => registerImpact(),
            {
              cooldownMs: 165,
              calibrateMs: config.calibration ? 0 : 2500,
              threshold: config.calibration?.micThreshold,
            }
          );
        } else {
          mode = "visual-tap";
          status = "Tap once per punch";
        }
      }

      setState((s) => ({
        ...s,
        detectionMode: mode,
        statusMessage: status,
      }));

      void speakCombo(`Flurry — ${seconds} seconds`, config.difficulty, {
        onEnd: () => {
          if (!mountedRef.current) return;
          startCountdown();
        },
      });
    },
    [registerImpact, startCountdown, teardown]
  );

  const stop = useCallback((): BagSessionRecord | null => {
    const config = configRef.current;
    if (!config) return null;
    stopScoring();
    phaseRef.current = "done";
    teardown();

    const seconds = config.flurrySeconds ?? 30;
    const punches = punchCountRef.current;
    const duration = seconds;
    const rate = duration > 0 ? punches / duration : 0;

    const record: BagSessionRecord = {
      date: new Date().toISOString().slice(0, 10),
      startedAt: sessionStartRef.current,
      duration,
      totalPunches: punches,
      avgReactionTime: 0,
      fastestReaction: 0,
      accuracyPercent: 100,
      weaknesses: [],
      difficulty: config.difficulty,
      cameraMode: config.cameraMode,
      comboReactions: {},
      sessionType: "flurry",
      flurrySeconds: seconds,
      flurryPeakRate: Math.round(peakRateRef.current * 10) / 10,
    };

    setState({ ...INITIAL, isActive: false });
    configRef.current = null;
    return record;
  }, [stopScoring, teardown]);

  const tapPunch = useCallback(() => {
    registerImpact();
  }, [registerImpact]);

  return { state, videoRef, start, stop, tapPunch };
}
