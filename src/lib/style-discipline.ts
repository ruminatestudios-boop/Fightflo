import { RHYTHM_ARCHETYPES, STYLE_COMBOS } from "./constants";
import { STYLE_DEFAULT_ARCHETYPE } from "./fight-rhythm-engine";
import type { FightStyle, RhythmArchetype } from "./types";

/** Which martial art each rhythm archetype belongs to */
export const ARCHETYPE_STYLES: Record<RhythmArchetype, FightStyle> = {
  "muay-femur": "muay-thai",
  "muay-mat": "muay-thai",
  "muay-khao": "muay-thai",
  "counter-fighter": "boxing",
  "dutch-kickboxer": "kickboxing",
  mma: "mma",
};

/** Solo-react move vocabulary shown per discipline */
export const STYLE_TECHNIQUES: Record<FightStyle, string[]> = {
  boxing: [
    "Jab",
    "Cross",
    "Hook",
    "Uppercut",
    "Slip & roll",
    "Pivot footwork",
  ],
  "muay-thai": [
    "Teep",
    "Round kick",
    "Low kick",
    "Elbow",
    "Knee",
    "Clinch work",
  ],
  kickboxing: [
    "Jab-cross",
    "Low kick",
    "High kick",
    "Dutch combos",
    "Switch kick",
    "Body-head mix",
  ],
  mma: [
    "Jab-cross",
    "Level change",
    "Kick entries",
    "Knee",
    "Elbow",
    "Feint & shoot",
  ],
};

export function rhythmArchetypesForStyle(style: FightStyle) {
  return RHYTHM_ARCHETYPES.filter(
    (archetype) => ARCHETYPE_STYLES[archetype.id] === style
  );
}

export function isArchetypeForStyle(
  archetype: RhythmArchetype,
  style: FightStyle
): boolean {
  return ARCHETYPE_STYLES[archetype] === style;
}

/** Keep rhythm archetype aligned with the selected martial art */
export function ensureArchetypeForStyle(
  style: FightStyle,
  archetype: RhythmArchetype
): RhythmArchetype {
  if (isArchetypeForStyle(archetype, style)) return archetype;
  return STYLE_DEFAULT_ARCHETYPE[style];
}

export function combosForStyle(style: FightStyle) {
  return STYLE_COMBOS[style];
}

export function techniquesForStyle(style: FightStyle) {
  return STYLE_TECHNIQUES[style];
}
