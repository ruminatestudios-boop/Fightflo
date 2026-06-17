import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LandmarkLiveBuffer,
  LandmarkTripleSmoothBuffer,
  POSE_SKELETON_MIN_VISIBILITY,
  applySideViewZCorrection,
  interpolateOccludedWrists,
  processFightingPoseFrame,
  processLivePoseFrame,
} from "./mediapipePose";
import type { FrameLandmarks } from "@/types";

function samplePose(overrides: Partial<Record<number, { x: number; y: number; z: number; visibility?: number }>> = {}) {
  const base = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }));

  for (const [idx, point] of Object.entries(overrides)) {
    base[Number(idx)] = { ...base[Number(idx)], ...point };
  }

  return base;
}

describe("mediapipePose fighting pipeline", () => {
  it("averages the last three frames", () => {
    const buffer = new LandmarkTripleSmoothBuffer();
    const pose = samplePose({
      11: { x: 0.4, y: 0.3, z: -0.1, visibility: 0.9 },
      12: { x: 0.6, y: 0.3, z: 0.1, visibility: 0.9 },
      23: { x: 0.42, y: 0.7, z: 0, visibility: 0.9 },
      24: { x: 0.58, y: 0.7, z: 0, visibility: 0.9 },
    });

    const a = processFightingPoseFrame(pose, buffer);
    const b = processFightingPoseFrame(
      samplePose({
        11: { x: 0.41, y: 0.31, z: -0.1, visibility: 0.9 },
        12: { x: 0.61, y: 0.31, z: 0.1, visibility: 0.9 },
        23: { x: 0.43, y: 0.71, z: 0, visibility: 0.9 },
        24: { x: 0.59, y: 0.71, z: 0, visibility: 0.9 },
      }),
      buffer
    );
    const c = processFightingPoseFrame(
      samplePose({
        11: { x: 0.42, y: 0.32, z: -0.1, visibility: 0.9 },
        12: { x: 0.62, y: 0.32, z: 0.1, visibility: 0.9 },
        23: { x: 0.44, y: 0.72, z: 0, visibility: 0.9 },
        24: { x: 0.6, y: 0.72, z: 0, visibility: 0.9 },
      }),
      buffer
    );

    assert.ok(a && b && c);
    assert.ok(Math.abs((c.left_shoulder?.x ?? 0) - 0.41) < 0.02);
  });

  it("live path favors the newest frame", () => {
    const buffer = new LandmarkLiveBuffer();
    const pose = samplePose({
      11: { x: 0.4, y: 0.3, z: -0.1, visibility: 0.9 },
      12: { x: 0.6, y: 0.3, z: 0.1, visibility: 0.9 },
      23: { x: 0.42, y: 0.7, z: 0, visibility: 0.9 },
      24: { x: 0.58, y: 0.7, z: 0, visibility: 0.9 },
    });

    processLivePoseFrame(pose, buffer);
    const latest = processLivePoseFrame(
      samplePose({
        11: { x: 0.5, y: 0.3, z: -0.1, visibility: 0.9 },
        12: { x: 0.7, y: 0.3, z: 0.1, visibility: 0.9 },
        23: { x: 0.42, y: 0.7, z: 0, visibility: 0.9 },
        24: { x: 0.58, y: 0.7, z: 0, visibility: 0.9 },
      }),
      buffer
    );

    assert.ok(latest);
    assert.ok(Math.abs((latest.left_shoulder?.x ?? 0) - 0.48) < 0.05);
  });

  it("interpolates occluded wrists from elbow trajectory", () => {
    const prior: FrameLandmarks = {
      left_shoulder: { x: 0.4, y: 0.3, z: 0, visibility: 0.9 },
      left_elbow: { x: 0.42, y: 0.45, z: 0, visibility: 0.9 },
      left_wrist: { x: 0.44, y: 0.58, z: 0, visibility: 0.9 },
      right_shoulder: { x: 0.6, y: 0.3, z: 0, visibility: 0.9 },
      right_hip: { x: 0.58, y: 0.7, z: 0, visibility: 0.9 },
      left_hip: { x: 0.42, y: 0.7, z: 0, visibility: 0.9 },
    };

    const current: FrameLandmarks = {
      ...prior,
      left_wrist: { x: 0.1, y: 0.1, z: 0, visibility: 0.2 },
    };

    const next = interpolateOccludedWrists(current, [prior]);
    assert.ok((next.left_wrist?.visibility ?? 0) >= POSE_SKELETON_MIN_VISIBILITY);
    assert.ok(Math.abs((next.left_wrist?.x ?? 0) - 0.46) < 0.05);
  });

  it("dampens z noise in side view", () => {
    const landmarks: FrameLandmarks = {
      left_shoulder: { x: 0.49, y: 0.3, z: -0.4, visibility: 0.9 },
      right_shoulder: { x: 0.51, y: 0.3, z: 0.35, visibility: 0.9 },
      left_hip: { x: 0.49, y: 0.72, z: -0.2, visibility: 0.9 },
      right_hip: { x: 0.51, y: 0.72, z: 0.18, visibility: 0.9 },
      left_elbow: { x: 0.48, y: 0.45, z: 0.6, visibility: 0.9 },
    };

    const corrected = applySideViewZCorrection(landmarks);
    const elbowZ = Math.abs(corrected.left_elbow?.z ?? 0);
    assert.ok(elbowZ < 0.35);
  });
});
