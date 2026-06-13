export type BagDifficulty = "beginner" | "fighter" | "champion";

export type BagDrillMode = "combo" | "flurry" | "speed";

import type { BagCalibration, BagStance } from "./calibration";

export type { BagCalibration, BagStance };

export type BagScreen =
  | "intro"
  | "home"
  | "setup-intro"
  | "setup-camera"
  | "calibration"
  | "setup-config"
  | "training"
  | "flurry"
  | "summary"
  | "progress";

/** Bag = mic counts impacts only. Fighter = cam + mic estimates strike type. */
export type BagCameraMode = "bag" | "fighter";

export type DetectionMode =
  | "pose-triple"
  | "audio-hybrid"
  | "audio-only"
  | "visual-tap"
  | "timer-fallback"
  | "live";

export type ReactionTier = "elite" | "good" | "slow";

export type StrikeValidation = "correct" | "wrong" | "miss" | null;

export type StrikeLogStatus = "pending" | "hit" | "miss" | "wrong" | "disputed";

export interface StrikeLogEntry {
  label: string;
  strikeId: string;
  status: StrikeLogStatus;
  /** Mic counted when cam detection missed the strike */
  micBackup?: boolean;
}

export interface BagStrike {
  id: string;
  label: string;
  speak: string;
  /** If false, it's a defensive/move cue — no hit expected (slip, duck, roll) */
  requiresHit: boolean;
}

export interface BagCombo {
  id: string;
  label: string;
  speak: string;
  strikes: BagStrike[];
  isDefensive?: boolean;
  isFreestyle?: boolean;
  freestyleSeconds?: number;
}

export interface BagSessionRecord {
  date: string;
  startedAt?: string;
  duration: number;
  totalPunches: number;
  avgReactionTime: number;
  fastestReaction: number;
  accuracyPercent: number;
  weaknesses: string[];
  difficulty: BagDifficulty;
  cameraMode: BagCameraMode;
  comboReactions: Record<string, number[]>;
  sessionType?: BagDrillMode;
  flurrySeconds?: number;
  /** Peak punches per second during flurry */
  flurryPeakRate?: number;
  /** Best single flurry count for this duration (personal best beat) */
  flurryPersonalBest?: boolean;
  guardDrops?: number;
  /** Per-strike timing in seconds (reaction or gap between punches) */
  strikeSpeeds?: Record<string, number[]>;
  /** Strike id with lowest average time this session */
  fastestStrikeId?: string;
}

export interface BagUserMeta {
  streakFreezes: number;
  lastTrainingAt?: string;
  usualTrainingHour?: number;
  usualTrainingDow?: number;
}

export interface BagAllTimeStats {
  totalSessions: number;
  totalPunches: number;
  fastestReaction: number | null;
  longestSession: number;
  longestStreak: number;
  currentStreak: number;
  bestFlurry30?: number;
  bestFlurry15?: number;
  bestFlurry60?: number;
}

export interface FightFloBagData {
  sessions: BagSessionRecord[];
  allTimeStats: BagAllTimeStats;
  weaknesses: Record<string, number[]>;
  userMeta?: BagUserMeta;
}

export interface BagTimingConfig {
  durationSeconds: number;
  restBetweenCombosMs: number;
  /** Multiplier on auto combo window (0.5–2) */
  comboWindowScale: number;
}

export interface BagTrainingConfig {
  difficulty: BagDifficulty;
  cameraMode: BagCameraMode;
  timing: BagTimingConfig;
  drillMode: BagDrillMode;
  /** Flurry round length (seconds) */
  flurrySeconds?: number;
  /** Prioritise slowest combos from history */
  weaknessFocus?: boolean;
  /** From weekly plan preset */
  weeklyPlanId?: string;
  /** Orthodox / southpaw — lead/rear hand mapping for punch estimates */
  stance?: BagStance;
  /** Pre-flight mic + lighting calibration */
  calibration?: BagCalibration;
}

export const FLURRY_DURATION_OPTIONS = [15, 30, 60] as const;
export type FlurryDuration = (typeof FLURRY_DURATION_OPTIONS)[number];

export const EMPTY_BAG_DATA: FightFloBagData = {
  sessions: [],
  allTimeStats: {
    totalSessions: 0,
    totalPunches: 0,
    fastestReaction: null,
    longestSession: 0,
    longestStreak: 0,
    currentStreak: 0,
  },
  weaknesses: {},
  userMeta: { streakFreezes: 0 },
};
