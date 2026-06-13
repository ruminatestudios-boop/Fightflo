import { defaultTiming } from "./timing-presets";
import type {
  BagCameraMode,
  BagDrillMode,
  BagTrainingConfig,
  FlurryDuration,
} from "./types";

export function buildQuickStartConfig(
  drillMode: BagDrillMode,
  partial: Partial<BagTrainingConfig> = {},
  cameraMode: BagCameraMode = "fighter"
): BagTrainingConfig {
  const difficulty = partial.difficulty ?? "fighter";
  const isFlurry = drillMode === "flurry";
  const isSpeed = drillMode === "speed";
  const flurrySeconds = (partial.flurrySeconds as FlurryDuration) ?? 30;
  const timing = partial.timing ?? defaultTiming(difficulty);

  return {
    difficulty,
    cameraMode: partial.cameraMode ?? cameraMode,
    drillMode,
    stance: partial.stance ?? "orthodox",
    weaknessFocus: isFlurry || isSpeed ? false : (partial.weaknessFocus ?? false),
    flurrySeconds: isFlurry ? flurrySeconds : undefined,
    weeklyPlanId: partial.weeklyPlanId,
    calibration: partial.calibration,
    timing: {
      ...timing,
      durationSeconds: isFlurry
        ? flurrySeconds
        : isSpeed
          ? 0
          : Math.max(60, timing.durationSeconds || 300),
      restBetweenCombosMs: isSpeed ? 900 : timing.restBetweenCombosMs,
      comboWindowScale: isSpeed ? 0.65 : timing.comboWindowScale,
    },
  };
}
