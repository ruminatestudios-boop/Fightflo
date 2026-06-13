import type { BagTrainingConfig } from "./types";

/** Pose + mic + velocity fusion only works when the camera sees the fighter. */
export function shouldUsePoseEngine(config: BagTrainingConfig): boolean {
  return config.drillMode === "combo" && config.cameraMode === "fighter";
}
