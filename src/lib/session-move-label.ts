import { SIGNAL_ACTIONS, SIGNAL_CONFIG } from "./constants";
import { coachDisplayChunks } from "./coach-display";
import type { SignalType, TrainingPhase, WorkoutMode } from "./types";

export interface SessionMoveDisplay {
  label: string;
  sublabel?: string;
  pulseKey: string;
}

export function getSessionMoveDisplay(
  phase: TrainingPhase,
  workoutMode: WorkoutMode,
  clearMode: boolean
): SessionMoveDisplay | null {
  if (phase.phase !== "active") return null;

  if (phase.activeMoveCall) {
    return {
      label: phase.activeMoveCall.label,
      sublabel: phase.activeMoveCall.speak,
      pulseKey: `move-${phase.activeMoveCall.label}`,
    };
  }

  if (workoutMode === "combos" && phase.activeCombo) {
    const speak = coachDisplayChunks(phase.activeCombo.speak).primary;
    return {
      label: phase.activeCombo.label.replace(/-/g, " "),
      sublabel: speak,
      pulseKey: `combo-${phase.activeCombo.label}`,
    };
  }

  if (phase.activeSignal) {
    const config = SIGNAL_CONFIG[phase.activeSignal];
    const action = SIGNAL_ACTIONS[phase.activeSignal as SignalType];
    if (clearMode) {
      return {
        label: action.toUpperCase(),
        sublabel: config.label,
        pulseKey: `signal-${phase.activeSignal}`,
      };
    }
    return {
      label: config.label,
      sublabel: action,
      pulseKey: `signal-${phase.activeSignal}`,
    };
  }

  if (phase.coachCue) {
    const coach = coachDisplayChunks(phase.coachCue);
    return {
      label: coach.primary.toUpperCase(),
      sublabel: coach.secondary ?? undefined,
      pulseKey: `coach-${phase.coachCue}`,
    };
  }

  return null;
}
