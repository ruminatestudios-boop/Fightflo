import type { ReactionTier } from "./types";

export const PUNCH_TIMEOUT_MS = 8_000;

export function reactionTier(seconds: number): ReactionTier {
  if (seconds < 0.5) return "elite";
  if (seconds <= 0.9) return "good";
  return "slow";
}

export function tierColor(tier: ReactionTier): string {
  if (tier === "elite") return "#4ade80";
  if (tier === "good") return "#facc15";
  return "#fa4141";
}

export function tierLabel(tier: ReactionTier): string {
  if (tier === "elite") return "ELITE";
  if (tier === "good") return "GOOD";
  return "SLOW";
}

export function formatReaction(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}
