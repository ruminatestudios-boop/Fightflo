import type { TimerWorkoutPreset } from "./types";

export const TIMER_PRESETS: TimerWorkoutPreset[] = [
  {
    id: "classic-boxing",
    name: "Classic Boxing",
    tagline: "3 × 3 min — amateur standard",
    category: "boxing",
    rounds: 3,
    workSeconds: 180,
    restSeconds: 60,
    badge: "Popular",
  },
  {
    id: "pro-championship",
    name: "Championship",
    tagline: "12 × 3 min — pro distance",
    category: "boxing",
    rounds: 12,
    workSeconds: 180,
    restSeconds: 60,
  },
  {
    id: "amateur-bout",
    name: "Amateur Bout",
    tagline: "3 × 2 min — short & sharp",
    category: "boxing",
    rounds: 3,
    workSeconds: 120,
    restSeconds: 60,
  },
  {
    id: "speed-rounds",
    name: "Speed Rounds",
    tagline: "8 × 1 min — hand speed",
    category: "boxing",
    rounds: 8,
    workSeconds: 60,
    restSeconds: 30,
    badge: "Fast",
  },
  {
    id: "muay-thai",
    name: "Muay Thai",
    tagline: "5 × 3 min — stadium rounds",
    category: "muay-thai",
    rounds: 5,
    workSeconds: 180,
    restSeconds: 120,
  },
  {
    id: "bag-hiit",
    name: "Bag HIIT",
    tagline: "10 × 45s on / 15s off",
    category: "hiit",
    rounds: 10,
    workSeconds: 45,
    restSeconds: 15,
    badge: "Burn",
  },
  {
    id: "fight-camp",
    name: "Fight Camp",
    tagline: "6 rounds — builds to a hard finish",
    category: "conditioning",
    rounds: 6,
    workSeconds: 180,
    restSeconds: 45,
  },
  {
    id: "title-fight",
    name: "Title Fight",
    tagline: "5 × 5 min — championship pace",
    category: "conditioning",
    rounds: 5,
    workSeconds: 300,
    restSeconds: 60,
  },
];

export function presetById(id: string): TimerWorkoutPreset | undefined {
  return TIMER_PRESETS.find((p) => p.id === id);
}

export function configFromPreset(preset: TimerWorkoutPreset) {
  return {
    presetId: preset.id,
    label: preset.name,
    rounds: preset.rounds,
    workSeconds: preset.workSeconds,
    restSeconds: preset.restSeconds,
    comboPulses: true,
    voiceCoaching: true,
  };
}
