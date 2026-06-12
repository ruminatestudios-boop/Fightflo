const WEAKNESS_BOOST = 1.4;

export function mergeWeaknessData(
  existing: Record<string, number[]>,
  sessionReactions: Record<string, number[]>
): Record<string, number[]> {
  const next = { ...existing };
  for (const [combo, times] of Object.entries(sessionReactions)) {
    next[combo] = [...(next[combo] ?? []), ...times];
  }
  return next;
}

export function averageReactionTime(times: number[]): number {
  if (times.length === 0) return 0;
  return times.reduce((a, b) => a + b, 0) / times.length;
}

export function topWeaknesses(
  weaknesses: Record<string, number[]>,
  count = 3
): string[] {
  return Object.entries(weaknesses)
    .map(([combo, times]) => ({
      combo,
      avg: averageReactionTime(times),
      n: times.length,
    }))
    .filter((x) => x.n > 0 && x.avg > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, count)
    .map((x) => x.combo);
}

/** Fix topWeaknesses - I referenced x.times incorrectly */
export function computeSessionWeaknesses(
  comboReactions: Record<string, number[]>,
  count = 3
): string[] {
  return Object.entries(comboReactions)
    .map(([combo, times]) => ({
      combo,
      avg: averageReactionTime(times),
      count: times.length,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, count)
    .map((x) => x.combo);
}

export function weaknessWeights(
  combos: { label: string }[],
  weaknesses: Record<string, number[]>
): number[] {
  const tops = new Set(topWeaknesses(weaknesses, 10));
  return combos.map((c) => (tops.has(c.label) ? WEAKNESS_BOOST : 1));
}

export function pickWeightedCombo<T extends { label: string }>(
  pool: T[],
  weights: number[],
  random = Math.random
): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
