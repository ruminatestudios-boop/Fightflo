"use client";

import { useMemo } from "react";
import type { CueStyle, TrainingPhase, WorkoutMode } from "@/lib/types";
import { getSessionMoveDisplay } from "@/lib/session-move-label";
import { SessionTimerUI } from "@/components/training/SessionTimerUI";

interface TrainingScreenProps {
  phase: TrainingPhase;
  countdownValue: number;
  totalRounds: number;
  roundLength: number;
  cueStyle: CueStyle;
  workoutMode: WorkoutMode;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onStop: () => void;
}

export function TrainingScreen({
  phase,
  countdownValue,
  totalRounds,
  roundLength,
  cueStyle,
  workoutMode,
  isPaused = false,
  onPause,
  onResume,
  onStop,
}: TrainingScreenProps) {
  const isCombos = workoutMode === "combos";
  const isClear = !isCombos && cueStyle === "clear";

  const move = useMemo(
    () => getSessionMoveDisplay(phase, workoutMode, isClear),
    [phase, workoutMode, isClear]
  );

  if (phase.phase === "countdown") {
    return (
      <SessionTimerUI
        mode="countdown"
        seconds={countdownValue}
        currentRound={phase.currentRound}
        totalRounds={totalRounds}
        onStop={onStop}
      />
    );
  }

  return (
    <SessionTimerUI
      mode="active"
      seconds={phase.timeRemaining}
      totalSeconds={roundLength}
      currentRound={phase.currentRound}
      totalRounds={totalRounds}
      move={move}
      isPaused={isPaused}
      urgent={phase.timeRemaining <= 10}
      onPause={onPause}
      onResume={onResume}
      onStop={onStop}
    />
  );
}
