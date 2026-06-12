import type { AppSettings, FightStyle } from "./types";
import { STYLE_DEFAULT_ARCHETYPE } from "./fight-rhythm-engine";

/** Smart defaults for the core shadowboxing loop */
export const CORE_LOOP_DEFAULTS = {
  mode: "hard" as const,
  workoutMode: "solo" as const,
  cueStyle: "clear" as const,
  trainingCategory: "fight" as const,
  rhythmMode: "default" as const,
  rounds: {
    rounds: 3,
    restTime: 60,
  },
};

export const CORE_ROUND_LENGTHS = [
  { seconds: 60, label: "1 min" },
  { seconds: 120, label: "2 min" },
  { seconds: 180, label: "3 min" },
] as const;

export function buildCoreLoopSettings(
  style: FightStyle,
  roundLengthSeconds: number
): Pick<AppSettings, "style" | "mode" | "workoutMode" | "cueStyle" | "trainingCategory" | "rhythmArchetype" | "rhythmMode" | "rounds"> {
  return {
    style,
    mode: CORE_LOOP_DEFAULTS.mode,
    workoutMode: CORE_LOOP_DEFAULTS.workoutMode,
    cueStyle: CORE_LOOP_DEFAULTS.cueStyle,
    trainingCategory: CORE_LOOP_DEFAULTS.trainingCategory,
    rhythmArchetype: STYLE_DEFAULT_ARCHETYPE[style],
    rhythmMode: CORE_LOOP_DEFAULTS.rhythmMode,
    rounds: {
      rounds: CORE_LOOP_DEFAULTS.rounds.rounds,
      roundLength: roundLengthSeconds,
      restTime: CORE_LOOP_DEFAULTS.rounds.restTime,
    },
  };
}
