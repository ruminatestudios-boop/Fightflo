import type { AppSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

/** One-tap first session — short, easy, learn mode (voice + beeps). */
export const QUICK_START_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  mode: "easy",
  rounds: {
    rounds: 1,
    roundLength: 120,
    restTime: 30,
  },
  audio: {
    ...DEFAULT_SETTINGS.audio,
    signalCueMode: "learn",
  },
  lastChallengeId: null,
};

/** Recommended after first session — still manageable. */
export const STANDARD_START_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  mode: "easy",
  rounds: {
    rounds: 2,
    roundLength: 120,
    restTime: 45,
  },
  audio: {
    ...DEFAULT_SETTINGS.audio,
    signalCueMode: "learn",
  },
  lastChallengeId: null,
};
