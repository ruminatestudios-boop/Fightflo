import type { AppLanguage } from "./i18n";

export type FightStyle = "muay-thai" | "boxing" | "mma" | "kickboxing";

export type DifficultyMode = "easy" | "hard" | "stadium";

/** Fighting rhythm archetype — controls pacing, pressure waves, and fight feel */
export type RhythmArchetype =
  | "muay-femur"
  | "muay-mat"
  | "muay-khao"
  | "counter-fighter"
  | "dutch-kickboxer"
  | "mma";

/** Advanced rhythm challenge modes — override pacing behavior */
export type RhythmMode =
  | "default"
  | "five-round-war"
  | "last-round-pressure"
  | "stadium-pace"
  | "counter-sniper"
  | "pressure-nightmare"
  | "technical-femur"
  | "cardio-hell";

export type RhythmSegment =
  | "reading"
  | "probing"
  | "pressure"
  | "explosive"
  | "counter"
  | "defensive"
  | "reset"
  | "grind"
  | "feint";

/** Fight-realistic round pacing — scripted segments + seeded micro-timing */
export interface RhythmBlueprint {
  segmentScript: RhythmSegment[];
  seed: number;
  /** Tighter, repeatable timing for researched fighter profiles */
  fighterProfile?: boolean;
}

export type SignalType =
  | "attack"
  | "defend"
  | "move"
  | "burnout"
  | "pressure"
  | "reset";

export type AppScreen =
  | "loading"
  | "home"
  | "style"
  | "mode"
  | "settings"
  | "challenges"
  | "training"
  | "rest"
  | "summary"
  | "records"
  | "onboarding"
  | "intro"
  | "workout"
  | "category"
  | "session-setup"
  | "breathwork"
  | "opponent"
  | "paywall";

export type { AppLanguage };

export interface RoundSettings {
  rounds: number;
  roundLength: number; // seconds
  restTime: number; // seconds
}

export type SignalCueMode = "learn" | "beeps" | "voice";

/** clear = 3 moves, voice every cue, visual-first. advanced = 6 moves, distinct beeps */
export type CueStyle = "clear" | "advanced";

/** solo = react cues (attack/defend/move). combos = voice calls combination strings */
export type WorkoutMode = "solo" | "combos";

/** Training focus — fight + general fitness */
export type TrainingCategory =
  | "fight"
  | "conditioning"
  | "hiit"
  | "sprint"
  | "breathwork";

export type TimerIntensity = "calm" | "standard" | "aggressive" | "burnout";

export interface AudioSettings {
  crowdAmbience: boolean;
  gymAmbience: boolean;
  trainerClaps: boolean;
  masterVolume: number;
  signalCueMode: SignalCueMode;
}

export interface ComboPreset {
  id: string;
  label: string;
  speak: string;
}

export interface ComboEvent {
  id: string;
  label: string;
  speak: string;
  timestamp: number;
  duration: number;
  segment?: RhythmSegment;
}

export interface AppSettings {
  style: FightStyle;
  mode: DifficultyMode;
  workoutMode: WorkoutMode;
  cueStyle: CueStyle;
  rhythmArchetype: RhythmArchetype;
  rhythmMode: RhythmMode;
  language: AppLanguage;
  rounds: RoundSettings;
  audio: AudioSettings;
  lastChallengeId: string | null;
  trainingCategory: TrainingCategory;
}

export interface ChallengePreset {
  id: string;
  name: string;
  tagline: string;
  style: FightStyle;
  mode: DifficultyMode;
  rounds: RoundSettings;
  rhythmArchetype?: RhythmArchetype;
  rhythmMode?: RhythmMode;
  featured?: boolean;
}

export interface SignalEvent {
  type: SignalType;
  timestamp: number;
  duration: number;
  segment?: RhythmSegment;
}

/** Style-specific move callout fired by the move signal engine */
export interface MoveCallEvent {
  id: string;
  move: string;
  speak: string;
  style: FightStyle;
  timestamp: number;
  duration: number;
}

export interface RoundStats {
  roundNumber: number;
  signalsFired: number;
  bursts: number;
  chaosMoments: number;
}

export interface SessionStats {
  style: FightStyle;
  mode: DifficultyMode;
  workoutMode: WorkoutMode;
  challengeName: string | null;
  totalSignals: number;
  reactionScore: number;
  pressureRating: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  roundsCompleted: number;
  totalRounds: number;
  survived: boolean;
  trainingCategory?: TrainingCategory;
  sprintFinisherUsed?: boolean;
}

export interface TrainingPhase {
  phase: "countdown" | "active" | "rest" | "complete";
  currentRound: number;
  timeRemaining: number;
  activeSignal: SignalType | null;
  activeCombo: { label: string; speak: string } | null;
  /** Specific technique callout (move signal engine) */
  activeMoveCall?: { label: string; speak: string } | null;
  learningCue?: boolean;
  rhythmSegment?: RhythmSegment | null;
  /** Coach voice line during silence between cues */
  coachCue?: string | null;
  /** Corner advice visible only once coach voice starts */
  restCornerCue?: string | null;
  /** High-intensity finisher mode active */
  sprintFinisher?: boolean;
}

export const CLEAR_SIGNALS: SignalType[] = ["attack", "defend", "move"];

export const DEFAULT_SETTINGS: AppSettings = {
  style: "muay-thai",
  mode: "easy",
  workoutMode: "solo",
  cueStyle: "clear",
  rhythmArchetype: "muay-femur",
  rhythmMode: "default",
  language: "en",
  rounds: {
    rounds: 2,
    roundLength: 120,
    restTime: 45,
  },
  audio: {
    crowdAmbience: false,
    gymAmbience: false,
    trainerClaps: false,
    masterVolume: 0.85,
    signalCueMode: "learn",
  },
  lastChallengeId: null,
  trainingCategory: "fight",
};
