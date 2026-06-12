"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/lib/audio";
import {
  getTimerRoundPhase,
  phaseLabel,
  pickRestCue,
  pickRoundOpenCue,
} from "@/lib/boxing-timer/phases";
import type {
  TimerConfig,
  TimerRoundPhase,
  TimerSessionStats,
} from "@/lib/boxing-timer/types";
import {
  triggerCountdownHaptic,
  triggerGoHaptic,
  triggerRoundEndHaptic,
} from "@/lib/haptics";
import { getNextMoveSignal } from "@/lib/move-signal-engine";
import { initVoices, speakCoachCueAsync, speakText } from "@/lib/voice";

export type TimerScreen = "work" | "rest" | "countdown" | "complete";

export interface BoxingTimerState {
  screen: TimerScreen;
  currentRound: number;
  totalRounds: number;
  secondsRemaining: number;
  totalSeconds: number;
  phase: TimerRoundPhase | null;
  phaseLabel: string | null;
  moveLabel: string | null;
  moveSublabel: string | null;
  restHint: string | null;
  /** Round that just finished when entering rest (1 after round 1, etc.) */
  restAfterRound: number | null;
  urgent: boolean;
  isPaused: boolean;
  comboPulses: boolean;
}

export interface UseBoxingTimerResult {
  state: BoxingTimerState;
  start: (config: TimerConfig) => void;
  stop: () => TimerSessionStats | null;
  pause: () => void;
  resume: () => void;
  skipRest: () => void;
}

const INITIAL: BoxingTimerState = {
  screen: "countdown",
  currentRound: 1,
  totalRounds: 3,
  secondsRemaining: 3,
  totalSeconds: 3,
  phase: null,
  phaseLabel: null,
  moveLabel: null,
  moveSublabel: null,
  restHint: null,
  restAfterRound: null,
  urgent: false,
  isPaused: false,
  comboPulses: true,
};

export function useBoxingTimer(): UseBoxingTimerResult {
  const [state, setState] = useState<BoxingTimerState>(INITIAL);

  const configRef = useRef<TimerConfig | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const roundsDoneRef = useRef(0);
  const previousMoveIdRef = useRef<string | null>(null);
  const phaseRef = useRef<TimerRoundPhase | null>(null);
  const pausedRef = useRef(false);
  const mountedRef = useRef(true);
  const screenRef = useRef<TimerScreen>("countdown");
  const roundRef = useRef(1);
  const secondsRef = useRef(3);

  const clearTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    tickRef.current = null;
    countdownRef.current = null;
    pulseTimeoutRef.current = null;
  }, []);

  const speak = useCallback((line: string) => {
    if (!configRef.current?.voiceCoaching) return;
    void speakCoachCueAsync(line);
  }, []);

  const scheduleComboPulse = useCallback(() => {
    const config = configRef.current;
    if (!config?.comboPulses || screenRef.current !== "work" || pausedRef.current) {
      return;
    }

    const delay = 4000 + Math.random() * 8000;
    pulseTimeoutRef.current = setTimeout(() => {
      if (
        !mountedRef.current ||
        screenRef.current !== "work" ||
        pausedRef.current ||
        !configRef.current?.comboPulses
      ) {
        return;
      }

      const signal = getNextMoveSignal({
        style: "boxing",
        difficulty: "easy",
        previousMoveId: previousMoveIdRef.current,
      });
      previousMoveIdRef.current = signal.id;

      setState((s) => ({
        ...s,
        moveLabel: signal.move,
        moveSublabel: phaseRef.current ? phaseLabel(phaseRef.current) : null,
      }));

      speakText(signal.speak, 0.92);

      window.setTimeout(() => {
        if (mountedRef.current && screenRef.current === "work") {
          setState((s) => ({ ...s, moveLabel: null, moveSublabel: null }));
        }
      }, 1800);

      scheduleComboPulse();
    }, delay);
  }, []);

  const beginWorkRound = useCallback(
    (round: number) => {
      const config = configRef.current;
      if (!config) return;

      screenRef.current = "work";
      roundRef.current = round;
      secondsRef.current = config.workSeconds;
      phaseRef.current = "feel-out";

      audioEngine.playRoundStartBell();
      speak(pickRoundOpenCue(round));

      setState({
        screen: "work",
        currentRound: round,
        totalRounds: config.rounds,
        secondsRemaining: config.workSeconds,
        totalSeconds: config.workSeconds,
        phase: "feel-out",
        phaseLabel: phaseLabel("feel-out"),
        moveLabel: null,
        moveSublabel: null,
        restHint: null,
        restAfterRound: null,
        urgent: false,
        isPaused: false,
        comboPulses: config.comboPulses,
      });

      scheduleComboPulse();
    },
    [scheduleComboPulse, speak]
  );

  const beginRest = useCallback(
    (afterRound: number) => {
      const config = configRef.current;
      if (!config) return;

      roundsDoneRef.current = afterRound;
      screenRef.current = "rest";
      secondsRef.current = config.restSeconds;
      phaseRef.current = null;

      audioEngine.playRoundBell();
      triggerRoundEndHaptic();

      const hint = pickRestCue(afterRound - 1);
      speak(hint);

      setState({
        screen: "rest",
        currentRound: afterRound + 1,
        totalRounds: config.rounds,
        secondsRemaining: config.restSeconds,
        totalSeconds: config.restSeconds,
        phase: null,
        phaseLabel: null,
        moveLabel: null,
        moveSublabel: null,
        restHint: hint,
        restAfterRound: afterRound,
        urgent: false,
        isPaused: false,
        comboPulses: config.comboPulses,
      });
    },
    [speak]
  );

  const completeSession = useCallback(() => {
    const config = configRef.current;
    if (!config) return;

    screenRef.current = "complete";
    audioEngine.playRoundBell();
    triggerRoundEndHaptic();
    audioEngine.stopAmbience();
    clearTimers();

    setState((s) => ({
      ...s,
      screen: "complete",
      isPaused: false,
      moveLabel: null,
      urgent: false,
    }));
  }, [clearTimers]);

  const tick = useCallback(() => {
    const config = configRef.current;
    if (!config || pausedRef.current) return;

    secondsRef.current -= 1;
    const sec = secondsRef.current;
    const screen = screenRef.current;

    if (screen === "work") {
      const elapsed = config.workSeconds - sec;
      const phase = getTimerRoundPhase(elapsed, config.workSeconds);
      const urgent = phase === "final-ten";

      if (phase !== phaseRef.current) {
        phaseRef.current = phase;
        if (phase === "championship") {
          speak("Championship minute — pick it up.");
        } else if (phase === "final-ten") {
          speak("Final ten. Everything you got.");
          audioEngine.playTrainerClap();
        }
      }

      if (urgent && sec > 0 && sec <= 10) {
        audioEngine.playRoundTick();
        triggerCountdownHaptic();
      }

      if (sec <= 0) {
        if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
        if (roundRef.current >= config.rounds) {
          roundsDoneRef.current = config.rounds;
          completeSession();
          return;
        }
        beginRest(roundRef.current);
        return;
      }

      setState((s) => ({
        ...s,
        secondsRemaining: sec,
        phase,
        phaseLabel: phaseLabel(phase),
        urgent,
      }));
      return;
    }

    if (screen === "rest") {
      if (sec <= 0) {
        beginWorkRound(roundRef.current);
        return;
      }
      setState((s) => ({ ...s, secondsRemaining: sec }));
    }
  }, [beginRest, beginWorkRound, completeSession, speak]);

  const startCountdown = useCallback(() => {
    let step = 3;
    screenRef.current = "countdown";
    secondsRef.current = step;

    setState((s) => ({
      ...s,
      screen: "countdown",
      secondsRemaining: step,
      totalSeconds: 3,
      phase: null,
      phaseLabel: null,
      moveLabel: null,
      restHint: null,
      restAfterRound: null,
      urgent: false,
      isPaused: false,
    }));

    audioEngine.playCountdownStep(3);
    triggerCountdownHaptic();

    countdownRef.current = setInterval(() => {
      step -= 1;
      secondsRef.current = step;

      if (step > 0) {
        audioEngine.playCountdownStep(step as 3 | 2 | 1);
        triggerCountdownHaptic();
        setState((s) => ({ ...s, secondsRemaining: step }));
        return;
      }

      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = null;
      audioEngine.playGo();
      triggerGoHaptic();
      beginWorkRound(1);
    }, 1000);
  }, [beginWorkRound]);

  const start = useCallback(
    (config: TimerConfig) => {
      clearTimers();
      configRef.current = config;
      sessionStartRef.current = Date.now();
      roundsDoneRef.current = 0;
      previousMoveIdRef.current = null;
      pausedRef.current = false;
      roundRef.current = 1;

      void audioEngine.unlock();
      initVoices();
      audioEngine.setSettings({
        crowdAmbience: false,
        gymAmbience: true,
        trainerClaps: true,
        masterVolume: 0.85,
        signalCueMode: "learn",
      });
      audioEngine.startAmbience();

      startCountdown();
      tickRef.current = setInterval(tick, 1000);
    },
    [clearTimers, startCountdown, tick]
  );

  const stop = useCallback((): TimerSessionStats | null => {
    const config = configRef.current;
    if (!config || sessionStartRef.current == null) return null;

    clearTimers();
    audioEngine.stopAmbience();

    const durationSeconds = Math.round(
      (Date.now() - sessionStartRef.current) / 1000
    );
    const completed =
      screenRef.current === "complete"
        ? config.rounds
        : Math.max(0, roundsDoneRef.current);

    configRef.current = null;
    sessionStartRef.current = null;

    setState(INITIAL);

    return {
      presetId: config.presetId,
      label: config.label,
      roundsCompleted: completed,
      totalRounds: config.rounds,
      workSeconds: config.workSeconds,
      restSeconds: config.restSeconds,
      totalWorkSeconds: completed * config.workSeconds,
      durationSeconds,
      comboPulses: config.comboPulses,
    };
  }, [clearTimers]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setState((s) => ({ ...s, isPaused: false }));
    if (screenRef.current === "work" && configRef.current?.comboPulses) {
      scheduleComboPulse();
    }
  }, [scheduleComboPulse]);

  const skipRest = useCallback(() => {
    if (screenRef.current !== "rest") return;
    beginWorkRound(roundRef.current);
  }, [beginWorkRound]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      audioEngine.stopAmbience();
    };
  }, [clearTimers]);

  return { state, start, stop, pause, resume, skipRest };
}
