import type { AppSettings, DifficultyMode, TrainingCategory } from "./types";

export interface WorkoutCategoryConfig {
  id: TrainingCategory;
  label: string;
  subtitle: string;
  /** Short tag for timer / summary */
  tag: string;
}

export const WORKOUT_CATEGORIES: WorkoutCategoryConfig[] = [
  {
    id: "fight",
    label: "Fight training",
    subtitle: "Shadowboxing · combos · fight rhythm",
    tag: "Fight",
  },
  {
    id: "conditioning",
    label: "Conditioning",
    subtitle: "Cardio · circuits · sustained pressure",
    tag: "Conditioning",
  },
  {
    id: "hiit",
    label: "HIIT",
    subtitle: "Work / rest intervals · max effort bursts",
    tag: "HIIT",
  },
  {
    id: "sprint",
    label: "Sprint session",
    subtitle: "Explosive rounds · burnout finishers",
    tag: "Sprint",
  },
  {
    id: "breathwork",
    label: "Breathwork recovery",
    subtitle: "Guided breathing · calm down · reset",
    tag: "Recovery",
  },
];

export type SessionIntensity = "easy" | "standard" | "intense";

export const SESSION_DURATIONS = [
  { id: "quick", label: "5 min", rounds: 1, roundLength: 300, restTime: 30 },
  { id: "standard", label: "10 min", rounds: 2, roundLength: 180, restTime: 45 },
  { id: "long", label: "15 min", rounds: 3, roundLength: 180, restTime: 45 },
] as const;

export type SessionDurationId = (typeof SESSION_DURATIONS)[number]["id"];

export function applyCategoryPreset(
  category: TrainingCategory,
  intensity: SessionIntensity,
  durationId: SessionDurationId,
  base: AppSettings
): AppSettings {
  const duration = SESSION_DURATIONS.find((d) => d.id === durationId) ?? SESSION_DURATIONS[1];
  const mode: DifficultyMode =
    intensity === "easy" ? "easy" : intensity === "intense" ? "stadium" : "hard";

  const rounds = { ...duration, rounds: duration.rounds };

  switch (category) {
    case "fight":
      return { ...base, mode, rounds, trainingCategory: "fight" };
    case "conditioning":
      return {
        ...base,
        mode: intensity === "easy" ? "easy" : "hard",
        workoutMode: "solo",
        cueStyle: "clear",
        rhythmArchetype: "muay-mat",
        rhythmMode: "cardio-hell",
        rounds,
        trainingCategory: "conditioning",
      };
    case "hiit":
      return {
        ...base,
        mode: "hard",
        workoutMode: "solo",
        cueStyle: "clear",
        rhythmArchetype: "dutch-kickboxer",
        rhythmMode: "pressure-nightmare",
        rounds: {
          rounds: intensity === "intense" ? 10 : 8,
          roundLength: intensity === "easy" ? 30 : 45,
          restTime: intensity === "easy" ? 30 : 15,
        },
        trainingCategory: "hiit",
      };
    case "sprint":
      return {
        ...base,
        mode: "stadium",
        workoutMode: "solo",
        cueStyle: "advanced",
        rhythmArchetype: "muay-khao",
        rhythmMode: "last-round-pressure",
        rounds: {
          rounds: 1,
          roundLength: intensity === "intense" ? 300 : 180,
          restTime: 30,
        },
        trainingCategory: "sprint",
      };
    case "breathwork":
      return {
        ...base,
        mode: "easy",
        rounds: { rounds: 1, roundLength: 180, restTime: 0 },
        trainingCategory: "breathwork",
      };
    default:
      return { ...base, trainingCategory: category };
  }
}

export function categoryLabel(category: TrainingCategory): string {
  return WORKOUT_CATEGORIES.find((c) => c.id === category)?.label ?? "Training";
}
