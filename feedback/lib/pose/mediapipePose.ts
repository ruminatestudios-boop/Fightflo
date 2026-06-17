import type { FrameLandmarks, LandmarkPoint } from "@/types";

export {
  POSE_LANDMARKER_LITE_URL,
  POSE_LANDMARKER_HEAVY_URL,
  POSE_SKELETON_MIN_VISIBILITY,
  POSE_OCCLUSION_WRIST_VISIBILITY,
  POSE_INTERPOLATED_VISIBILITY,
  POSE_PIPELINE_MIN_VISIBILITY,
  POSE_LANDMARK_MAP,
  POSE_JOINT_KEYS,
  POSE_GUARD_NODES,
  POSE_KICK_NODES,
} from "@/lib/pose/mediapipeConfig";

import {
  POSE_JOINT_KEYS,
  POSE_LANDMARK_MAP,
  POSE_OCCLUSION_WRIST_VISIBILITY,
  POSE_INTERPOLATED_VISIBILITY,
  POSE_PIPELINE_MIN_VISIBILITY,
} from "@/lib/pose/mediapipeConfig";

export type RawMediaPipePoint = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

function cloneLandmarks(landmarks: FrameLandmarks): FrameLandmarks {
  const next: FrameLandmarks = {};
  for (const key of POSE_JOINT_KEYS) {
    const point = landmarks[key];
    if (point) {
      next[key] = { ...point };
    }
  }
  return next;
}

export function mapRawMediaPipePose(
  pose: RawMediaPipePoint[]
): FrameLandmarks {
  const landmarks: FrameLandmarks = {};
  for (const [idxStr, key] of Object.entries(POSE_LANDMARK_MAP)) {
    const idx = Number(idxStr);
    const point = pose[idx];
    if (!point) continue;
    const visibility = point.visibility ?? 1;
    if (visibility < POSE_PIPELINE_MIN_VISIBILITY) continue;
    landmarks[key] = {
      x: point.x,
      y: point.y,
      z: point.z,
      visibility,
    };
  }
  return landmarks;
}

/** Side-on fight footage — damp noisy depth (z) when shoulders read as profile */
export function applySideViewZCorrection(
  landmarks: FrameLandmarks
): FrameLandmarks {
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const lh = landmarks.left_hip;
  const rh = landmarks.right_hip;
  if (!ls || !rs || !lh || !rh) return landmarks;

  const shoulderSpanX = Math.abs(ls.x - rs.x);
  const shoulderSpanZ = Math.abs((ls.z ?? 0) - (rs.z ?? 0));
  const torsoHeight = Math.abs(((ls.y + rs.y) / 2) - ((lh.y + rh.y) / 2));
  const profileRatio = shoulderSpanX / Math.max(torsoHeight, 0.08);

  const isSideView =
    profileRatio < 0.42 || shoulderSpanZ > shoulderSpanX * 0.75;

  if (!isSideView) return landmarks;

  const corrected = cloneLandmarks(landmarks);
  const coreZ: number[] = [];
  for (const key of ["left_shoulder", "right_shoulder", "left_hip", "right_hip"] as const) {
    const z = corrected[key]?.z;
    if (z !== undefined) coreZ.push(z);
  }
  if (coreZ.length === 0) return corrected;

  const torsoZ = coreZ.reduce((sum, z) => sum + z, 0) / coreZ.length;
  const zWeight = 0.22;

  for (const key of POSE_JOINT_KEYS) {
    const point = corrected[key];
    if (!point) continue;
    corrected[key] = {
      ...point,
      z: torsoZ * (1 - zWeight) + (point.z ?? torsoZ) * zWeight,
    };
  }

  return corrected;
}

function interpolateWrist(
  landmarks: FrameLandmarks,
  side: "left" | "right",
  priorFrames: FrameLandmarks[]
): void {
  const wristKey = `${side}_wrist` as const;
  const elbowKey = `${side}_elbow` as const;
  const shoulderKey = `${side}_shoulder` as const;

  const wrist = landmarks[wristKey];
  if ((wrist?.visibility ?? 1) >= POSE_OCCLUSION_WRIST_VISIBILITY) return;

  const elbow = landmarks[elbowKey];
  const shoulder = landmarks[shoulderKey];
  if (!elbow || !shoulder) return;

  const prev = priorFrames[priorFrames.length - 1];
  const prevWrist = prev?.[wristKey];
  const prevElbow = prev?.[elbowKey];

  if (prevWrist && prevElbow) {
    const vx = prevWrist.x - prevElbow.x;
    const vy = prevWrist.y - prevElbow.y;
    const vz = (prevWrist.z ?? 0) - (prevElbow.z ?? 0);
    landmarks[wristKey] = {
      x: elbow.x + vx,
      y: elbow.y + vy,
      z: (elbow.z ?? 0) + vz,
      visibility: POSE_INTERPOLATED_VISIBILITY,
    };
    return;
  }

  const ux = elbow.x - shoulder.x;
  const uy = elbow.y - shoulder.y;
  const len = Math.hypot(ux, uy) || 0.01;
  const forearmLen = len * 0.88;

  landmarks[wristKey] = {
    x: elbow.x + (ux / len) * forearmLen,
    y: elbow.y + (uy / len) * forearmLen,
    z: elbow.z ?? shoulder.z,
    visibility: POSE_INTERPOLATED_VISIBILITY,
  };
}

export function interpolateOccludedWrists(
  landmarks: FrameLandmarks,
  priorFrames: FrameLandmarks[]
): FrameLandmarks {
  const next = cloneLandmarks(landmarks);
  interpolateWrist(next, "left", priorFrames);
  interpolateWrist(next, "right", priorFrames);
  return next;
}

function averagePoint(points: LandmarkPoint[]): LandmarkPoint {
  const n = points.length;
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / n,
    y: points.reduce((sum, p) => sum + p.y, 0) / n,
    z: points.reduce((sum, p) => sum + (p.z ?? 0), 0) / n,
    visibility: Math.max(...points.map((p) => p.visibility ?? 0)),
  };
}

function blendPoints(
  newer: LandmarkPoint,
  older: LandmarkPoint,
  newerWeight: number
): LandmarkPoint {
  const w = newerWeight;
  return {
    x: newer.x * w + older.x * (1 - w),
    y: newer.y * w + older.y * (1 - w),
    z: (newer.z ?? 0) * w + (older.z ?? 0) * (1 - w),
    visibility: Math.max(newer.visibility ?? 0, older.visibility ?? 0),
  };
}

/**
 * Live overlay buffer — max 2 frames, 85% newest.
 * Avoids triple-average lag (~100ms) while damping single-frame spikes.
 */
export class LandmarkLiveBuffer {
  private prev: FrameLandmarks | null = null;

  reset(): void {
    this.prev = null;
  }

  get history(): FrameLandmarks[] {
    return this.prev ? [this.prev] : [];
  }

  push(frame: FrameLandmarks): FrameLandmarks {
    const next = cloneLandmarks(frame);
    if (!this.prev) {
      this.prev = next;
      return next;
    }

    const blended: FrameLandmarks = {};
    for (const key of POSE_JOINT_KEYS) {
      const a = next[key];
      const b = this.prev[key];
      if (a && b) {
        blended[key] = blendPoints(a, b, 0.85);
      } else if (a) {
        blended[key] = a;
      } else if (b) {
        blended[key] = b;
      }
    }

    this.prev = blended;
    return blended;
  }
}

/** Rolling average of the last 3 frames — offline / server analysis only */
export class LandmarkTripleSmoothBuffer {
  private frames: FrameLandmarks[] = [];

  reset(): void {
    this.frames = [];
  }

  get history(): FrameLandmarks[] {
    return this.frames;
  }

  push(frame: FrameLandmarks): FrameLandmarks {
    this.frames.push(cloneLandmarks(frame));
    if (this.frames.length > 3) {
      this.frames.shift();
    }
    return this.average();
  }

  private average(): FrameLandmarks {
    if (this.frames.length === 0) return {};
    if (this.frames.length === 1) return cloneLandmarks(this.frames[0]);

    const result: FrameLandmarks = {};
    for (const key of POSE_JOINT_KEYS) {
      const points = this.frames
        .map((frame) => frame[key])
        .filter((point): point is LandmarkPoint => Boolean(point));
      if (points.length === 0) continue;
      result[key] = averagePoint(points);
    }
    return result;
  }
}

export function hasCorePoseJoints(landmarks: FrameLandmarks): boolean {
  const core: (keyof FrameLandmarks)[] = [
    "left_shoulder",
    "right_shoulder",
    "left_hip",
    "right_hip",
  ];
  return (
    core.filter((joint) => (landmarks[joint]?.visibility ?? 0) >= 0.35).length >=
    3
  );
}

/** Real-time live path — minimal latency smoothing */
export function processLivePoseFrame(
  pose: RawMediaPipePoint[],
  liveBuffer: LandmarkLiveBuffer
): FrameLandmarks | null {
  const raw = mapRawMediaPipePose(pose);
  if (!hasCorePoseJoints(raw)) return null;

  const sideAdjusted = applySideViewZCorrection(raw);
  const withWrists = interpolateOccludedWrists(
    sideAdjusted,
    liveBuffer.history
  );
  return liveBuffer.push(withWrists);
}

/** Offline analysis — heavier temporal smoothing */
export function processFightingPoseFrame(
  pose: RawMediaPipePoint[],
  smoothBuffer: LandmarkTripleSmoothBuffer
): FrameLandmarks | null {
  const raw = mapRawMediaPipePose(pose);
  if (!hasCorePoseJoints(raw)) return null;

  const sideAdjusted = applySideViewZCorrection(raw);
  const withWrists = interpolateOccludedWrists(
    sideAdjusted,
    smoothBuffer.history
  );
  return smoothBuffer.push(withWrists);
}
