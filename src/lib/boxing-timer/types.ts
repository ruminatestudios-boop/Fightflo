export type TimerCategory =
  | "boxing"
  | "muay-thai"
  | "hiit"
  | "conditioning";

export type TimerRoundPhase = "feel-out" | "work" | "championship" | "final-ten";

export interface TimerWorkoutPreset {
  id: string;
  name: string;
  tagline: string;
  category: TimerCategory;
  rounds: number;
  workSeconds: number;
  restSeconds: number;
  badge?: string;
}

export interface TimerConfig {
  presetId?: string;
  label: string;
  rounds: number;
  workSeconds: number;
  restSeconds: number;
  /** Call jab-cross combos during work — FightFlo-style reactivity */
  comboPulses: boolean;
  /** Corner lines on rest + phase changes */
  voiceCoaching: boolean;
}

export interface TimerSessionStats {
  presetId?: string;
  label: string;
  roundsCompleted: number;
  totalRounds: number;
  workSeconds: number;
  restSeconds: number;
  totalWorkSeconds: number;
  durationSeconds: number;
  comboPulses: boolean;
}

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  label: "Classic Boxing",
  rounds: 3,
  workSeconds: 180,
  restSeconds: 60,
  comboPulses: true,
  voiceCoaching: true,
};
