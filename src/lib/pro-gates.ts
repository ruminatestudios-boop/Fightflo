import { STYLE_DEFAULT_ARCHETYPE } from "./fight-rhythm-engine";
import { ensureArchetypeForStyle } from "./style-discipline";
import type {
  ChallengePreset,
  CueStyle,
  DifficultyMode,
  FightStyle,
  RhythmArchetype,
  RhythmMode,
} from "./types";

const PRO_RHYTHM_MODES: RhythmMode[] = [
  "stadium-pace",
  "pressure-nightmare",
  "last-round-pressure",
  "cardio-hell",
];

/** One free rhythm archetype per martial art */
export const FREE_RHYTHM_ARCHETYPES: RhythmArchetype[] = [
  "muay-femur",
  "counter-fighter",
  "dutch-kickboxer",
  "mma",
];

const PRO_ONLY_RHYTHM_ARCHETYPES: RhythmArchetype[] = ["muay-mat", "muay-khao"];

export const FREE_OPPONENT_SESSIONS = 2;

export function isRhythmArchetypePro(archetype: RhythmArchetype): boolean {
  return PRO_ONLY_RHYTHM_ARCHETYPES.includes(archetype);
}

export function freeArchetypeForStyle(style: FightStyle): RhythmArchetype {
  const preferred = STYLE_DEFAULT_ARCHETYPE[style];
  if (!isRhythmArchetypePro(preferred)) return preferred;
  return ensureArchetypeForStyle(style, preferred);
}

export function isCueStylePro(cueStyle: CueStyle): boolean {
  return cueStyle === "advanced";
}

export function isModePro(mode: DifficultyMode): boolean {
  return mode === "stadium";
}

export function isAmbiencePro(): boolean {
  return true;
}

export function isChallengePro(challenge: ChallengePreset): boolean {
  if (challenge.mode === "stadium") return true;
  if (challenge.rhythmMode && PRO_RHYTHM_MODES.includes(challenge.rhythmMode)) {
    return true;
  }
  return false;
}

export function isOpponentTrainingPro(uses: number): boolean {
  return uses >= FREE_OPPONENT_SESSIONS;
}
