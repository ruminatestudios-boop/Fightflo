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

/** MediaPipe hand landmark indices (21 points per hand) */
export const HAND_LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  PINKY_MCP: 17,
} as const;

export const MIC_SAMPLE_MS = 16;
export const MIC_SPIKE_THRESHOLD = 0.18;
export const MIC_SPIKE_MAX_MS = 150;

export const WRIST_VELOCITY_PX = 32;
export const WRIST_VELOCITY_WINDOW_MS = 120;

export const FUSION_WINDOW_MS = 160;
export const FUSION_MIC_VELOCITY_MAX_MS = 120;
export const MIN_LOG_CONFIDENCE = 78;
export const TEMPORAL_WINDOW_MS = 280;
export const TEMPORAL_MIN_FRAMES = 3;
export const PUNCH_COOLDOWN_MS = 150;
export const COMBO_WINDOW_GRACE_MS = 600;

export const GUARD_CHECK_MS = 100;
export const GUARD_DROP_PCT = 0.2;
export const GUARD_PUNCH_COOLDOWN_MS = 300;

export const COMBO_GAP_MS = 1800;
export const COMBO_MIN_LENGTH = 2;
export const COMBO_MAX_BUFFER = 8;

export const CALIBRATION_TTL_MS = 30 * 60 * 1000;

export const POSE_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const POSE_BASE =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker";

/** Prefer heavy → full → lite (GPU first, then CPU) */
export const POSE_MODEL_CANDIDATES = [
  {
    tier: "heavy" as const,
    url: `${POSE_BASE}/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task`,
    delegate: "GPU" as const,
  },
  {
    tier: "full" as const,
    url: `${POSE_BASE}/pose_landmarker_full/float16/latest/pose_landmarker_full.task`,
    delegate: "GPU" as const,
  },
  {
    tier: "full" as const,
    url: `${POSE_BASE}/pose_landmarker_full/float16/latest/pose_landmarker_full.task`,
    delegate: "CPU" as const,
  },
  {
    tier: "lite" as const,
    url: `${POSE_BASE}/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`,
    delegate: "CPU" as const,
  },
];

export type PoseModelTier = (typeof POSE_MODEL_CANDIDATES)[number]["tier"];

export const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

/** @deprecated Use POSE_MODEL_CANDIDATES */
export const POSE_MODEL_URL = POSE_MODEL_CANDIDATES[3].url;
