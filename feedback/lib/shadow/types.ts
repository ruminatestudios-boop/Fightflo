export const SHADOW_ROUND_MIN_SECONDS = 60;
export const SHADOW_ROUND_MAX_SECONDS = 5 * 60;
export const SHADOW_ROUND_STEP_SECONDS = 30;

/** Labels under the round-length slider (1 min → 5 min) */
export const SHADOW_ROUND_TICK_MARKS = [60, 120, 180, 240, 300] as const;

export type ShadowRoundLength = number;

export function clampShadowRoundLength(seconds: number): ShadowRoundLength {
  const snapped =
    Math.round(seconds / SHADOW_ROUND_STEP_SECONDS) * SHADOW_ROUND_STEP_SECONDS;
  return Math.min(
    SHADOW_ROUND_MAX_SECONDS,
    Math.max(SHADOW_ROUND_MIN_SECONDS, snapped)
  );
}

export const SHADOW_CALIBRATE_SECONDS = 3;

export interface ShadowDropEvent {
  id: string;
  elapsedSec: number;
  hand: "left" | "right" | "both";
}

export type {
  ShadowMoment,
  ShadowPositiveType,
  ShadowWeaknessType,
} from "./shadowboxingCopy";

import type { ShadowMoment } from "./shadowboxingCopy";
import type { ComboRecommendation, DetectedPunch } from "./shadowComboDetection";

export interface ShadowRoundResult {
  roundSeconds: number;
  completedAt: string;
  moments: ShadowMoment[];
  issueCount: number;
  positiveCount: number;
  dropCount: number;
  guardUptimePercent: number;
  reliableFrameCount: number;
  mechanicalFix: string;
  drillName: string;
  summary: string;
  drops: ShadowDropEvent[];
  punches?: DetectedPunch[];
  topCombos?: string[];
  recommendMore?: ComboRecommendation[];
  comboDrill?: string;
}
