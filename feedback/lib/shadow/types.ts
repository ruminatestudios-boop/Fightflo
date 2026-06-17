export const SHADOW_ROUND_LENGTHS = [60, 120, 180] as const;
export type ShadowRoundLength = (typeof SHADOW_ROUND_LENGTHS)[number];

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
}
