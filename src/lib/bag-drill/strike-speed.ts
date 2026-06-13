const STRIKE_LABELS: Record<string, string> = {
  jab: "Jab",
  cross: "Cross",
  hook: "Hook",
  "body-shot": "Body shot",
};

export function strikeLabel(strikeId: string): string {
  return STRIKE_LABELS[strikeId] ?? strikeId;
}

export function recordStrikeSpeed(
  speeds: Record<string, number[]>,
  strikeId: string,
  seconds: number
): Record<string, number[]> {
  return {
    ...speeds,
    [strikeId]: [...(speeds[strikeId] ?? []), seconds],
  };
}

export function averageStrikeSpeed(times: number[]): number {
  if (times.length === 0) return 0;
  return times.reduce((a, b) => a + b, 0) / times.length;
}

export interface StrikeSpeedSummary {
  strikeId: string;
  label: string;
  avgSeconds: number;
  bestSeconds: number;
  count: number;
}

export function summariseStrikeSpeeds(
  speeds: Record<string, number[]>
): StrikeSpeedSummary[] {
  return Object.entries(speeds)
    .map(([strikeId, times]) => ({
      strikeId,
      label: strikeLabel(strikeId),
      avgSeconds: averageStrikeSpeed(times),
      bestSeconds: times.length > 0 ? Math.min(...times) : 0,
      count: times.length,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => a.avgSeconds - b.avgSeconds);
}

export function fastestStrikeId(
  speeds: Record<string, number[]>
): string | undefined {
  const ranked = summariseStrikeSpeeds(speeds);
  return ranked[0]?.strikeId;
}

export function formatStrikeSpeed(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}
