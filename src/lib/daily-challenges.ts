import type { ChallengePreset } from "./types";
import { CHALLENGES } from "./constants";

export interface DailyChallenge {
  id: string;
  name: string;
  tagline: string;
  preset: ChallengePreset;
  dayKey: string;
}

const ROTATING: Omit<DailyChallenge, "dayKey">[] = [
  {
    id: "daily-stadium-sprint",
    name: "5 Min Stadium Sprint",
    tagline: "Today's finisher — survive the burst",
    preset: {
      id: "daily-stadium-sprint",
      name: "Stadium Sprint",
      tagline: "5 minutes of chaos",
      style: "muay-thai",
      mode: "stadium",
      rhythmArchetype: "muay-mat",
      rhythmMode: "stadium-pace",
      rounds: { rounds: 1, roundLength: 300, restTime: 0 },
    },
  },
  {
    id: "daily-femur-flow",
    name: "Muay Femur Flow",
    tagline: "Technical rhythm · patient counters",
    preset: {
      id: "daily-femur-flow",
      name: "Femur Flow",
      tagline: "Read · feint · counter",
      style: "muay-thai",
      mode: "easy",
      rhythmArchetype: "muay-femur",
      rhythmMode: "technical-femur",
      rounds: { rounds: 2, roundLength: 180, restTime: 45 },
    },
  },
  {
    id: "daily-pressure-hell",
    name: "Pressure Hell",
    tagline: "Walk-down pace — no breathing room",
    preset: CHALLENGES.find((c) => c.id === "pressure-fighter")!,
  },
  {
    id: "daily-cardio-survival",
    name: "Cardio Survival",
    tagline: "Grind pace · stay moving",
    preset: CHALLENGES.find((c) => c.id === "cardio-hell")!,
  },
  {
    id: "daily-last-round",
    name: "Last Round Burnout",
    tagline: "Everything left in the tank",
    preset: CHALLENGES.find((c) => c.id === "last-round-hell")!,
  },
  {
    id: "daily-counter-sniper",
    name: "Counter Sniper",
    tagline: "React or get caught",
    preset: CHALLENGES.find((c) => c.id === "counter-sniper")!,
  },
  {
    id: "daily-five-round",
    name: "Five Round War",
    tagline: "Championship distance",
    preset: CHALLENGES.find((c) => c.id === "five-round-war")!,
  },
];

function dayIndex(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const day = Math.floor(diff / 86400000);
  return day;
}

export function getDailyChallenge(date = new Date()): DailyChallenge {
  const idx = dayIndex(date) % ROTATING.length;
  const pick = ROTATING[idx];
  const dayKey = date.toISOString().slice(0, 10);
  return { ...pick, dayKey };
}
