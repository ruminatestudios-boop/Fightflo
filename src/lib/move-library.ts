import type { FightStyle } from "./types";

export type MoveTier = "beginner" | "intermediate" | "advanced";

export interface LibraryMove {
  id: string;
  label: string;
  speak: string;
  tier: MoveTier;
  weight?: number;
}

export interface LibraryCombo {
  id: string;
  label: string;
  speak: string;
  tier: MoveTier;
  /** Ordered single-move ids this combo chains from */
  chain: string[];
  weight?: number;
}

export interface StyleMoveLibrary {
  singles: LibraryMove[];
  combos: LibraryCombo[];
}

const boxingSingles: LibraryMove[] = [
  { id: "jab", label: "JAB", speak: "Jab", tier: "beginner", weight: 2 },
  { id: "cross", label: "CROSS", speak: "Cross", tier: "beginner", weight: 2 },
  { id: "hook", label: "HOOK", speak: "Hook", tier: "beginner", weight: 1.5 },
  { id: "uppercut", label: "UPPERCUT", speak: "Uppercut", tier: "intermediate", weight: 1.2 },
  { id: "slip", label: "SLIP", speak: "Slip", tier: "beginner", weight: 1 },
  { id: "roll", label: "ROLL", speak: "Roll", tier: "intermediate", weight: 0.9 },
  { id: "pivot", label: "PIVOT", speak: "Pivot out", tier: "beginner", weight: 1 },
  { id: "block", label: "BLOCK", speak: "Block", tier: "beginner", weight: 1 },
  { id: "body-shot", label: "BODY SHOT", speak: "Body shot", tier: "intermediate", weight: 1 },
  { id: "counter-cross", label: "COUNTER CROSS", speak: "Counter cross", tier: "advanced", weight: 0.8 },
  { id: "pull-counter", label: "PULL COUNTER", speak: "Pull counter", tier: "advanced", weight: 0.7 },
];

const boxingCombos: LibraryCombo[] = [
  { id: "one-two", label: "JAB CROSS", speak: "Jab, cross", tier: "beginner", chain: ["jab", "cross"], weight: 2.5 },
  { id: "one-two-three", label: "JAB CROSS HOOK", speak: "Jab, cross, hook", tier: "intermediate", chain: ["jab", "cross", "hook"], weight: 2 },
  { id: "two-three-two", label: "CROSS HOOK CROSS", speak: "Cross, hook, cross", tier: "intermediate", chain: ["cross", "hook", "cross"], weight: 1.5 },
  { id: "double-jab-cross", label: "DOUBLE JAB CROSS", speak: "Double jab, cross", tier: "beginner", chain: ["jab", "jab", "cross"], weight: 1.5 },
  { id: "hook-cross-hook", label: "HOOK CROSS HOOK", speak: "Hook, cross, hook", tier: "advanced", chain: ["hook", "cross", "hook"], weight: 1 },
  { id: "body-head", label: "BODY HEAD", speak: "Body shot, head shot", tier: "intermediate", chain: ["body-shot", "hook"], weight: 1.2 },
];

const muayThaiSingles: LibraryMove[] = [
  { id: "jab", label: "JAB", speak: "Jab", tier: "beginner", weight: 1.5 },
  { id: "teep", label: "TEEP", speak: "Teep", tier: "beginner", weight: 2 },
  { id: "low-kick", label: "LOW KICK", speak: "Low kick", tier: "beginner", weight: 2 },
  { id: "round-kick", label: "ROUND KICK", speak: "Round kick", tier: "beginner", weight: 1.8 },
  { id: "elbow", label: "ELBOW", speak: "Elbow", tier: "intermediate", weight: 1.2 },
  { id: "knee", label: "KNEE", speak: "Knee", tier: "intermediate", weight: 1.2 },
  { id: "check", label: "CHECK", speak: "Check", tier: "beginner", weight: 1 },
  { id: "clinch", label: "CLINCH", speak: "Clinch", tier: "intermediate", weight: 0.9 },
  { id: "switch-kick", label: "SWITCH KICK", speak: "Switch kick", tier: "intermediate", weight: 1 },
  { id: "counter-elbow", label: "COUNTER ELBOW", speak: "Counter elbow", tier: "advanced", weight: 0.7 },
  { id: "spin-elbow", label: "SPIN ELBOW", speak: "Spin elbow", tier: "advanced", weight: 0.6 },
];

const muayThaiCombos: LibraryCombo[] = [
  { id: "jab-teep", label: "JAB TEEP", speak: "Jab, teep", tier: "beginner", chain: ["jab", "teep"], weight: 2.5 },
  { id: "one-two-kick", label: "JAB CROSS KICK", speak: "Jab, cross, kick", tier: "intermediate", chain: ["jab", "cross", "round-kick"], weight: 2 },
  { id: "teep-low-kick", label: "TEEP LOW KICK", speak: "Teep, low kick", tier: "beginner", chain: ["teep", "low-kick"], weight: 2 },
  { id: "elbow-knee", label: "ELBOW KNEE", speak: "Elbow, knee", tier: "intermediate", chain: ["elbow", "knee"], weight: 1.5 },
  { id: "clinch-knee", label: "CLINCH KNEE", speak: "Clinch, knee", tier: "intermediate", chain: ["clinch", "knee"], weight: 1.3 },
  { id: "fake-kick-cross", label: "FAKE KICK CROSS", speak: "Fake kick, cross", tier: "advanced", chain: ["round-kick", "cross"], weight: 1 },
];

const kickboxingSingles: LibraryMove[] = [
  { id: "jab", label: "JAB", speak: "Jab", tier: "beginner", weight: 1.5 },
  { id: "cross", label: "CROSS", speak: "Cross", tier: "beginner", weight: 1.5 },
  { id: "hook", label: "HOOK", speak: "Hook", tier: "beginner", weight: 1.5 },
  { id: "low-kick", label: "LOW KICK", speak: "Low kick", tier: "beginner", weight: 2 },
  { id: "high-kick", label: "HIGH KICK", speak: "High kick", tier: "intermediate", weight: 1.2 },
  { id: "switch-kick", label: "SWITCH KICK", speak: "Switch kick", tier: "intermediate", weight: 1.2 },
  { id: "body-kick", label: "BODY KICK", speak: "Body kick", tier: "intermediate", weight: 1 },
  { id: "slip", label: "SLIP", speak: "Slip", tier: "beginner", weight: 1 },
  { id: "dutch-shell", label: "SHELL UP", speak: "Shell up", tier: "beginner", weight: 0.9 },
  { id: "counter-hook", label: "COUNTER HOOK", speak: "Counter hook", tier: "advanced", weight: 0.8 },
];

const kickboxingCombos: LibraryCombo[] = [
  { id: "dutch-basic", label: "JAB CROSS LOW KICK", speak: "Jab, cross, low kick", tier: "beginner", chain: ["jab", "cross", "low-kick"], weight: 2.5 },
  { id: "one-two-high", label: "JAB CROSS HIGH KICK", speak: "Jab, cross, high kick", tier: "intermediate", chain: ["jab", "cross", "high-kick"], weight: 2 },
  { id: "hook-low", label: "HOOK LOW KICK", speak: "Hook, low kick", tier: "intermediate", chain: ["hook", "low-kick"], weight: 1.5 },
  { id: "switch-two", label: "SWITCH KICK CROSS", speak: "Switch kick, cross", tier: "advanced", chain: ["switch-kick", "cross"], weight: 1 },
  { id: "body-head-kick", label: "BODY HEAD KICK", speak: "Body kick, head kick", tier: "advanced", chain: ["body-kick", "high-kick"], weight: 1 },
];

const mmaSingles: LibraryMove[] = [
  { id: "jab", label: "JAB", speak: "Jab", tier: "beginner", weight: 1.5 },
  { id: "cross", label: "CROSS", speak: "Cross", tier: "beginner", weight: 1.5 },
  { id: "low-kick", label: "LOW KICK", speak: "Low kick", tier: "beginner", weight: 1.5 },
  { id: "level-change", label: "LEVEL CHANGE", speak: "Level change", tier: "intermediate", weight: 1.2 },
  { id: "sprawl", label: "SPRAWL", speak: "Sprawl", tier: "intermediate", weight: 1.2 },
  { id: "knee", label: "KNEE", speak: "Knee", tier: "intermediate", weight: 1 },
  { id: "elbow", label: "ELBOW", speak: "Elbow", tier: "intermediate", weight: 1 },
  { id: "clinch", label: "CLINCH", speak: "Clinch", tier: "beginner", weight: 1 },
  { id: "feint", label: "FEINT", speak: "Feint", tier: "beginner", weight: 1 },
  { id: "spin-back", label: "SPIN BACK", speak: "Spin back", tier: "advanced", weight: 0.7 },
  { id: "counter-upper", label: "COUNTER UPPER", speak: "Counter uppercut", tier: "advanced", weight: 0.7 },
];

const mmaCombos: LibraryCombo[] = [
  { id: "jab-cross-kick", label: "JAB CROSS KICK", speak: "Jab, cross, kick", tier: "beginner", chain: ["jab", "cross", "low-kick"], weight: 2.5 },
  { id: "feint-two", label: "FEINT CROSS", speak: "Feint, cross", tier: "intermediate", chain: ["feint", "cross"], weight: 2 },
  { id: "level-knee", label: "LEVEL KNEE", speak: "Level change, knee", tier: "intermediate", chain: ["level-change", "knee"], weight: 1.5 },
  { id: "sprawl-cross", label: "SPRAWL CROSS", speak: "Sprawl, cross", tier: "advanced", chain: ["sprawl", "cross"], weight: 1.2 },
  { id: "clinch-elbow", label: "CLINCH ELBOW", speak: "Clinch, elbow", tier: "intermediate", chain: ["clinch", "elbow"], weight: 1.3 },
];

export const MOVE_LIBRARY: Record<FightStyle, StyleMoveLibrary> = {
  boxing: { singles: boxingSingles, combos: boxingCombos },
  "muay-thai": { singles: muayThaiSingles, combos: muayThaiCombos },
  kickboxing: { singles: kickboxingSingles, combos: kickboxingCombos },
  mma: { singles: mmaSingles, combos: mmaCombos },
};

export function getStyleLibrary(style: FightStyle): StyleMoveLibrary {
  return MOVE_LIBRARY[style];
}
