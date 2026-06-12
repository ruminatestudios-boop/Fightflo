import type {
  CueStyle,
  DifficultyMode,
  FightStyle,
  RhythmArchetype,
  RhythmBlueprint,
  RhythmMode,
  RhythmSegment,
  SignalEvent,
  SignalType,
} from "./types";
import { CLEAR_SIGNALS } from "./types";
import {
  buildFightPatternScript,
  createSeededRandom,
  hashSeed,
} from "./fight-patterns";

// ─── Segment definitions ───────────────────────────────────────────────────

interface SegmentProfile {
  /** Base duration range for the segment (seconds) */
  duration: [number, number];
  /** Gap between signals inside segment */
  innerGap: [number, number];
  /** Signals emitted; 0 = pure silence / tension */
  signalCount: [number, number];
  /** Weighted signal types for this segment */
  signals: Partial<Record<SignalType, number>>;
}

const SEGMENT_PROFILES: Record<RhythmSegment, SegmentProfile> = {
  reading: {
    duration: [4, 7],
    innerGap: [0, 0],
    signalCount: [0, 0],
    signals: {},
  },
  probing: {
    duration: [8, 14],
    innerGap: [2.5, 4.5],
    signalCount: [2, 4],
    signals: { move: 2.2, attack: 1, defend: 0.6 },
  },
  pressure: {
    duration: [10, 18],
    innerGap: [0.9, 2.2],
    signalCount: [4, 7],
    signals: { attack: 2, pressure: 2.2, move: 0.5, defend: 0.8 },
  },
  explosive: {
    duration: [4, 9],
    innerGap: [0.25, 0.65],
    signalCount: [4, 9],
    signals: { attack: 2.5, pressure: 1.8, burnout: 1.2, defend: 0.7 },
  },
  counter: {
    duration: [5, 10],
    innerGap: [0.35, 0.75],
    signalCount: [2, 4],
    signals: { attack: 1.5, defend: 2.5, move: 0.8 },
  },
  defensive: {
    duration: [8, 14],
    innerGap: [1.2, 2.5],
    signalCount: [3, 6],
    signals: { defend: 2.5, move: 1.5, attack: 0.6 },
  },
  reset: {
    duration: [6, 12],
    innerGap: [2.5, 5],
    signalCount: [1, 3],
    signals: { move: 2, reset: 1.8, defend: 0.5 },
  },
  grind: {
    duration: [14, 24],
    innerGap: [0.8, 1.6],
    signalCount: [6, 12],
    signals: { pressure: 2.5, attack: 2, burnout: 1, defend: 0.4 },
  },
  feint: {
    duration: [3, 6],
    innerGap: [0.2, 0.5],
    signalCount: [2, 4],
    signals: { move: 1, attack: 2, defend: 1.2 },
  },
};

// ─── Archetype behavior ────────────────────────────────────────────────────

interface ArchetypeBehavior {
  segmentWeights: Record<RhythmSegment, number>;
  pauseBetweenSegments: [number, number];
  readingBias: number;
  burstBias: number;
  signalDuration: [number, number];
  fakeoutChance: number;
}

const ARCHETYPE_BEHAVIOR: Record<RhythmArchetype, ArchetypeBehavior> = {
  "muay-femur": {
    segmentWeights: {
      reading: 2.2,
      probing: 2,
      pressure: 1,
      explosive: 0.7,
      counter: 1.8,
      defensive: 1.4,
      reset: 1.6,
      grind: 0.4,
      feint: 0.6,
    },
    pauseBetweenSegments: [2, 5],
    readingBias: 1.4,
    burstBias: 0.75,
    signalDuration: [1.0, 1.5],
    fakeoutChance: 0.06,
  },
  "muay-mat": {
    segmentWeights: {
      reading: 0.5,
      probing: 0.8,
      pressure: 2.5,
      explosive: 2,
      counter: 0.6,
      defensive: 0.7,
      reset: 0.4,
      grind: 1.8,
      feint: 0.5,
    },
    pauseBetweenSegments: [0.8, 2.5],
    readingBias: 0.6,
    burstBias: 1.35,
    signalDuration: [0.85, 1.25],
    fakeoutChance: 0.08,
  },
  "muay-khao": {
    segmentWeights: {
      reading: 0.3,
      probing: 0.5,
      pressure: 2,
      explosive: 1.2,
      counter: 0.4,
      defensive: 0.5,
      reset: 0.2,
      grind: 2.8,
      feint: 0.3,
    },
    pauseBetweenSegments: [0.5, 1.5],
    readingBias: 0.45,
    burstBias: 1.1,
    signalDuration: [0.9, 1.3],
    fakeoutChance: 0.04,
  },
  "counter-fighter": {
    segmentWeights: {
      reading: 2.5,
      probing: 1.2,
      pressure: 0.8,
      explosive: 1.6,
      counter: 2.8,
      defensive: 1.5,
      reset: 1.2,
      grind: 0.3,
      feint: 1,
    },
    pauseBetweenSegments: [2.5, 6],
    readingBias: 1.8,
    burstBias: 1.2,
    signalDuration: [0.9, 1.35],
    fakeoutChance: 0.12,
  },
  "dutch-kickboxer": {
    segmentWeights: {
      reading: 0.6,
      probing: 1,
      pressure: 2.4,
      explosive: 2.2,
      counter: 0.7,
      defensive: 0.6,
      reset: 0.5,
      grind: 1.5,
      feint: 0.6,
    },
    pauseBetweenSegments: [1, 3],
    readingBias: 0.55,
    burstBias: 1.45,
    signalDuration: [0.75, 1.15],
    fakeoutChance: 0.07,
  },
  mma: {
    segmentWeights: {
      reading: 1.4,
      probing: 1,
      pressure: 1.2,
      explosive: 1.8,
      counter: 1.3,
      defensive: 1,
      reset: 1,
      grind: 0.9,
      feint: 2.2,
    },
    pauseBetweenSegments: [1.5, 5.5],
    readingBias: 1.1,
    burstBias: 1.25,
    signalDuration: [0.8, 1.2],
    fakeoutChance: 0.18,
  },
};

// ─── Rhythm mode modifiers ─────────────────────────────────────────────────

interface ModeModifiers {
  archetype?: RhythmArchetype;
  segmentBoost?: Partial<Record<RhythmSegment, number>>;
  intensityBoost?: number;
  roundRamp?: number;
  closingBoost?: number;
}

const RHYTHM_MODE_MODS: Record<RhythmMode, ModeModifiers> = {
  default: {},
  "five-round-war": {
    roundRamp: 0.12,
    closingBoost: 1.15,
  },
  "last-round-pressure": {
    intensityBoost: 0.2,
    closingBoost: 1.5,
    segmentBoost: { explosive: 1.8, grind: 1.6, pressure: 1.4 },
  },
  "stadium-pace": {
    intensityBoost: 0.35,
    segmentBoost: { explosive: 2, feint: 1.5, pressure: 1.5 },
    closingBoost: 1.35,
  },
  "counter-sniper": {
    archetype: "counter-fighter",
    segmentBoost: { reading: 1.8, counter: 2.5, explosive: 1.4 },
    intensityBoost: 0.1,
  },
  "pressure-nightmare": {
    archetype: "muay-mat",
    segmentBoost: { pressure: 2.2, grind: 2, explosive: 1.6, reading: 0.3 },
    intensityBoost: 0.3,
  },
  "technical-femur": {
    archetype: "muay-femur",
    segmentBoost: { reading: 1.6, probing: 1.8, counter: 1.5, reset: 1.4 },
  },
  "cardio-hell": {
    archetype: "muay-khao",
    segmentBoost: { grind: 2.5, pressure: 1.8, reset: 0.2, reading: 0.25 },
    intensityBoost: 0.25,
  },
};

export const STYLE_DEFAULT_ARCHETYPE: Record<FightStyle, RhythmArchetype> = {
  "muay-thai": "muay-femur",
  boxing: "counter-fighter",
  kickboxing: "dutch-kickboxer",
  mma: "mma",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Seeded RNG for a single schedule generation (fight-realistic, not chaotic). */
let scheduleRandom: () => number = Math.random;
let deterministicPacing = false;

function rand(min: number, max: number): number {
  if (deterministicPacing) return (min + max) / 2;
  return min + scheduleRandom() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pickWeighted<T extends string>(
  weights: Partial<Record<T, number>>
): T {
  const entries = Object.entries(weights).filter(([, w]) => (w as number) > 0) as [
    T,
    number,
  ][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = scheduleRandom() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[0][0];
}

function roundPhase(elapsed: number, duration: number): "opening" | "middle" | "closing" {
  const remaining = duration - elapsed;
  if (elapsed < Math.min(30, duration * 0.2)) return "opening";
  if (remaining < Math.min(30, duration * 0.2)) return "closing";
  return "middle";
}

function phaseIntensity(
  phase: "opening" | "middle" | "closing",
  roundNumber: number,
  totalRounds: number,
  mode: DifficultyMode,
  rhythmMode: RhythmMode
): number {
  const mods = RHYTHM_MODE_MODS[rhythmMode];
  let base =
    phase === "opening" ? 0.72 : phase === "middle" ? 1 : 1.28;

  if (mode === "easy") base *= 0.82;
  if (mode === "stadium") base *= 1.15;

  if (mods.roundRamp) {
    base += mods.roundRamp * (roundNumber - 1);
  }
  if (phase === "closing" && mods.closingBoost) {
    base *= mods.closingBoost;
  }
  if (mods.intensityBoost) {
    base += mods.intensityBoost;
  }

  // Championship rounds — final round surges
  if (roundNumber === totalRounds && totalRounds >= 3) {
    base *= 1.12;
  }

  return Math.max(0.5, Math.min(1.65, base));
}

function difficultyScale(mode: DifficultyMode, cueStyle: CueStyle): number {
  if (cueStyle === "clear") {
    return mode === "stadium" ? 0.95 : mode === "hard" ? 0.88 : 0.78;
  }
  return mode === "stadium" ? 1.2 : mode === "hard" ? 1 : 0.85;
}

function pickSegment(
  archetype: RhythmArchetype,
  rhythmMode: RhythmMode,
  lastSegment: RhythmSegment | null,
  intensity: number,
  momentum: number
): RhythmSegment {
  const behavior = ARCHETYPE_BEHAVIOR[archetype];
  const modeMods = RHYTHM_MODE_MODS[rhythmMode].segmentBoost ?? {};

  const weights: Record<RhythmSegment, number> = { ...behavior.segmentWeights };

  for (const seg of Object.keys(weights) as RhythmSegment[]) {
    weights[seg] *= modeMods[seg] ?? 1;
    // Momentum: after calm, favor explosive; after burst, favor reading
    if (seg === "reading" || seg === "reset") {
      weights[seg] *= 1 + momentum * 0.5;
    }
    if (seg === "explosive" || seg === "pressure" || seg === "grind") {
      weights[seg] *= 0.6 + intensity * 0.7;
    }
    if (seg === "counter" && intensity > 0.9) {
      weights[seg] *= 1.3;
    }
    // Avoid repeating same segment twice
    if (seg === lastSegment) weights[seg] *= 0.35;
  }

  return pickWeighted(weights);
}

function contextualSignal(
  segment: RhythmSegment,
  archetype: RhythmArchetype,
  cueStyle: CueStyle,
  lastSignal: SignalType | null,
  indexInSegment: number,
  totalInSegment: number
): SignalType {
  const pool =
    cueStyle === "clear" ? CLEAR_SIGNALS : (["attack", "defend", "move", "burnout", "pressure", "reset"] as SignalType[]);

  const profile = SEGMENT_PROFILES[segment];
  let weights = { ...profile.signals };

  // Clear mode remaps advanced-only signals
  if (cueStyle === "clear") {
    if (weights.burnout) {
      weights.attack = (weights.attack ?? 0) + weights.burnout;
      delete weights.burnout;
    }
    if (weights.pressure) {
      weights.attack = (weights.attack ?? 0) + weights.pressure * 0.7;
      delete weights.pressure;
    }
    if (weights.reset) {
      weights.move = (weights.move ?? 0) + (weights.reset ?? 0);
      delete weights.reset;
    }
  }

  // Contextual chains
  if (lastSignal === "move" && indexInSegment > 0) {
    weights.attack = (weights.attack ?? 0) + 1.2;
  }
  if (lastSignal === "attack") {
    weights.defend = (weights.defend ?? 0) + 1;
  }
  if (lastSignal === "defend" && indexInSegment < totalInSegment - 1) {
    weights.attack = (weights.attack ?? 0) + 0.8;
  }
  if (segment === "counter" && indexInSegment === 0) {
    weights = { attack: 2 };
  } else if (segment === "counter" && indexInSegment === 1) {
    weights = { defend: 3, attack: 0.5 };
  }

  // Archetype nudges
  if (archetype === "muay-mat" || archetype === "dutch-kickboxer") {
    weights.attack = (weights.attack ?? 0) + 0.5;
    weights.pressure = (weights.pressure ?? 0) + 0.4;
  }
  if (archetype === "muay-femur") {
    weights.move = (weights.move ?? 0) + 0.6;
  }

  const filtered: Partial<Record<SignalType, number>> = {};
  for (const s of pool) {
    if (weights[s]) filtered[s] = weights[s];
  }
  if (Object.keys(filtered).length === 0) {
    return pool[Math.floor(scheduleRandom() * pool.length)];
  }
  return pickWeighted(filtered);
}

function emitSegment(
  segment: RhythmSegment,
  startT: number,
  archetype: RhythmArchetype,
  cueStyle: CueStyle,
  mode: DifficultyMode,
  intensity: number,
  behavior: ArchetypeBehavior
): { events: SignalEvent[]; endT: number; momentumDelta: number } {
  const profile = SEGMENT_PROFILES[segment];
  const events: SignalEvent[] = [];
  let t = startT;

  const diffScale = difficultyScale(mode, cueStyle);
  const durScale = cueStyle === "clear" ? 1.15 : 1;

  if (segment === "reading") {
    const pause =
      rand(profile.duration[0], profile.duration[1]) *
      behavior.readingBias *
      (1.1 - intensity * 0.15);
    // Occasional footwork at end of read — feels like circling
    if (scheduleRandom() < 0.25 * intensity) {
      const d = rand(...behavior.signalDuration) * durScale;
      events.push({ type: "move", timestamp: t + pause - d - 0.3, duration: d });
    }
    return { events, endT: t + pause, momentumDelta: -0.35 };
  }

  if (segment === "counter") {
    const tension = rand(3, 6) * behavior.readingBias;
    t += tension;
    const count = randInt(2, 4);
    let last: SignalType | null = null;
    for (let i = 0; i < count; i++) {
      const type = contextualSignal(segment, archetype, cueStyle, last, i, count);
      const duration = rand(...behavior.signalDuration) * durScale * diffScale;
      events.push({ type, timestamp: t, duration, segment });
      t += duration + rand(...profile.innerGap);
      last = type;
    }
    return { events, endT: t, momentumDelta: 0.4 };
  }

  const count = randInt(
    Math.max(1, Math.floor(profile.signalCount[0] * intensity * behavior.burstBias)),
    Math.max(1, Math.ceil(profile.signalCount[1] * intensity * behavior.burstBias))
  );

  let last: SignalType | null = null;
  for (let i = 0; i < count; i++) {
    const type = contextualSignal(segment, archetype, cueStyle, last, i, count);
    const duration =
      rand(...behavior.signalDuration) *
      durScale *
      (segment === "explosive" ? 0.85 : 1) *
      diffScale;

    events.push({ type, timestamp: t, duration, segment });

    const gap =
      segment === "feint" && i === 0
        ? rand(1.8, 3.2)
        : rand(...profile.innerGap) / diffScale;

    t += duration + gap;
    last = type;

    // Feint: quick false start then real strike
    if (
      segment === "feint" &&
      i === 0 &&
      cueStyle === "advanced" &&
      scheduleRandom() < behavior.fakeoutChance
    ) {
      const fakeDur = rand(0.2, 0.35);
      events.push({
        type: last,
        timestamp: t - gap + 0.15,
        duration: fakeDur,
        segment,
      });
    }
  }

  const momentumDelta =
    segment === "explosive" || segment === "grind"
      ? 0.45
      : segment === "reset" || segment === "defensive"
        ? -0.25
        : 0.1;

  return { events, endT: t, momentumDelta };
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface RhythmEngineConfig {
  style: FightStyle;
  mode: DifficultyMode;
  cueStyle: CueStyle;
  roundDuration: number;
  roundNumber: number;
  totalRounds: number;
  rhythmArchetype: RhythmArchetype;
  rhythmMode: RhythmMode;
  rhythmBlueprint?: RhythmBlueprint | null;
}

export interface RhythmScheduleMeta {
  segments: { segment: RhythmSegment; startTime: number }[];
}

export function resolveRhythmArchetype(
  archetype: RhythmArchetype,
  rhythmMode: RhythmMode
): RhythmArchetype {
  return RHYTHM_MODE_MODS[rhythmMode].archetype ?? archetype;
}

export function generateRhythmSchedule(
  config: RhythmEngineConfig
): SignalEvent[] {
  const archetype = resolveRhythmArchetype(
    config.rhythmArchetype,
    config.rhythmMode
  );
  const behavior = ARCHETYPE_BEHAVIOR[archetype];
  const events: SignalEvent[] = [];

  const seed =
    config.rhythmBlueprint?.seed ??
    hashSeed(
      `${archetype}-${config.rhythmMode}-${config.roundNumber}-${config.style}`
    );
  scheduleRandom = createSeededRandom(seed);
  deterministicPacing = config.rhythmBlueprint?.fighterProfile ?? false;

  const segmentScript =
    config.rhythmBlueprint?.segmentScript ??
    buildFightPatternScript(
      archetype,
      config.rhythmMode,
      config.roundNumber,
      config.totalRounds
    );
  let scriptIndex = 0;

  // Opening tension — nothing happens immediately
  let t = rand(
    config.cueStyle === "clear" ? 3.5 : 2.5,
    config.cueStyle === "clear" ? 6 : 5
  );
  let momentum = 0;
  let lastSegment: RhythmSegment | null = null;
  const maxT = config.roundDuration - 2;

  while (t < maxT) {
    const phase = roundPhase(t, config.roundDuration);
    const intensity = phaseIntensity(
      phase,
      config.roundNumber,
      config.totalRounds,
      config.mode,
      config.rhythmMode
    );

    const segment: RhythmSegment =
      scriptIndex < segmentScript.length
        ? segmentScript[scriptIndex++]
        : pickSegment(
            archetype,
            config.rhythmMode,
            lastSegment,
            intensity,
            momentum
          );

    const { events: segEvents, endT, momentumDelta } = emitSegment(
      segment,
      t,
      archetype,
      config.cueStyle,
      config.mode,
      intensity,
      behavior
    );

    for (const e of segEvents) {
      if (e.timestamp < maxT) events.push(e);
    }

    t = endT;
    momentum = Math.max(-0.5, Math.min(1, momentum + momentumDelta));
    lastSegment = segment;

    // Breathing room between segments — critical for realism
    const betweenPause =
      rand(...behavior.pauseBetweenSegments) *
      (segment === "explosive" || segment === "grind" ? 1.3 : 1) *
      (1.15 - intensity * 0.2);

    t += betweenPause;
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

export function getActiveRhythmSegment(
  events: { timestamp: number; segment?: RhythmSegment }[],
  elapsed: number
): RhythmSegment | null {
  if (events.length === 0) return "reading";

  let active: RhythmSegment | null = null;
  for (const e of events) {
    if (e.timestamp <= elapsed) active = e.segment ?? null;
    else break;
  }

  // In gaps between signals — infer tension
  const next = events.find((e) => e.timestamp > elapsed);
  const prev = [...events].reverse().find((e) => e.timestamp <= elapsed);
  if (!next && !prev) return "reading";
  if (next && elapsed < next.timestamp - 2) return "reading";
  return active;
}

export const RHYTHM_SEGMENT_LABELS: Record<RhythmSegment, string> = {
  reading: "Reading distance",
  probing: "Probing",
  pressure: "Pressure building",
  explosive: "Exchange",
  counter: "Counter window",
  defensive: "Defensive shell",
  reset: "Resetting",
  grind: "Grinding pressure",
  feint: "Feint setup",
};
