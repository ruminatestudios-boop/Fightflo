import type { BagDrillMode } from "./types";

export type CalibrationPurpose = "combo" | "flurry" | "weakness" | "speed";

export function resolveCalibrationPurpose(
  drillMode: BagDrillMode,
  weaknessFocus?: boolean
): CalibrationPurpose {
  if (drillMode === "speed") return "speed";
  if (drillMode === "flurry") return "flurry";
  if (weaknessFocus) return "weakness";
  return "combo";
}

export function isMicOnlyCalibration(purpose: CalibrationPurpose): boolean {
  return purpose === "speed" || purpose === "flurry";
}
