import type { DifficultyMode, FightStyle } from "./types";
import {
  getStyleLibrary,
  type LibraryCombo,
  type LibraryMove,
  type MoveTier,
} from "./move-library";

/** Output consumed by the session timer */
export interface MoveSignal {
  move: string;
  delay: number;
  style: FightStyle;
  speak: string;
  id: string;
  isCombo: boolean;
}

export interface MoveSignalContext {
  style: FightStyle;
  difficulty: DifficultyMode;
  /** Id of the last called move/combo — prevents back-to-back repeats */
  previousMoveId: string | null;
  /** Injectable RNG in [0, 1) for deterministic tests */
  random?: () => number;
}

export interface MoveScheduleItem extends MoveSignal {
  /** Seconds from round start when this move fires */
  timestamp: number;
  /** Seconds to display the callout */
  duration: number;
}

const TIER_ORDER: MoveTier[] = ["beginner", "intermediate", "advanced"];

function rng(ctx: MoveSignalContext): number {
  return ctx.random?.() ?? Math.random();
}

function tierWeight(tier: MoveTier, difficulty: DifficultyMode): number {
  const idx = TIER_ORDER.indexOf(tier);
  if (difficulty === "easy") {
    return idx === 0 ? 3 : idx === 1 ? 0.6 : 0.1;
  }
  if (difficulty === "hard") {
    return idx === 0 ? 1.5 : idx === 1 ? 2.5 : 0.8;
  }
  return idx === 0 ? 0.8 : idx === 1 ? 2 : 3;
}

function comboChance(difficulty: DifficultyMode): number {
  if (difficulty === "easy") return 0.18;
  if (difficulty === "hard") return 0.28;
  return 0.38;
}

function reactionDelayMs(difficulty: DifficultyMode, random: number): number {
  if (difficulty === "easy") {
    return Math.round(2500 + random * 2000);
  }
  if (difficulty === "hard") {
    return Math.round(1800 + random * 1400);
  }
  return Math.round(1200 + random * 1200);
}

function displayDurationMs(move: string, isCombo: boolean): number {
  const words = move.split(/\s+/).length;
  const base = isCombo ? 2200 : 1600;
  return base + words * 280;
}

function weightedPick<T extends { id: string; weight?: number }>(
  items: T[],
  difficulty: DifficultyMode,
  tierOf: (item: T) => MoveTier,
  random: number
): T | null {
  if (items.length === 0) return null;

  const weights = items.map((item) => {
    const w = item.weight ?? 1;
    return w * tierWeight(tierOf(item), difficulty);
  });
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return items[0];

  let roll = random * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function toSignal(
  entry: LibraryMove | LibraryCombo,
  style: FightStyle,
  delay: number,
  isCombo: boolean
): MoveSignal {
  return {
    move: entry.label,
    delay,
    style,
    speak: entry.speak,
    id: entry.id,
    isCombo,
  };
}

/**
 * Pure next-signal function.
 * Pass `previousMoveId` from the last returned signal to avoid repeats.
 */
export function getNextMoveSignal(ctx: MoveSignalContext): MoveSignal {
  const lib = getStyleLibrary(ctx.style);
  const rand = rng(ctx);
  const delay = reactionDelayMs(ctx.difficulty, rng(ctx));

  const singles = lib.singles.filter((m) => m.id !== ctx.previousMoveId);
  const combos = lib.combos.filter((c) => c.id !== ctx.previousMoveId);

  const useCombo =
    combos.length > 0 && singles.length > 0 && rand < comboChance(ctx.difficulty);

  if (useCombo || singles.length === 0) {
    const pick =
      weightedPick(combos, ctx.difficulty, (c) => c.tier, rng(ctx)) ??
      combos[0];
    if (pick) return toSignal(pick, ctx.style, delay, true);
  }

  const pick =
    weightedPick(singles, ctx.difficulty, (m) => m.tier, rng(ctx)) ??
    singles[0] ??
    lib.singles.find((m) => m.id !== ctx.previousMoveId) ??
    lib.singles[0];

  return toSignal(pick, ctx.style, delay, false);
}

export interface BuildMoveScheduleConfig {
  style: FightStyle;
  difficulty: DifficultyMode;
  roundDurationSec: number;
  /** Optional seed for reproducible rounds */
  seed?: number;
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Builds a full round schedule for the timer.
 * Uses reaction-mode random gaps between move calls.
 */
export function buildMoveSchedule(config: BuildMoveScheduleConfig): MoveScheduleItem[] {
  const { style, difficulty, roundDurationSec } = config;
  const random = config.seed != null ? seededRandom(config.seed) : Math.random;

  const schedule: MoveScheduleItem[] = [];
  let previousMoveId: string | null = null;
  let elapsedMs = 800;

  const maxMs = roundDurationSec * 1000;

  while (elapsedMs < maxMs - 1200) {
    const signal = getNextMoveSignal({
      style,
      difficulty,
      previousMoveId,
      random,
    });

    elapsedMs += signal.delay;
    if (elapsedMs >= maxMs) break;

    const durationSec = displayDurationMs(signal.move, signal.isCombo) / 1000;

    schedule.push({
      ...signal,
      timestamp: elapsedMs / 1000,
      duration: durationSec,
    });

    previousMoveId = signal.id;
    elapsedMs += signal.delay * 0.15;
  }

  return schedule;
}
