import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateCombatState } from "./combatStateLogic";
import type { FrameLandmarks } from "@/types";

function frame(overrides: Partial<FrameLandmarks>): FrameLandmarks {
  return {
    nose: { x: 0.5, y: 0.2, z: 0, visibility: 0.9 },
    left_eye: { x: 0.48, y: 0.18, z: 0, visibility: 0.9 },
    right_eye: { x: 0.52, y: 0.18, z: 0, visibility: 0.9 },
    left_shoulder: { x: 0.42, y: 0.32, z: 0, visibility: 0.9 },
    right_shoulder: { x: 0.58, y: 0.32, z: 0, visibility: 0.9 },
    left_wrist: { x: 0.44, y: 0.28, z: 0, visibility: 0.9 },
    right_wrist: { x: 0.56, y: 0.28, z: 0, visibility: 0.9 },
    left_knee: { x: 0.44, y: 0.62, z: 0, visibility: 0.9 },
    right_knee: { x: 0.56, y: 0.62, z: 0, visibility: 0.9 },
    left_ankle: { x: 0.44, y: 0.82, z: 0, visibility: 0.9 },
    right_ankle: { x: 0.56, y: 0.82, z: 0, visibility: 0.9 },
    ...overrides,
  };
}

describe("combatStateLogic", () => {
  it("flags support hand drop during kick", () => {
    const prev = frame({});
    const current = frame({
      right_knee: { x: 0.58, y: 0.35, z: 0, visibility: 0.9 },
      right_ankle: { x: 0.6, y: 0.3, z: 0, visibility: 0.9 },
      left_wrist: { x: 0.4, y: 0.35, z: 0, visibility: 0.9 },
    });

    const snapshot = evaluateCombatState({
      landmarks: current,
      prevLandmarks: prev,
      deltaSec: 0.05,
      eyeLineY: 0.2,
    });

    assert.equal(snapshot.state, "muay_thai_kick");
    assert.equal(snapshot.supportHandDropAlert, true);
  });
});
