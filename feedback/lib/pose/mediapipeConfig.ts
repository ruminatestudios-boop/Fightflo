import type { PoseLandmarkerOptions } from "@mediapipe/tasks-vision";
import type { FrameLandmarks } from "../../types";

/**
 * Sports real-time config — Lite model for maximum FPS on punches/kicks.
 * MediaPipe Tasks uses model file variant (lite.task), not legacy modelComplexity.
 */
export const POSE_LANDMARKER_LITE_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

/** @deprecated Use POSE_LANDMARKER_LITE_URL — kept for analysis scripts */
export const POSE_LANDMARKER_HEAVY_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task";

export const POSE_SPORTS_DETECTION_CONFIDENCE = 0.5;
export const POSE_SPORTS_TRACKING_CONFIDENCE = 0.5;
export const POSE_SPORTS_PRESENCE_CONFIDENCE = 0.5;

/** Render threshold — hide jittery low-confidence joints */
export const POSE_SKELETON_MIN_VISIBILITY = 0.65;

export const POSE_OCCLUSION_WRIST_VISIBILITY = 0.5;
export const POSE_INTERPOLATED_VISIBILITY = 0.68;
export const POSE_PIPELINE_MIN_VISIBILITY = 0.12;

/** Cap capture throughput — 640×480 ideal, 720p max */
export const POSE_CAMERA_IDEAL_WIDTH = 640;
export const POSE_CAMERA_IDEAL_HEIGHT = 480;
export const POSE_CAMERA_MAX_WIDTH = 1280;
export const POSE_CAMERA_MAX_HEIGHT = 720;

/** Full MediaPipe BlazePose 33-landmark index map */
export const POSE_LANDMARK_MAP: Record<number, keyof FrameLandmarks> = {
  0: "nose",
  1: "left_eye_inner",
  2: "left_eye",
  3: "left_eye_outer",
  4: "right_eye_inner",
  5: "right_eye",
  6: "right_eye_outer",
  7: "left_ear",
  8: "right_ear",
  9: "mouth_left",
  10: "mouth_right",
  11: "left_shoulder",
  12: "right_shoulder",
  13: "left_elbow",
  14: "right_elbow",
  15: "left_wrist",
  16: "right_wrist",
  17: "left_pinky",
  18: "right_pinky",
  19: "left_index",
  20: "right_index",
  21: "left_thumb",
  22: "right_thumb",
  23: "left_hip",
  24: "right_hip",
  25: "left_knee",
  26: "right_knee",
  27: "left_ankle",
  28: "right_ankle",
  29: "left_heel",
  30: "right_heel",
  31: "left_foot_index",
  32: "right_foot_index",
};

export const POSE_JOINT_KEYS = Object.values(POSE_LANDMARK_MAP);

export const POSE_GUARD_NODES: (keyof FrameLandmarks)[] = [
  "left_wrist",
  "right_wrist",
  "left_elbow",
  "right_elbow",
  "left_shoulder",
  "right_shoulder",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "nose",
];

export const POSE_KICK_NODES: (keyof FrameLandmarks)[] = [
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
  "left_hip",
  "right_hip",
];

export function createSportsPoseLandmarkerOptions(
  runningMode: "IMAGE" | "VIDEO",
  delegate: "GPU" | "CPU" = "GPU",
  numPoses = 1
): PoseLandmarkerOptions {
  return {
    baseOptions: {
      modelAssetPath: POSE_LANDMARKER_LITE_URL,
      delegate,
    },
    runningMode,
    numPoses,
    minPoseDetectionConfidence: POSE_SPORTS_DETECTION_CONFIDENCE,
    minPosePresenceConfidence: POSE_SPORTS_PRESENCE_CONFIDENCE,
    minTrackingConfidence: POSE_SPORTS_TRACKING_CONFIDENCE,
    outputSegmentationMasks: false,
  };
}

export function sportsCameraVideoConstraints(
  facingMode: "user" | "environment" = "environment"
): MediaTrackConstraints {
  return {
    facingMode: { ideal: facingMode },
    width: { ideal: POSE_CAMERA_IDEAL_WIDTH, max: POSE_CAMERA_MAX_WIDTH },
    height: { ideal: POSE_CAMERA_IDEAL_HEIGHT, max: POSE_CAMERA_MAX_HEIGHT },
    frameRate: { ideal: 30, max: 60 },
  };
}
