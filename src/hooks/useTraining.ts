"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/lib/audio";
import {
  generateComboPauseCoachSchedule,
  generateSignalPauseCoachSchedule,
  type CoachPauseEvent,
} from "@/lib/coach-cues";
import { generateComboSchedule } from "@/lib/combo-engine";
import { getActiveRhythmSegment } from "@/lib/fight-rhythm-engine";
import {
  countBursts,
  countChaosMoments,
  generateMoveCallSchedule,
  generateSignalSchedule,
  shouldUseMoveCallEngine,
} from "@/lib/signal-engine";
import {
  buildSummaryMessage,
  computePressureRating,
  computeReactionScore,
} from "@/lib/scoring";
import { triggerGoHaptic, triggerCountdownHaptic, triggerHaptic, triggerRoundEndHaptic } from "@/lib/haptics";
import { cancelCoachVoice, initCoachVoice, interruptCoachPlayback, prefetchCoachLines, speakCoachLine, unlockCoachAudio } from "@/lib/coach-voice";
import { ROUND_OPEN_CUES, TRAINER_IDLE_ACTIONS } from "@/lib/idle-coaching";
import { getSignalLabel } from "@/lib/i18n";
import { setVoiceLanguage } from "@/lib/voice";
import type {
  AppSettings,
  ComboEvent,
  RhythmBlueprint,
  RhythmSegment,
  RoundStats,
  SessionStats,
  MoveCallEvent,
  SignalEvent,
  SignalType,
  TrainingPhase,
} from "@/lib/types";
import { SPRINT_FINISHER_CUES } from "@/lib/sprint-finisher";
import { CLEAR_SIGNALS } from "@/lib/types";

interface UseTrainingOptions {
  settings: AppSettings;
  challengeName: string | null;
  /** Themed corner lines for opponent / custom sessions */
  sessionCoachCues?: string[] | null;
  /** What to do during quiet phases — trainer pace */
  lowActivityCoaching?: string[] | null;
  /** Fighter name for segment-specific coaching (opponent mode) */
  fighterDisplayName?: string | null;
  /** Between-round corner line */
  restCornerCue?: string | null;
  /** Fight-realistic pacing script (from AI or patterns) */
  rhythmBlueprint?: RhythmBlueprint | null;
  onComplete: (stats: SessionStats, durationSeconds: number) => void;
  onRestStart: (round: number) => void;
}

export function useTraining({
  settings,
  challengeName,
  sessionCoachCues,
  lowActivityCoaching,
  fighterDisplayName,
  restCornerCue,
  rhythmBlueprint,
  onComplete,
  onRestStart,
}: UseTrainingOptions) {
  const isCombos = settings.workoutMode === "combos";
  const useMoveCalls = shouldUseMoveCallEngine(settings);

  const [phase, setPhase] = useState<TrainingPhase>({
    phase: "countdown",
    currentRound: 1,
    timeRemaining: 3,
    activeSignal: null,
    activeCombo: null,
  });
  const [countdownValue, setCountdownValue] = useState(3);
  const [roundStats, setRoundStats] = useState<RoundStats[]>([]);

  const scheduleRef = useRef<SignalEvent[]>([]);
  const moveScheduleRef = useRef<MoveCallEvent[]>([]);
  const comboScheduleRef = useRef<ComboEvent[]>([]);
  const coachScheduleRef = useRef<CoachPauseEvent[]>([]);
  const cueIndexRef = useRef(0);
  const coachIndexRef = useRef(0);
  const cueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coachTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coachClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundEventsRef = useRef<SignalEvent[]>([]);
  const roundMovesRef = useRef<MoveCallEvent[]>([]);
  const roundCombosRef = useRef<ComboEvent[]>([]);
  const roundStartRef = useRef(0);
  const mountedRef = useRef(true);
  const voicedSignalsRef = useRef<Set<SignalType>>(new Set());
  const sessionStartRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rhythmTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoachSpokeRef = useRef(0);
  const sprintFinisherRef = useRef(false);
  const sprintFinisherIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseStartedRef = useRef(0);
  const activeRoundRef = useRef(1);

  const clearTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current);
    if (coachTimeoutRef.current) clearTimeout(coachTimeoutRef.current);
    if (coachClearRef.current) clearTimeout(coachClearRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (rhythmTickRef.current) clearInterval(rhythmTickRef.current);
    if (sprintFinisherIntervalRef.current) clearInterval(sprintFinisherIntervalRef.current);
    tickRef.current = null;
    cueTimeoutRef.current = null;
    coachTimeoutRef.current = null;
    coachClearRef.current = null;
    countdownIntervalRef.current = null;
    rhythmTickRef.current = null;
    sprintFinisherIntervalRef.current = null;
  }, []);

  const fireSignal = useCallback(
    (type: SignalType, duration: number, segment?: RhythmSegment) => {
      const alreadyVoiced = voicedSignalsRef.current.has(type);
      const isClear = settings.cueStyle === "clear";
      audioEngine.setRoundIntensity(segment);

      setPhase((p) => ({
        ...p,
        activeSignal: type,
        activeCombo: null,
        rhythmSegment: null,
        coachCue: null,
        learningCue:
          isClear ||
          (settings.audio.signalCueMode === "learn" && !alreadyVoiced),
      }));
      triggerHaptic(type);
      if (
        !isClear &&
        settings.audio.trainerClaps &&
        Math.random() < 0.08
      ) {
        audioEngine.playTrainerClap();
      }

      cueTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setPhase((p) => ({
          ...p,
          activeSignal: null,
          learningCue: false,
          rhythmSegment: getActiveRhythmSegment(
            scheduleRef.current,
            (Date.now() - roundStartRef.current) / 1000
          ),
        }));
      }, duration * 1000);

      interruptCoachPlayback();
      const usedVoice = audioEngine.playSignalCue(
        type,
        settings.audio.signalCueMode,
        alreadyVoiced,
        settings.cueStyle,
        segment,
        {
          onStart: () => {
            lastCoachSpokeRef.current = Date.now();
          },
        }
      );

      if (usedVoice) voicedSignalsRef.current.add(type);
    },
    [settings.audio.signalCueMode, settings.cueStyle, settings.audio.trainerClaps]
  );

  const fireMove = useCallback(
    (event: MoveCallEvent) => {
      triggerHaptic("attack");

      setPhase((p) => ({
        ...p,
        activeMoveCall: { label: event.move, speak: event.speak },
        activeSignal: null,
        activeCombo: null,
        rhythmSegment: null,
        coachCue: null,
        learningCue: false,
      }));

      if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current);
      cueTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setPhase((p) => ({
          ...p,
          activeMoveCall: null,
        }));
      }, event.duration * 1000);

      interruptCoachPlayback();
      speakCoachLine(
        event.speak,
        settings.audio.masterVolume,
        settings.language,
        {
          onStart: () => {
            lastCoachSpokeRef.current = Date.now();
          },
        }
      );
    },
    [settings.audio.masterVolume, settings.language]
  );

  const fireCombo = useCallback((event: ComboEvent) => {
    audioEngine.setRoundIntensity(event.segment);
    triggerHaptic("attack");

    setPhase((p) => ({
      ...p,
      activeCombo: { label: event.label, speak: event.speak },
      activeSignal: null,
      learningCue: false,
      coachCue: null,
    }));

    if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current);
    cueTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setPhase((p) => ({ ...p, activeCombo: null }));
    }, event.duration * 1000);

    interruptCoachPlayback();
    audioEngine.playComboCue(event.speak, event.segment, {
      onStart: () => {
        lastCoachSpokeRef.current = Date.now();
      },
    });
  }, []);

  const fireCoachCue = useCallback(
    (text: string, options?: { speak?: boolean }) => {
      const shouldSpeak = options?.speak ?? false;
      lastCoachSpokeRef.current = Date.now();
      setPhase((p) => {
        if (p.phase !== "active" || p.activeSignal || p.activeCombo) return p;
        return { ...p, coachCue: text };
      });

      if (shouldSpeak) {
        interruptCoachPlayback();
        speakCoachLine(text, settings.audio.masterVolume, settings.language, {
          onEnd: () => {
            setPhase((p) => ({
              ...p,
              coachCue: p.coachCue === text ? null : p.coachCue,
            }));
          },
        });
      }

      if (coachClearRef.current) clearTimeout(coachClearRef.current);
      coachClearRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setPhase((p) => ({
          ...p,
          coachCue: p.coachCue === text ? null : p.coachCue,
        }));
      }, shouldSpeak ? 4500 : 3200);
    },
    [settings.audio.masterVolume, settings.language]
  );

  const scheduleNextCoachCue = useCallback(() => {
    const events = coachScheduleRef.current;
    const idx = coachIndexRef.current;
    if (idx >= events.length) return;

    const event = events[idx];
    const elapsed = (Date.now() - roundStartRef.current) / 1000;
    const delay = Math.max(0, (event.timestamp - elapsed) * 1000);

    coachTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      fireCoachCue(event.text);
      coachIndexRef.current = idx + 1;
      scheduleNextCoachCue();
    }, delay);
  }, [fireCoachCue]);

  const scheduleNextCue = useCallback(() => {
    if (isCombos) {
      const events = comboScheduleRef.current;
      const idx = cueIndexRef.current;
      if (idx >= events.length) return;

      const event = events[idx];
      const elapsed = (Date.now() - roundStartRef.current) / 1000;
      const delay = Math.max(0, (event.timestamp - elapsed) * 1000);

      cueTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        roundCombosRef.current.push(event);
        fireCombo(event);
        cueIndexRef.current = idx + 1;
        scheduleNextCue();
      }, delay);
    } else if (useMoveCalls) {
      const events = moveScheduleRef.current;
      const idx = cueIndexRef.current;
      if (idx >= events.length) return;

      const event = events[idx];
      const elapsed = (Date.now() - roundStartRef.current) / 1000;
      const delay = Math.max(0, (event.timestamp - elapsed) * 1000);

      cueTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        roundMovesRef.current.push(event);
        fireMove(event);
        cueIndexRef.current = idx + 1;
        scheduleNextCue();
      }, delay);
    } else {
      const events = scheduleRef.current;
      const idx = cueIndexRef.current;
      if (idx >= events.length) return;

      const event = events[idx];
      const elapsed = (Date.now() - roundStartRef.current) / 1000;
      const delay = Math.max(0, (event.timestamp - elapsed) * 1000);

      cueTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        roundEventsRef.current.push(event);
        fireSignal(event.type, event.duration, event.segment);
        cueIndexRef.current = idx + 1;
        scheduleNextCue();
      }, delay);
    }
  }, [isCombos, useMoveCalls, fireSignal, fireCombo, fireMove]);

  const endRound = useCallback(
    (roundNumber: number) => {
      clearTimers();
      audioEngine.playRoundBell();
      triggerRoundEndHaptic();

      const cueCount = isCombos
        ? roundCombosRef.current.length
        : useMoveCalls
          ? roundMovesRef.current.length
          : roundEventsRef.current.length;

      const burstEvents = useMoveCalls
        ? roundMovesRef.current.map((m, i) => ({
            type: "attack" as SignalType,
            timestamp: m.timestamp,
            duration: m.duration,
          }))
        : roundEventsRef.current;

      const stats: RoundStats = {
        roundNumber,
        signalsFired: cueCount,
        bursts: isCombos ? 0 : countBursts(burstEvents),
        chaosMoments: isCombos ? 0 : countChaosMoments(burstEvents),
      };

      setRoundStats((prev) => {
        const updated = [...prev, stats];
        const totalRounds = settings.rounds.rounds;

        if (roundNumber < totalRounds) {
          const cornerText = restCornerCue?.trim() ?? "";
          onRestStart(roundNumber);
          setPhase({
            phase: "rest",
            currentRound: roundNumber + 1,
            timeRemaining: settings.rounds.restTime,
            activeSignal: null,
            activeCombo: null,
            activeMoveCall: null,
            restCornerCue: cornerText || null,
          });
          if (cornerText) {
            speakCoachLine(
              cornerText,
              settings.audio.masterVolume,
              settings.language
            );
          }
        } else {
          const totalSignals = updated.reduce((s, r) => s + r.signalsFired, 0);
          const reactionScore = computeReactionScore(updated, settings.mode);
          const pressureRating = computePressureRating(
            settings.mode,
            totalSignals,
            totalRounds
          );
          const survived = settings.mode === "stadium" || settings.mode === "hard";

          setPhase({
            phase: "complete",
            currentRound: roundNumber,
            timeRemaining: 0,
            activeSignal: null,
            activeCombo: null,
          });

          const durationSeconds = sessionStartRef.current
            ? Math.round((Date.now() - sessionStartRef.current) / 1000)
            : 0;

          onComplete(
            {
              style: settings.style,
              mode: settings.mode,
              workoutMode: settings.workoutMode,
              challengeName,
              totalSignals,
              reactionScore,
              pressureRating,
              roundsCompleted: totalRounds,
              totalRounds,
              survived,
              trainingCategory: settings.trainingCategory,
              sprintFinisherUsed: sprintFinisherRef.current,
            },
            durationSeconds
          );
        }

        return updated;
      });

      roundEventsRef.current = [];
      roundMovesRef.current = [];
      roundCombosRef.current = [];
      cueIndexRef.current = 0;
      coachIndexRef.current = 0;
    },
    [clearTimers, settings, challengeName, onComplete, onRestStart, isCombos, useMoveCalls, restCornerCue]
  );

  const startSprintFinisherInterval = useCallback(() => {
    if (sprintFinisherIntervalRef.current) return;
    let cueIndex = 0;
    sprintFinisherIntervalRef.current = setInterval(() => {
      if (!mountedRef.current || isPausedRef.current) return;
      fireSignal("burnout", 0.55, "pressure");
      cueIndex += 1;
      if (cueIndex % 3 === 0) {
        const line =
          SPRINT_FINISHER_CUES[Math.floor(Math.random() * SPRINT_FINISHER_CUES.length)];
        fireCoachCue(line, { speak: true });
      }
    }, 3500);
  }, [fireSignal, fireCoachCue]);

  const startRoundIntervals = useCallback(
    (roundNumber: number) => {
      rhythmTickRef.current = setInterval(() => {
        if (isPausedRef.current) return;
        const elapsed = (Date.now() - roundStartRef.current) / 1000;
        const events = isCombos
          ? comboScheduleRef.current
          : useMoveCalls
            ? moveScheduleRef.current.map((m) => ({
                type: "attack" as SignalType,
                timestamp: m.timestamp,
                duration: m.duration,
              }))
            : scheduleRef.current;
        const segment = getActiveRhythmSegment(events, elapsed);
        audioEngine.setRoundIntensity(segment);
        if (isCombos || useMoveCalls) return;
        setPhase((p) => {
          if (p.phase !== "active" || p.activeSignal) return p;
          return { ...p, rhythmSegment: segment };
        });
      }, 400);

      tickRef.current = setInterval(() => {
        if (isPausedRef.current) return;
        setPhase((p) => {
          if (p.phase !== "active") return p;
          const next = p.timeRemaining - 1;
          if (next <= 0) {
            endRound(roundNumber);
            return { ...p, timeRemaining: 0 };
          }
          if (next <= 10 && next > 0) audioEngine.playRoundTick();
          return { ...p, timeRemaining: next };
        });
      }, 1000);

      if (sprintFinisherRef.current) {
        startSprintFinisherInterval();
      }
    },
    [endRound, isCombos, useMoveCalls, startSprintFinisherInterval]
  );

  const pauseTraining = useCallback(() => {
    if (isPausedRef.current) return;
    isPausedRef.current = true;
    setIsPaused(true);
    pauseStartedRef.current = Date.now();

    if (tickRef.current) clearInterval(tickRef.current);
    if (rhythmTickRef.current) clearInterval(rhythmTickRef.current);
    if (sprintFinisherIntervalRef.current) clearInterval(sprintFinisherIntervalRef.current);
    if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current);
    if (coachTimeoutRef.current) clearTimeout(coachTimeoutRef.current);
    tickRef.current = null;
    rhythmTickRef.current = null;
    sprintFinisherIntervalRef.current = null;
    cueTimeoutRef.current = null;
    coachTimeoutRef.current = null;
  }, []);

  const resumeTraining = useCallback(() => {
    if (!isPausedRef.current) return;
    roundStartRef.current += Date.now() - pauseStartedRef.current;
    isPausedRef.current = false;
    setIsPaused(false);

    scheduleNextCue();
    if (!useMoveCalls) {
      scheduleNextCoachCue();
    }
    startRoundIntervals(activeRoundRef.current);
  }, [scheduleNextCue, scheduleNextCoachCue, startRoundIntervals, useMoveCalls]);

  const startActiveRound = useCallback(
    (roundNumber: number) => {
      activeRoundRef.current = roundNumber;
      isPausedRef.current = false;
      setIsPaused(false);
      if (isCombos) {
        comboScheduleRef.current = generateComboSchedule({
          style: settings.style,
          mode: settings.mode,
          roundDuration: settings.rounds.roundLength,
          roundNumber,
          totalRounds: settings.rounds.rounds,
          rhythmArchetype: settings.rhythmArchetype,
          rhythmMode: settings.rhythmMode,
          cueStyle: settings.cueStyle,
          language: settings.language,
        });
        coachScheduleRef.current = generateComboPauseCoachSchedule(
          comboScheduleRef.current,
          settings.rounds.roundLength,
          settings.language,
          sessionCoachCues ?? undefined,
          lowActivityCoaching ?? undefined,
          fighterDisplayName ?? undefined
        );
      } else if (useMoveCalls) {
        moveScheduleRef.current = generateMoveCallSchedule({
          style: settings.style,
          mode: settings.mode,
          workoutMode: settings.workoutMode,
          roundDuration: settings.rounds.roundLength,
          cueStyle: settings.cueStyle,
          roundNumber,
          totalRounds: settings.rounds.rounds,
          rhythmArchetype: settings.rhythmArchetype,
          rhythmMode: settings.rhythmMode,
          rhythmBlueprint,
        });
        coachScheduleRef.current = [];
        scheduleRef.current = [];
      } else {
        scheduleRef.current = generateSignalSchedule({
          style: settings.style,
          mode: settings.mode,
          workoutMode: settings.workoutMode,
          roundDuration: settings.rounds.roundLength,
          cueStyle: settings.cueStyle,
          roundNumber,
          totalRounds: settings.rounds.rounds,
          rhythmArchetype: settings.rhythmArchetype,
          rhythmMode: settings.rhythmMode,
          rhythmBlueprint,
        });
        coachScheduleRef.current = generateSignalPauseCoachSchedule(
          scheduleRef.current,
          settings.rounds.roundLength,
          settings.language,
          sessionCoachCues ?? undefined,
          lowActivityCoaching ?? undefined,
          fighterDisplayName ?? undefined
        );
        moveScheduleRef.current = [];
      }

      roundEventsRef.current = [];
      roundMovesRef.current = [];
      roundCombosRef.current = [];
      cueIndexRef.current = 0;
      coachIndexRef.current = 0;
      roundStartRef.current = Date.now();

      setPhase({
        phase: "active",
        currentRound: roundNumber,
        timeRemaining: settings.rounds.roundLength,
        activeSignal: null,
        activeCombo: null,
        activeMoveCall: null,
      });

      scheduleNextCue();
      if (!useMoveCalls) {
        scheduleNextCoachCue();
      }

      void prefetchCoachLines(
        [
          ...coachScheduleRef.current.map((e) => e.text),
          ...moveScheduleRef.current.map((e) => e.speak),
        ],
        settings.language
      );

      startRoundIntervals(roundNumber);
    },
    [settings, scheduleNextCue, scheduleNextCoachCue, startRoundIntervals, isCombos, useMoveCalls, sessionCoachCues, lowActivityCoaching, rhythmBlueprint, fighterDisplayName]
  );

  const runPreRoundCountdown = useCallback(
    (roundNumber: number) => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      setCountdownValue(3);
      audioEngine.playCountdownStep(3);
      triggerCountdownHaptic();

      let step = 3;
      countdownIntervalRef.current = setInterval(() => {
        step -= 1;
        if (step === 2) {
          setCountdownValue(2);
          audioEngine.playCountdownStep(2);
          triggerCountdownHaptic();
        } else if (step === 1) {
          setCountdownValue(1);
          audioEngine.playCountdownStep(1);
          triggerCountdownHaptic();
        } else if (step === 0) {
          setCountdownValue(0);
          audioEngine.playGo();
          triggerGoHaptic();
        } else {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          audioEngine.playRoundStartBell();
          startActiveRound(roundNumber);
        }
      }, 1000);
    },
    [startActiveRound]
  );

  const activateSprintFinisher = useCallback(() => {
    if (sprintFinisherRef.current) return;
    sprintFinisherRef.current = true;

    const cue =
      SPRINT_FINISHER_CUES[Math.floor(Math.random() * SPRINT_FINISHER_CUES.length)];
    fireCoachCue(cue, { speak: true });

    setPhase((p) => {
      if (p.phase !== "active") return p;
      return { ...p, sprintFinisher: true };
    });

    startSprintFinisherInterval();
  }, [fireCoachCue, startSprintFinisherInterval]);

  const startCountdown = useCallback(async () => {
    sprintFinisherRef.current = false;
    voicedSignalsRef.current = new Set();
    sessionStartRef.current = Date.now();
    cancelCoachVoice();
    await audioEngine.unlock();
    await unlockCoachAudio();
    setVoiceLanguage(settings.language);
    audioEngine.setSettings(settings.audio);
    audioEngine.startAmbience();
    void initCoachVoice(settings.language);

    const signalLabels = CLEAR_SIGNALS.map((s) =>
      getSignalLabel(s, settings.language)
    );
    const idleLines = [
      ...(lowActivityCoaching ?? []),
      ...Object.values(TRAINER_IDLE_ACTIONS).flat(),
      ...ROUND_OPEN_CUES,
    ];
    void prefetchCoachLines(
      [
        ...signalLabels,
        ...(sessionCoachCues ?? []),
        ...idleLines,
      ],
      settings.language
    );

    setPhase({
      phase: "countdown",
      currentRound: 1,
      timeRemaining: 3,
      activeSignal: null,
      activeCombo: null,
    });
    runPreRoundCountdown(1);
  }, [
    settings.audio,
    settings.language,
    sessionCoachCues,
    lowActivityCoaching,
    runPreRoundCountdown,
  ]);

  const resumeFromRest = useCallback(() => {
    const round = phase.currentRound;
    setPhase({
      phase: "countdown",
      currentRound: round,
      timeRemaining: 3,
      activeSignal: null,
      activeCombo: null,
    });
    runPreRoundCountdown(round);
  }, [phase.currentRound, runPreRoundCountdown]);

  const stopTraining = useCallback(() => {
    clearTimers();
    cancelCoachVoice();
    audioEngine.stopAmbience();
    voicedSignalsRef.current = new Set();
    isPausedRef.current = false;
    setIsPaused(false);
  }, [clearTimers]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      cancelCoachVoice();
      audioEngine.stopAmbience();
    };
  }, [clearTimers]);

  return {
    phase,
    countdownValue,
    roundStats,
    isPaused,
    startCountdown,
    resumeFromRest,
    pauseTraining,
    resumeTraining,
    stopTraining,
    activateSprintFinisher,
    summaryMessage: buildSummaryMessage(
      settings.mode,
      challengeName,
      settings.mode !== "easy",
      settings.trainingCategory
    ),
  };
}
