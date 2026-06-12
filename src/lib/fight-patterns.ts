import type { RhythmArchetype, RhythmMode, RhythmSegment } from "./types";

/**
 * Round segment scripts modeled on common fight pacing (feel-out → pressure →
 * exchange → reset → late surge). Used instead of pure random segment picks.
 */
export const ARCHETYPE_ROUND_SCRIPTS: Record<RhythmArchetype, RhythmSegment[]> = {
  "muay-femur": [
    "reading",
    "reading",
    "probing",
    "feint",
    "counter",
    "reading",
    "probing",
    "defensive",
    "counter",
    "explosive",
    "reset",
    "reading",
  ],
  "muay-mat": [
    "reading",
    "pressure",
    "pressure",
    "explosive",
    "grind",
    "pressure",
    "explosive",
    "grind",
    "pressure",
    "explosive",
  ],
  "muay-khao": [
    "probing",
    "pressure",
    "grind",
    "pressure",
    "grind",
    "explosive",
    "grind",
    "pressure",
    "grind",
    "explosive",
  ],
  "counter-fighter": [
    "reading",
    "reading",
    "probing",
    "feint",
    "counter",
    "reading",
    "defensive",
    "counter",
    "explosive",
    "reset",
    "counter",
  ],
  "dutch-kickboxer": [
    "probing",
    "pressure",
    "explosive",
    "pressure",
    "grind",
    "explosive",
    "pressure",
    "explosive",
    "reset",
    "pressure",
  ],
  mma: [
    "reading",
    "probing",
    "feint",
    "pressure",
    "explosive",
    "reset",
    "reading",
    "counter",
    "explosive",
    "defensive",
    "pressure",
  ],
};

const MODE_SCRIPT_TWEAKS: Partial<
  Record<RhythmMode, (script: RhythmSegment[]) => RhythmSegment[]>
> = {
  "pressure-nightmare": (s) =>
    s.flatMap((seg) =>
      seg === "reading" || seg === "reset" ? ["pressure", seg] : [seg]
    ),
  "counter-sniper": (s) =>
    s.map((seg) =>
      seg === "pressure" || seg === "grind" ? "counter" : seg
    ),
  "stadium-pace": (s) => [...s, "explosive", "grind"],
  "last-round-pressure": (s) => [...s.slice(0, -1), "grind", "explosive", "explosive"],
  "technical-femur": (s) =>
    s.map((seg) => (seg === "grind" ? "probing" : seg)),
  "cardio-hell": (s) =>
    s.flatMap((seg) => (seg === "reset" ? ["grind"] : [seg])),
};

/** Late-round surge — championship minute pattern */
function applyRoundArc(
  script: RhythmSegment[],
  roundNumber: number,
  totalRounds: number
): RhythmSegment[] {
  if (roundNumber < totalRounds) return script;
  return [...script.slice(0, -2), "pressure", "explosive", "grind", "explosive"];
}

export function buildFightPatternScript(
  archetype: RhythmArchetype,
  rhythmMode: RhythmMode,
  roundNumber: number,
  totalRounds: number
): RhythmSegment[] {
  let script = [...ARCHETYPE_ROUND_SCRIPTS[archetype]];
  const tweak = MODE_SCRIPT_TWEAKS[rhythmMode];
  if (tweak) script = tweak(script);
  return applyRoundArc(script, roundNumber, totalRounds);
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
