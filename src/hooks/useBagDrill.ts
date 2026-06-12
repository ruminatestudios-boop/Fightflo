"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  pickNextCombo,
  pickWeaknessFocusedCombo,
  shouldChampionMidSwap,
} from "@/lib/bag-drill/combo-picker";
import { fetchComboFeedback } from "@/lib/bag-drill/detection/fetch-combo-feedback";
import type { GuardState } from "@/lib/bag-drill/detection/guard-monitor";
import { PunchDetectionEngine } from "@/lib/bag-drill/detection/punch-detection-engine";
import {
  createAudioImpactDetector,
  startMediaCapture,
  type MediaCaptureHandles,
} from "@/lib/bag-drill/media-capture";
import {
  formatReaction,
  reactionTier,
  tierColor,
} from "@/lib/bag-drill/reaction-timing";
import {
  prepareBagSpeech,
  speakCombo,
  speakEncouragement,
  speakGuardWarning,
  speakMilestone,
  speakSessionEnd,
  speakSessionStart,
  stopSpeech,
} from "@/lib/bag-drill/speech";
import {
  comboWindowMs,
  expectedHits,
  hitStrikes,
  normaliseStrikeId,
  validateBagComboHits,
} from "@/lib/bag-drill/strike-validator";
import { computeSessionWeaknesses } from "@/lib/bag-drill/weakness";
import { loadBagData } from "@/lib/bag-drill/storage";
import type { BagStance } from "@/lib/bag-drill/calibration";
import type {
  BagCameraMode,
  BagCombo,
  BagSessionRecord,
  BagTrainingConfig,
  DetectionMode,
  ReactionTier,
  StrikeLogEntry,
  StrikeValidation,
} from "@/lib/bag-drill/types";

export interface BagTrainingState {
  elapsedSeconds: number;
  punchCount: number;
  currentCombo: BagCombo | null;
  hitsInCombo: number;
  hitsExpected: number;
  previousComboLabel: string | null;
  lastReactionSeconds: number | null;
  lastReactionTier: ReactionTier | null;
  lastValidation: StrikeValidation;
  accuracyPercent: number;
  avgReactionSeconds: number;
  detectionMode: DetectionMode;
  cameraMode: BagCameraMode;
  statusMessage: string | null;
  nextStrikeLabel: string | null;
  liveConnected: boolean;
  strikeLog: StrikeLogEntry[];
  canDispute: boolean;
  micBackupHint: boolean;
  isActive: boolean;
  inComboWindow: boolean;
  guardWarning: GuardState | null;
  comboCoachTip: string | null;
  guardDropCount: number;
}

export interface UseBagDrillResult {
  state: BagTrainingState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: (config: BagTrainingConfig) => Promise<void>;
  stop: () => BagSessionRecord | null;
  tapPunch: () => void;
  disputeStrike: () => void;
  micBackupPunch: () => void;
}

const INITIAL: BagTrainingState = {
  elapsedSeconds: 0,
  punchCount: 0,
  currentCombo: null,
  hitsInCombo: 0,
  hitsExpected: 0,
  previousComboLabel: null,
  lastReactionSeconds: null,
  lastReactionTier: null,
  lastValidation: null,
  accuracyPercent: 100,
  avgReactionSeconds: 0,
  detectionMode: "pose-triple",
  cameraMode: "fighter",
  statusMessage: null,
  nextStrikeLabel: null,
  liveConnected: false,
  strikeLog: [],
  canDispute: false,
  micBackupHint: false,
  isActive: false,
  inComboWindow: false,
  guardWarning: null,
  comboCoachTip: null,
  guardDropCount: 0,
};

const PUNCH_DEBOUNCE_MS = 110;

export function useBagDrill(): UseBagDrillResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<BagTrainingState>(INITIAL);

  const configRef = useRef<BagTrainingConfig | null>(null);
  const elapsedRef = useRef(0);
  const mediaRef = useRef<MediaCaptureHandles | null>(null);
  const engineRef = useRef<PunchDetectionEngine | null>(null);
  const cleanupAudioRef = useRef<(() => void) | null>(null);
  const lastGuardWarningRef = useRef<GuardState["warning"]>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboWindowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerStartedRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number>(0);
  const previousComboIdRef = useRef<string | null>(null);
  const isRepeatRef = useRef(false);
  const reactionsRef = useRef<number[]>([]);
  const comboReactionsRef = useRef<Record<string, number[]>>({});
  const currentComboRef = useRef<BagCombo | null>(null);
  const inWindowRef = useRef(false);
  const hitsInComboRef = useRef(0);
  const lastPunchAtRef = useRef(0);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);
  const correctCombosRef = useRef(0);
  const attemptedCombosRef = useRef(0);
  const cameraModeRef = useRef<BagCameraMode>("fighter");
  const comboRetryRef = useRef(0);
  const comboResolvedRef = useRef(false);
  const poseDetectionRef = useRef(false);
  const strikeIndexRef = useRef(0);
  const lastAiHitRef = useRef<{ id: string; at: number } | null>(null);
  const finishComboRoundRef = useRef<(v: StrikeValidation) => void>(() => {});
  const weaknessFocusRef = useRef(false);
  const disputeUsedRef = useRef(false);
  const totalPunchesRef = useRef(0);
  const sessionStartedAtRef = useRef("");
  const micBackupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strikeLogRef = useRef<StrikeLogEntry[]>([]);
  const stanceRef = useRef<BagStance>("orthodox");
  const micThresholdRef = useRef<number | undefined>(undefined);
  const registerAiHitRef = useRef<(id: string) => void>(() => {});
  const registerImpactRef = useRef<() => void>(() => {});
  const halfMilestoneSpokenRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    if (comboWindowRef.current) clearTimeout(comboWindowRef.current);
    if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current);
    if (restTimeoutRef.current) clearTimeout(restTimeoutRef.current);
    timerRef.current = null;
    streamIntervalRef.current = null;
    comboWindowRef.current = null;
    graceTimeoutRef.current = null;
    restTimeoutRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    clearTimers();
    stopSpeech();
    engineRef.current?.stop();
    engineRef.current = null;
    poseDetectionRef.current = false;
    cleanupAudioRef.current?.();
    cleanupAudioRef.current = null;
    mediaRef.current?.stop();
    mediaRef.current = null;
    inWindowRef.current = false;
    comboResolvedRef.current = false;
    timerStartedRef.current = null;
    startedRef.current = false;
    comboRetryRef.current = 0;
    strikeIndexRef.current = 0;
    lastAiHitRef.current = null;
    lastGuardWarningRef.current = null;
    disputeUsedRef.current = false;
    strikeLogRef.current = [];
    if (micBackupTimerRef.current) clearTimeout(micBackupTimerRef.current);
    micBackupTimerRef.current = null;
  }, [clearTimers]);

  const syncStrikeLog = useCallback((log: StrikeLogEntry[], extra?: Partial<BagTrainingState>) => {
    strikeLogRef.current = log;
    setState((s) => ({ ...s, strikeLog: log, ...extra }));
  }, []);

  const initStrikeLog = useCallback((combo: BagCombo) => {
    const log: StrikeLogEntry[] = hitStrikes(combo).map((s) => ({
      label: s.label,
      strikeId: s.id,
      status: "pending",
    }));
    disputeUsedRef.current = false;
    syncStrikeLog(log, { canDispute: false, micBackupHint: false });
  }, [syncStrikeLog]);

  const markStrikeHit = useCallback(
    (index: number, micBackup = false) => {
      const log = [...strikeLogRef.current];
      if (!log[index] || log[index].status === "hit") return;
      log[index] = { ...log[index], status: "hit", micBackup };
      syncStrikeLog(log, { micBackupHint: false });
      if (micBackupTimerRef.current) clearTimeout(micBackupTimerRef.current);
    },
    [syncStrikeLog]
  );

  const scheduleMicBackupHint = useCallback(() => {
    if (micBackupTimerRef.current) clearTimeout(micBackupTimerRef.current);
    micBackupTimerRef.current = setTimeout(() => {
      if (!inWindowRef.current || comboResolvedRef.current) return;
      const pending = strikeLogRef.current.some((e) => e.status === "pending");
      if (pending && poseDetectionRef.current && cameraModeRef.current === "fighter") {
        setState((s) => ({ ...s, micBackupHint: true }));
      }
    }, 1200);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      teardown();
    };
  }, [teardown]);

  const isSessionTimeUp = useCallback(() => {
    const config = configRef.current;
    if (!config) return true;
    return elapsedRef.current >= config.timing.durationSeconds;
  }, []);

  const updateAccuracy = useCallback(() => {
    const attempted = attemptedCombosRef.current;
    const correct = correctCombosRef.current;
    const pct = attempted > 0 ? Math.round((correct / attempted) * 100) : 100;
    setState((s) => ({ ...s, accuracyPercent: pct }));
  }, []);

  const recordComboReaction = useCallback(
    (seconds: number, combo: BagCombo, correct: boolean) => {
      if (correct) reactionsRef.current.push(seconds);
      comboReactionsRef.current[combo.label] = [
        ...(comboReactionsRef.current[combo.label] ?? []),
        seconds,
      ];

      const avg =
        reactionsRef.current.length > 0
          ? reactionsRef.current.reduce((a, b) => a + b, 0) /
            reactionsRef.current.length
          : 0;

      setState((s) => ({
        ...s,
        punchCount: s.punchCount + hitsInComboRef.current,
        lastReactionSeconds: correct ? seconds : s.lastReactionSeconds,
        lastReactionTier: correct ? reactionTier(seconds) : s.lastReactionTier,
        avgReactionSeconds: avg,
      }));
    },
    []
  );

  const scheduleNextComboRef = useRef<() => void>(() => {});
  const callCurrentComboRef = useRef<() => void>(() => {});

  const registerAiHit = useCallback(
    (strikeId: string) => {
      const combo = currentComboRef.current;
      if (!combo || !inWindowRef.current || comboResolvedRef.current) return;

      const now = Date.now();
      const normalised = normaliseStrikeId(strikeId);
      const last = lastAiHitRef.current;
      if (last && last.id === normalised && now - last.at < 450) return;
      lastAiHitRef.current = { id: normalised, at: now };

      const sequence = hitStrikes(combo);
      const expected = sequence[strikeIndexRef.current];
      if (!expected) return;

      if (normalised !== expected.id) {
        const log = [...strikeLogRef.current];
        if (log[strikeIndexRef.current]) {
          log[strikeIndexRef.current] = { ...log[strikeIndexRef.current], status: "wrong" };
          syncStrikeLog(log, { canDispute: !disputeUsedRef.current });
        }
        finishComboRoundRef.current("wrong");
        return;
      }

      markStrikeHit(strikeIndexRef.current, false);

      if (strikeIndexRef.current === 0 && timerStartedRef.current) {
        const sec = (now - timerStartedRef.current) / 1000;
        setState((s) => ({
          ...s,
          lastReactionSeconds: sec,
          lastReactionTier: reactionTier(sec),
        }));
      }

      strikeIndexRef.current += 1;
      hitsInComboRef.current = strikeIndexRef.current;
      setState((s) => ({
        ...s,
        hitsInCombo: strikeIndexRef.current,
        nextStrikeLabel: sequence[strikeIndexRef.current]?.label ?? null,
      }));

      scheduleMicBackupHint();

      if (strikeIndexRef.current >= sequence.length) {
        finishComboRoundRef.current("correct");
      }
    },
    [markStrikeHit, scheduleMicBackupHint, syncStrikeLog]
  );

  registerAiHitRef.current = registerAiHit;

  const finishComboRound = useCallback(
    (validation: StrikeValidation) => {
      const config = configRef.current;
      const combo = currentComboRef.current;
      if (!config || !combo || comboResolvedRef.current) return;

      comboResolvedRef.current = true;
      inWindowRef.current = false;
      if (comboWindowRef.current) clearTimeout(comboWindowRef.current);
      if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current);

      const correct = validation === "correct";
      attemptedCombosRef.current += 1;
      if (correct) {
        correctCombosRef.current += 1;
        speakEncouragement();
        const n = attemptedCombosRef.current;
        if (n === 10) speakMilestone("10");
        if (n === 20) speakMilestone("20");
        const dur = config.timing.durationSeconds;
        if (
          !halfMilestoneSpokenRef.current &&
          dur > 0 &&
          elapsedRef.current >= dur / 2
        ) {
          halfMilestoneSpokenRef.current = true;
          speakMilestone("half");
        }
      }
      updateAccuracy();
      totalPunchesRef.current += hitsInComboRef.current;

      if (!correct) {
        const log = strikeLogRef.current.map((e) =>
          e.status === "pending" ? { ...e, status: "miss" as const } : e
        );
        syncStrikeLog(log, {
          canDispute:
            !disputeUsedRef.current &&
            log.some((e) => e.status === "wrong" || e.status === "miss"),
        });
      }

      const reactionSec =
        timerStartedRef.current != null
          ? (Date.now() - timerStartedRef.current) / 1000
          : 0;
      recordComboReaction(reactionSec, combo, correct);

      setState((s) => ({
        ...s,
        lastValidation: validation,
        inComboWindow: false,
        previousComboLabel: correct ? combo.label : s.previousComboLabel,
      }));

      if (!correct && comboRetryRef.current < 1) {
        comboRetryRef.current += 1;
        isRepeatRef.current = true;
        window.setTimeout(() => callCurrentComboRef.current(), 500);
        return;
      }

      comboRetryRef.current = 0;
      isRepeatRef.current = false;

      setState((s) => ({
        ...s,
        currentCombo: null,
        hitsInCombo: 0,
        nextStrikeLabel: null,
        strikeLog: [],
        canDispute: false,
        micBackupHint: false,
        previousComboLabel: combo.label,
      }));

      if (shouldChampionMidSwap(config.difficulty)) {
        previousComboIdRef.current = null;
      }

      const restMs = combo.isFreestyle
        ? (combo.freestyleSeconds ?? 10) * 1000
        : config.timing.restBetweenCombosMs;

      restTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        scheduleNextComboRef.current();
      }, restMs);
    },
    [recordComboReaction, syncStrikeLog, updateAccuracy]
  );

  finishComboRoundRef.current = finishComboRound;

  const closeComboWindow = useCallback(() => {
    const combo = currentComboRef.current;
    const config = configRef.current;
    if (!combo || !config || !inWindowRef.current || comboResolvedRef.current) return;

    const validation =
      cameraModeRef.current === "fighter"
        ? (() => {
            const sequence = hitStrikes(combo);
            const landed = strikeIndexRef.current;
            if (landed >= sequence.length) return "correct" as const;
            if (landed > 0) return "wrong" as const;
            return "miss" as const;
          })()
        : validateBagComboHits(hitsInComboRef.current, combo);
    finishComboRound(validation);
  }, [finishComboRound]);

  const registerImpact = useCallback(() => {
    const combo = currentComboRef.current;
    if (!combo || !inWindowRef.current || comboResolvedRef.current) return;

    const now = Date.now();
    if (now - lastPunchAtRef.current < PUNCH_DEBOUNCE_MS) return;
    lastPunchAtRef.current = now;

    if (hitsInComboRef.current === 0 && timerStartedRef.current) {
      const sec = (now - timerStartedRef.current) / 1000;
      setState((s) => ({
        ...s,
        lastReactionSeconds: sec,
        lastReactionTier: reactionTier(sec),
      }));
    }

    const idx = hitsInComboRef.current;
    hitsInComboRef.current += 1;
    markStrikeHit(idx, false);
    setState((s) => ({ ...s, hitsInCombo: hitsInComboRef.current }));

    const expected = expectedHits(combo);
    if (
      cameraModeRef.current === "bag" &&
      hitsInComboRef.current >= expected &&
      expected > 0
    ) {
      finishComboRound("correct");
    }
  }, [finishComboRound, markStrikeHit]);

  registerImpactRef.current = registerImpact;

  const openComboWindow = useCallback(
    (combo: BagCombo) => {
      const config = configRef.current;
      if (!config) return;

      comboResolvedRef.current = false;
      inWindowRef.current = true;
      hitsInComboRef.current = 0;
      strikeIndexRef.current = 0;
      lastAiHitRef.current = null;
      timerStartedRef.current = Date.now();
      lastPunchAtRef.current = 0;

      const windowMs = comboWindowMs(
        combo,
        config.difficulty,
        config.timing.comboWindowScale
      );
      const expected = expectedHits(combo);

      initStrikeLog(combo);
      const sequence = hitStrikes(combo);
      setState((s) => ({
        ...s,
        inComboWindow: true,
        hitsInCombo: 0,
        hitsExpected: expected,
        lastValidation: null,
        nextStrikeLabel: sequence[0]?.label ?? null,
      }));

      if (poseDetectionRef.current && config.cameraMode === "fighter") {
        scheduleMicBackupHint();
      }

      comboWindowRef.current = setTimeout(() => {
        closeComboWindow();
      }, windowMs);
    },
    [closeComboWindow, initStrikeLog, scheduleMicBackupHint]
  );

  callCurrentComboRef.current = () => {
    const config = configRef.current;
    const combo = currentComboRef.current;
    if (!config || !combo || !mountedRef.current || !startedRef.current) return;
    if (isSessionTimeUp()) return;

    if (combo.isFreestyle) {
      speakCombo(combo.speak, config.difficulty, {
        onEnd: () => openComboWindow(combo),
      });
      return;
    }

    setState((s) => ({
      ...s,
      currentCombo: combo,
      hitsInCombo: 0,
      hitsExpected: expectedHits(combo),
      lastValidation: null,
    }));

    const prefix = isRepeatRef.current ? "Again — " : undefined;
    isRepeatRef.current = false;

    speakCombo(combo.speak, config.difficulty, {
      prefix,
      onEnd: () => {
        if (!mountedRef.current || !startedRef.current) return;
        openComboWindow(combo);
      },
    });
  };

  scheduleNextComboRef.current = () => {
    const config = configRef.current;
    if (!config || !mountedRef.current || !startedRef.current) return;
    if (isSessionTimeUp()) return;

    const bagData = loadBagData();
    const weaknesses = bagData.weaknesses;
    const combo = weaknessFocusRef.current
      ? pickWeaknessFocusedCombo(
          config.difficulty,
          weaknesses,
          previousComboIdRef.current
        )
      : pickNextCombo(config.difficulty, weaknesses, previousComboIdRef.current);
    previousComboIdRef.current = combo.id;
    currentComboRef.current = combo;
    comboRetryRef.current = 0;

    setState((s) => ({
      ...s,
      currentCombo: combo,
      hitsInCombo: 0,
      hitsExpected: expectedHits(combo),
    }));

    callCurrentComboRef.current();
  };

  const tapPunch = useCallback(() => {
    registerImpact();
  }, [registerImpact]);

  const micBackupPunch = useCallback(() => {
    const combo = currentComboRef.current;
    if (!combo || !inWindowRef.current || comboResolvedRef.current) return;
    if (!poseDetectionRef.current || cameraModeRef.current !== "fighter") {
      registerImpact();
      return;
    }
    const idx = strikeIndexRef.current;
    const expected = hitStrikes(combo)[idx];
    if (!expected) return;

    const now = Date.now();
    if (now - lastPunchAtRef.current < PUNCH_DEBOUNCE_MS) return;
    lastPunchAtRef.current = now;

    markStrikeHit(idx, true);
    strikeIndexRef.current += 1;
    hitsInComboRef.current = strikeIndexRef.current;
    const sequence = hitStrikes(combo);
    setState((s) => ({
      ...s,
      hitsInCombo: strikeIndexRef.current,
      nextStrikeLabel: sequence[strikeIndexRef.current]?.label ?? null,
      statusMessage: "Mic backup — counted that strike",
    }));

    if (strikeIndexRef.current >= sequence.length) {
      finishComboRound("correct");
    } else {
      scheduleMicBackupHint();
    }
  }, [finishComboRound, markStrikeHit, registerImpact, scheduleMicBackupHint]);

  const disputeStrike = useCallback(() => {
    if (disputeUsedRef.current || comboResolvedRef.current) return;
    const log = [...strikeLogRef.current];
    const wrongIdx = log.findIndex((e) => e.status === "wrong" || e.status === "miss");
    if (wrongIdx < 0) return;

    disputeUsedRef.current = true;
    log[wrongIdx] = { ...log[wrongIdx], status: "disputed" };
    syncStrikeLog(log, { canDispute: false });
    setState((s) => ({
      ...s,
      statusMessage: "Strike adjusted — keep throwing",
    }));
  }, [syncStrikeLog]);

  const startStreaming = useCallback(
    (mode: DetectionMode) => {
      const handles = mediaRef.current;
      if (!handles?.stream) return;

      if (
        (mode === "audio-hybrid" ||
          mode === "audio-only" ||
          mode === "timer-fallback") &&
        handles.audioContext &&
        handles.stream.getAudioTracks().length
      ) {
        cleanupAudioRef.current = createAudioImpactDetector(
          handles.stream,
          handles.audioContext,
          () => registerImpact(),
          { threshold: micThresholdRef.current }
        );
      }
    },
    [registerImpact]
  );

  const start = useCallback(
    async (config: BagTrainingConfig) => {
      if (startedRef.current) return;
      teardown();
      startedRef.current = true;
      configRef.current = config;
      cameraModeRef.current = config.cameraMode;
      stanceRef.current = config.stance ?? config.calibration?.stance ?? "orthodox";
      micThresholdRef.current = config.calibration?.micThreshold;
      weaknessFocusRef.current = config.weaknessFocus ?? false;
      sessionStartedAtRef.current = new Date().toISOString();
      totalPunchesRef.current = 0;
      elapsedRef.current = 0;
      reactionsRef.current = [];
      comboReactionsRef.current = {};
      correctCombosRef.current = 0;
      attemptedCombosRef.current = 0;
      previousComboIdRef.current = null;
      sessionStartRef.current = Date.now();
      halfMilestoneSpokenRef.current = false;

      const video = videoRef.current;
      let mode: DetectionMode = "timer-fallback";
      let status: string | null =
        "Tap once per strike — triple-signal detection loads with camera + mic";
      setState({
        ...INITIAL,
        isActive: true,
        cameraMode: config.cameraMode,
        detectionMode: "pose-triple",
        statusMessage: status,
      });

      await prepareBagSpeech();
      speakSessionStart();

      if (video) {
        const media = await startMediaCapture(video, {
          facingMode: config.cameraMode === "fighter" ? "user" : "environment",
          highQuality: false,
        });
        mediaRef.current = media.handles;

        if (media.hasCamera && media.hasMic && media.handles.stream) {
          try {
            const engine = new PunchDetectionEngine({
              video,
              stream: media.handles.stream,
              stance: stanceRef.current,
              micThreshold: micThresholdRef.current,
              guardBaseline: config.calibration?.guardBaseline,
              devMode: process.env.NODE_ENV === "development",
              onPunch: (punch) => {
                if (cameraModeRef.current === "fighter") {
                  registerAiHitRef.current(punch.strikeId);
                } else {
                  registerImpactRef.current();
                }
              },
              onComboComplete: (combo, guardDrops) => {
                void fetchComboFeedback({
                  combo,
                  confidence: 85,
                  guardDrops,
                  stance: stanceRef.current,
                }).then((fb) => {
                  if (!mountedRef.current || !fb) return;
                  const dropNote =
                    guardDrops.length > 0
                      ? ` (${guardDrops.join(", ")} dropped)`
                      : "";
                  setState((s) => ({
                    ...s,
                    comboCoachTip: fb.tip,
                    statusMessage: `${combo.name}: ${fb.tip} — ${fb.hype}!${dropNote}`,
                  }));
                });
              },
              onGuardWarning: (guardState) => {
                if (!mountedRef.current) return;
                if (
                  guardState.warning &&
                  guardState.warning !== lastGuardWarningRef.current
                ) {
                  speakGuardWarning(guardState.warning);
                }
                lastGuardWarningRef.current = guardState.warning;
                setState((s) => ({
                  ...s,
                  guardWarning: guardState.warning ? guardState : null,
                  guardDropCount: engineRef.current?.getGuardDropCount() ?? 0,
                }));
              },
              onGpuFallback: () => {
                setState((s) => ({
                  ...s,
                  statusMessage:
                    "For best accuracy use Chrome on a modern phone",
                }));
              },
            });
            engineRef.current = engine;
            const { gpu } = await engine.start();
            poseDetectionRef.current = true;
            mode = "pose-triple";
            status = gpu
              ? config.cameraMode === "fighter"
                ? "Pose + mic + velocity — jab, cross, hook recognition active"
                : "Triple-signal punch detection active"
              : "Detection active (CPU) — use Chrome on a modern phone for best results";
            setState((s) => ({
              ...s,
              detectionMode: mode,
              liveConnected: true,
              statusMessage: status,
            }));
          } catch {
            poseDetectionRef.current = false;
          }
        }

        if (!poseDetectionRef.current) {
          if (!media.hasMic && !media.hasCamera) {
            mode = "timer-fallback";
            status =
              config.cameraMode === "fighter"
                ? "Camera + mic needed for punch recognition"
                : "Tap for each hit in the combo";
          } else if (media.hasMic) {
            mode = "audio-hybrid";
            status = "Mic counts hits — enable camera for punch type recognition";
          } else {
            mode = "visual-tap";
            status = "Tap once per strike in the combo";
          }
          startStreaming(mode);
          setState((s) => ({ ...s, detectionMode: mode, statusMessage: status }));
        }
      }

      scheduleNextComboRef.current();

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setState((s) => ({ ...s, elapsedSeconds: elapsedRef.current }));
      }, 1000);
    },
    [startStreaming, teardown]
  );

  const stop = useCallback((): BagSessionRecord | null => {
    const config = configRef.current;
    if (!config) return null;

    const guardDrops = engineRef.current?.getGuardDropCount() ?? 0;
    speakSessionEnd();
    teardown();

    const duration = Math.min(
      config.timing.durationSeconds,
      Math.round((Date.now() - sessionStartRef.current) / 1000)
    );
    const reactions = reactionsRef.current;
    const avg =
      reactions.length > 0
        ? reactions.reduce((a, b) => a + b, 0) / reactions.length
        : 0;
    const fastest = reactions.length > 0 ? Math.min(...reactions) : 0;
    const comboReactions = { ...comboReactionsRef.current };
    const weaknesses = computeSessionWeaknesses(comboReactions);
    const accuracy =
      attemptedCombosRef.current > 0
        ? Math.round(
            (correctCombosRef.current / attemptedCombosRef.current) * 100
          )
        : 100;

    const record: BagSessionRecord = {
      date: new Date().toISOString().slice(0, 10),
      startedAt: sessionStartedAtRef.current,
      duration,
      sessionType: "combo",
      totalPunches: totalPunchesRef.current || reactions.length,
      avgReactionTime: Math.round(avg * 100) / 100,
      fastestReaction: Math.round(fastest * 100) / 100,
      accuracyPercent: accuracy,
      weaknesses,
      difficulty: config.difficulty,
      cameraMode: config.cameraMode,
      comboReactions,
      guardDrops,
    };

    setState({ ...INITIAL, isActive: false });
    configRef.current = null;
    return record;
  }, [teardown]);

  return { state, videoRef, start, stop, tapPunch, disputeStrike, micBackupPunch };
}

export { formatReaction, tierColor, reactionTier };
