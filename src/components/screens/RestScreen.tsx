"use client";

import { coachDisplayChunks } from "@/lib/coach-display";
import { SessionTimerUI } from "@/components/training/SessionTimerUI";

interface RestScreenProps {
  timeRemaining: number;
  restDuration: number;
  nextRound: number;
  totalRounds: number;
  cornerCue?: string | null;
  onSkip: () => void;
  onStop: () => void;
}

export function RestScreen({
  timeRemaining,
  restDuration,
  nextRound,
  totalRounds,
  cornerCue,
  onSkip,
  onStop,
}: RestScreenProps) {
  const corner = cornerCue ? coachDisplayChunks(cornerCue) : null;
  const restHint = corner
    ? corner.secondary
      ? `${corner.primary} — ${corner.secondary}`
      : corner.primary
    : "Slow your breathing. Recover.";

  return (
    <SessionTimerUI
      mode="rest"
      seconds={timeRemaining}
      totalSeconds={restDuration}
      currentRound={nextRound}
      totalRounds={totalRounds}
      restHint={restHint}
      onSkipRest={onSkip}
      onStop={onStop}
    />
  );
}
