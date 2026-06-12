/** MediaPipe pose landmark indices */
export const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_HEEL: 27,
  RIGHT_HEEL: 28,
} as const;

export const MIC_SAMPLE_MS = 16;
export const MIC_SPIKE_THRESHOLD = 85 / 255;
export const MIC_SPIKE_MAX_MS = 150;

export const WRIST_VELOCITY_PX = 25;
export const WRIST_VELOCITY_WINDOW_MS = 100;

export const FUSION_WINDOW_MS = 150;
export const MIN_LOG_CONFIDENCE = 75;

export const GUARD_CHECK_MS = 100;
export const GUARD_DROP_PCT = 0.2;
export const GUARD_PUNCH_COOLDOWN_MS = 300;

export const COMBO_GAP_MS = 1800;
export const COMBO_MIN_LENGTH = 2;
export const COMBO_MAX_BUFFER = 8;

export const CALIBRATION_TTL_MS = 30 * 60 * 1000;

export const POSE_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
export const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
