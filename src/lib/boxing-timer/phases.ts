import type { TimerRoundPhase } from "./types";

const PHASE_LABELS: Record<TimerRoundPhase, string> = {
  "feel-out": "Feel out",
  work: "Work",
  championship: "Championship minute",
  "final-ten": "Final 10",
};

export function getTimerRoundPhase(
  elapsedInRound: number,
  roundDuration: number
): TimerRoundPhase {
  const remaining = roundDuration - elapsedInRound;
  if (remaining <= 10 && remaining > 0) return "final-ten";
  if (roundDuration >= 120 && remaining <= 60 && remaining > 10) {
    return "championship";
  }
  if (roundDuration < 120 && remaining <= 20 && remaining > 10) {
    return "championship";
  }
  const feelOutWindow = Math.min(30, Math.floor(roundDuration * 0.12));
  if (elapsedInRound < feelOutWindow) return "feel-out";
  return "work";
}

export function phaseLabel(phase: TimerRoundPhase): string {
  return PHASE_LABELS[phase];
}

export const REST_CORNER_CUES = [
  "Shake out the arms. Breathe through the nose.",
  "Hands on knees — slow the heart rate.",
  "Roll the shoulders. Stay loose.",
  "Quick sip of water if you need it.",
  "Visualise the next round. Hands up.",
  "Walk it off — don't sit yet.",
  "In through nose, out through mouth.",
  "Reset your stance. Lead foot ready.",
] as const;

export const ROUND_OPEN_CUES = [
  "Hands up. Find your range.",
  "Jab first. Establish the round.",
  "Move your head off the centre line.",
  "Feet under you. Stay balanced.",
  "Touch with the jab — don't load up yet.",
] as const;

export function pickRestCue(roundIndex: number): string {
  return REST_CORNER_CUES[roundIndex % REST_CORNER_CUES.length];
}

export function pickRoundOpenCue(round: number): string {
  return ROUND_OPEN_CUES[(round - 1) % ROUND_OPEN_CUES.length];
}
