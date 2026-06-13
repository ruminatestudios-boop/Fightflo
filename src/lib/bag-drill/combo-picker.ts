import {
  BAG_COMBOS,
  championMidSetSwapChance,
  defensiveCallChance,
  SPEED_COMBOS,
} from "./combos";
import { expectedHits } from "./strike-validator";
import { pickWeightedCombo, topWeaknesses, weaknessWeights } from "./weakness";
import type { BagCombo, BagDifficulty } from "./types";

export function buildComboPool(
  difficulty: BagDifficulty,
  weaknesses: Record<string, number[]>
): BagCombo[] {
  let pool = [...BAG_COMBOS[difficulty]];

  if (difficulty === "beginner") {
    pool = pool.filter((c) => !c.isDefensive);
  } else if (difficulty === "fighter") {
    const defensive = pool.filter((c) => c.isDefensive);
    const standard = pool.filter((c) => !c.isDefensive);
    pool = standard;
    if (defensive.length > 0 && Math.random() < defensiveCallChance(difficulty)) {
      pool = [...pool, ...defensive];
    }
  } else {
    const defensive = pool.filter((c) => c.isDefensive);
    const standard = pool.filter((c) => !c.isDefensive && !c.isFreestyle);
    const freestyle = pool.filter((c) => c.isFreestyle);
    pool = [...standard];
    if (Math.random() < defensiveCallChance(difficulty)) {
      pool.push(...defensive);
    }
    if (freestyle.length > 0 && Math.random() < 0.25) {
      pool.push(...freestyle);
    }
  }

  return pool.length > 0 ? pool : [...BAG_COMBOS[difficulty]];
}

export function pickNextCombo(
  difficulty: BagDifficulty,
  weaknesses: Record<string, number[]>,
  previousId: string | null,
  random = Math.random
): BagCombo {
  let pool = buildComboPool(difficulty, weaknesses).filter(
    (c) => c.id !== previousId
  );
  if (pool.length === 0) {
    pool = buildComboPool(difficulty, weaknesses);
  }

  const weights = weaknessWeights(pool, weaknesses);
  return pickWeightedCombo(pool, weights, random);
}

export function shouldChampionMidSwap(difficulty: BagDifficulty): boolean {
  return difficulty === "champion" && Math.random() < championMidSetSwapChance();
}

/** Pick only from user's slowest combos when weakness drill is active. */
export function pickWeaknessFocusedCombo(
  difficulty: BagDifficulty,
  weaknesses: Record<string, number[]>,
  previousId: string | null
): BagCombo {
  const tops = new Set(topWeaknesses(weaknesses, 5));
  let pool = buildComboPool(difficulty, weaknesses).filter(
    (c) => tops.has(c.label) && c.id !== previousId && !c.isFreestyle
  );
  if (pool.length === 0) {
    return pickNextCombo(difficulty, weaknesses, previousId);
  }
  const weights = weaknessWeights(pool, weaknesses);
  return pickWeightedCombo(pool, weights);
}

/** Rotate single punches for punch-speed drill. */
export function pickSpeedCombo(previousId: string | null): BagCombo {
  let pool = SPEED_COMBOS.filter(
    (c) => expectedHits(c) === 1 && c.id !== previousId
  );
  if (pool.length === 0) {
    pool = SPEED_COMBOS.filter((c) => expectedHits(c) === 1);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
