import type { ShadowRoundResult } from "./types";

const STORAGE_KEY = "feedback_shadow_last_round";

export function getLastShadowRound(): ShadowRoundResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShadowRoundResult>;
    if (!parsed.completedAt) return null;
    return {
      roundSeconds: parsed.roundSeconds ?? 120,
      completedAt: parsed.completedAt,
      moments: parsed.moments ?? [],
      issueCount: parsed.issueCount ?? parsed.dropCount ?? 0,
      positiveCount: parsed.positiveCount ?? 0,
      dropCount: parsed.dropCount ?? 0,
      guardUptimePercent: parsed.guardUptimePercent ?? 0,
      reliableFrameCount: parsed.reliableFrameCount ?? 0,
      mechanicalFix: parsed.mechanicalFix ?? "",
      drillName: parsed.drillName ?? "",
      summary: parsed.summary ?? "",
      drops: parsed.drops ?? [],
      punches: parsed.punches ?? [],
      topCombos: parsed.topCombos ?? [],
      recommendMore: parsed.recommendMore ?? [],
      comboDrill: parsed.comboDrill ?? "",
    };
  } catch {
    return null;
  }
}

export function saveShadowRound(result: ShadowRoundResult): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}
