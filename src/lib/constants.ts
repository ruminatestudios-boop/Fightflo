import type {
  ChallengePreset,
  ComboPreset,
  CueStyle,
  FightStyle,
  RhythmArchetype,
  SignalCueMode,
  SignalType,
  WorkoutMode,
} from "./types";

export const FIGHT_STYLES: {
  id: FightStyle;
  label: string;
  subtitle: string;
}[] = [
  { id: "muay-thai", label: "MUAY THAI", subtitle: "Rhythm & pressure" },
  { id: "boxing", label: "BOXING", subtitle: "Fast exchanges" },
  { id: "mma", label: "MMA", subtitle: "Unpredictable chaos" },
  { id: "kickboxing", label: "KICKBOXING", subtitle: "Dutch pressure" },
];

export const WORKOUT_MODES: {
  id: WorkoutMode;
  label: string;
  subtitle: string;
}[] = [
  {
    id: "solo",
    label: "SOLO REACT",
    subtitle: "Voice calls moves — attack, defend, move",
  },
  {
    id: "combos",
    label: "COMBO CALLS",
    subtitle: "Voice calls combinations to throw",
  },
];

export const STYLE_COMBOS: Record<FightStyle, ComboPreset[]> = {
  boxing: [
    { id: "1-2", label: "1-2", speak: "Jab, cross" },
    { id: "1-2-3", label: "1-2-3", speak: "Jab, cross, hook" },
    { id: "1-2-3-2", label: "1-2-3-2", speak: "Jab, cross, hook, cross" },
    { id: "2-3-2", label: "2-3-2", speak: "Cross, hook, cross" },
    { id: "1-1-2", label: "1-1-2", speak: "Double jab, cross" },
    { id: "3-2-3", label: "3-2-3", speak: "Hook, cross, hook" },
    { id: "1-2-body", label: "1-2-BODY", speak: "Jab, cross, body shot" },
    { id: "2-3", label: "2-3", speak: "Cross, hook" },
  ],
  "muay-thai": [
    { id: "jab-teep", label: "JAB-TEEP", speak: "Jab, teep" },
    { id: "1-2-kick", label: "1-2-KICK", speak: "Jab, cross, rear kick" },
    { id: "teep-hook", label: "TEEP-HOOK", speak: "Teep, hook" },
    { id: "elbow-knee", label: "ELBOW-KNEE", speak: "Elbow, knee" },
    { id: "1-kick", label: "1-KICK", speak: "Jab, low kick" },
    { id: "switch-kick", label: "SWITCH-KICK", speak: "Switch kick" },
    { id: "clinch-knee", label: "CLINCH-KNEE", speak: "Clinch, knee" },
    { id: "1-2-elbow", label: "1-2-ELBOW", speak: "Jab, cross, elbow" },
  ],
  mma: [
    { id: "1-2-shot", label: "1-2-SHOT", speak: "Jab, cross, level change" },
    { id: "1-kick-2", label: "1-KICK-2", speak: "Jab, kick, cross" },
    { id: "2-hook", label: "2-HOOK", speak: "Cross, hook" },
    { id: "jab-upper", label: "JAB-UPPER", speak: "Jab, uppercut" },
    { id: "kick-punch", label: "KICK-PUNCH", speak: "Body kick, cross" },
    { id: "1-2-knee", label: "1-2-KNEE", speak: "Jab, cross, knee" },
    { id: "feint-2", label: "FEINT-2", speak: "Feint, cross" },
    { id: "1-elbow", label: "1-ELBOW", speak: "Jab, elbow" },
  ],
  kickboxing: [
    { id: "1-2-low", label: "1-2-LOW", speak: "Jab, cross, low kick" },
    { id: "1-2-high", label: "1-2-HIGH", speak: "Jab, cross, high kick" },
    { id: "dutch-1", label: "DUTCH 1", speak: "Jab, cross, hook, low kick" },
    { id: "2-3-kick", label: "2-3-KICK", speak: "Cross, hook, kick" },
    { id: "1-kick-1", label: "1-KICK-1", speak: "Jab, kick, jab" },
    { id: "switch-2", label: "SWITCH-2", speak: "Switch kick, cross" },
    { id: "body-head", label: "BODY-HEAD", speak: "Body shot, head shot" },
    { id: "1-2-3-kick", label: "1-2-3-KICK", speak: "Jab, cross, hook, kick" },
  ],
};

export const SIGNAL_CUE_MODES: {
  id: SignalCueMode;
  label: string;
  subtitle: string;
}[] = [
  {
    id: "learn",
    label: "LEARN",
    subtitle: "Voice first, then beeps",
  },
  {
    id: "beeps",
    label: "BEEPS",
    subtitle: "Distinct tones only",
  },
  {
    id: "voice",
    label: "VOICE",
    subtitle: "Always call the move",
  },
];

export const DIFFICULTY_MODES: {
  id: "easy" | "hard" | "stadium";
  label: string;
  subtitle: string;
}[] = [
  { id: "easy", label: "EASY", subtitle: "Longer recovery" },
  { id: "hard", label: "HARD", subtitle: "Fight pace" },
  { id: "stadium", label: "STADIUM", subtitle: "Survive the chaos" },
];

export const SIGNAL_ONBOARDING: {
  type: SignalType;
  action: string;
  beepHint: string;
}[] = [
  { type: "attack", action: "Throw shots", beepHint: "Red flash" },
  { type: "defend", action: "Block or slip", beepHint: "Blue flash" },
  { type: "move", action: "Move your feet", beepHint: "Yellow flash" },
  { type: "burnout", action: "All-out sprint", beepHint: "White flash" },
  { type: "pressure", action: "Walk him down", beepHint: "Orange flash" },
  { type: "reset", action: "Breathe and reset", beepHint: "Green flash" },
];

export const SIGNAL_ACTIONS: Record<SignalType, string> = Object.fromEntries(
  SIGNAL_ONBOARDING.map((s) => [s.type, s.action])
) as Record<SignalType, string>;

export const CUE_STYLES: {
  id: CueStyle;
  label: string;
  subtitle: string;
}[] = [
  {
    id: "clear",
    label: "CLEAR",
    subtitle: "3 moves · voice calls every cue",
  },
  {
    id: "advanced",
    label: "ADVANCED",
    subtitle: "6 moves · distinct beep patterns",
  },
];

export const SIGNAL_CONFIG: Record<
  SignalType,
  {
    label: string;
    color: string;
    glow: string;
    bgFlash: string;
    shortLabel: string;
  }
> = {
  attack: {
    label: "ATTACK",
    color: "#ff1a1a",
    glow: "rgba(255, 26, 26, 0.6)",
    bgFlash: "rgba(255, 26, 26, 0.35)",
    shortLabel: "ATK",
  },
  defend: {
    label: "DEFEND",
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.6)",
    bgFlash: "rgba(59, 130, 246, 0.3)",
    shortLabel: "DEF",
  },
  move: {
    label: "MOVE",
    color: "#facc15",
    glow: "rgba(250, 204, 21, 0.6)",
    bgFlash: "rgba(250, 204, 21, 0.25)",
    shortLabel: "MOV",
  },
  burnout: {
    label: "BURNOUT",
    color: "#f5f5f5",
    glow: "rgba(255, 255, 255, 0.7)",
    bgFlash: "rgba(255, 255, 255, 0.2)",
    shortLabel: "SPR",
  },
  pressure: {
    label: "PRESSURE",
    color: "#ff4500",
    glow: "rgba(255, 69, 0, 0.6)",
    bgFlash: "rgba(255, 69, 0, 0.3)",
    shortLabel: "PRS",
  },
  reset: {
    label: "RESET",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.4)",
    bgFlash: "rgba(34, 197, 94, 0.15)",
    shortLabel: "RST",
  },
};

export const RHYTHM_ARCHETYPES: {
  id: RhythmArchetype;
  label: string;
  subtitle: string;
}[] = [
  {
    id: "muay-femur",
    label: "Muay Femur",
    subtitle: "Patient · technical · counter timing",
  },
  {
    id: "muay-mat",
    label: "Muay Mat",
    subtitle: "Relentless forward pressure",
  },
  {
    id: "muay-khao",
    label: "Muay Khao",
    subtitle: "Grinding clinch · nonstop pace",
  },
  {
    id: "counter-fighter",
    label: "Counter Fighter",
    subtitle: "Long reads · explosive reactions",
  },
  {
    id: "dutch-kickboxer",
    label: "Dutch Kickboxer",
    subtitle: "Volume combos · rhythm pressure",
  },
  {
    id: "mma",
    label: "MMA Pace",
    subtitle: "Unpredictable entries · feints",
  },
];

export const CHALLENGES: ChallengePreset[] = [
  {
    id: "bangkok-stadium",
    name: "Bangkok Stadium",
    tagline: "Can you survive?",
    style: "muay-thai",
    mode: "stadium",
    rhythmMode: "stadium-pace",
    rhythmArchetype: "muay-mat",
    rounds: { rounds: 5, roundLength: 180, restTime: 45 },
    featured: true,
  },
  {
    id: "pressure-fighter",
    name: "Pressure Nightmare",
    tagline: "No breathing room",
    style: "kickboxing",
    mode: "hard",
    rhythmMode: "pressure-nightmare",
    rhythmArchetype: "dutch-kickboxer",
    rounds: { rounds: 3, roundLength: 180, restTime: 30 },
    featured: true,
  },
  {
    id: "counter-sniper",
    name: "Counter Sniper",
    tagline: "React or get caught",
    style: "boxing",
    mode: "hard",
    rhythmMode: "counter-sniper",
    rhythmArchetype: "counter-fighter",
    rounds: { rounds: 3, roundLength: 120, restTime: 45 },
  },
  {
    id: "five-round-war",
    name: "Five Round War",
    tagline: "Championship distance",
    style: "muay-thai",
    mode: "hard",
    rhythmMode: "five-round-war",
    rhythmArchetype: "muay-femur",
    rounds: { rounds: 5, roundLength: 180, restTime: 60 },
  },
  {
    id: "last-round-hell",
    name: "Last Round Pressure",
    tagline: "Everything left",
    style: "mma",
    mode: "stadium",
    rhythmMode: "last-round-pressure",
    rhythmArchetype: "mma",
    rounds: { rounds: 1, roundLength: 300, restTime: 0 },
    featured: true,
  },
  {
    id: "technical-femur",
    name: "Technical Femur Flow",
    tagline: "Smart rhythm · sharp counters",
    style: "muay-thai",
    mode: "easy",
    rhythmMode: "technical-femur",
    rhythmArchetype: "muay-femur",
    rounds: { rounds: 3, roundLength: 180, restTime: 60 },
  },
  {
    id: "cardio-hell",
    name: "Cardio Hell",
    tagline: "Khao pace · no comfort",
    style: "muay-thai",
    mode: "hard",
    rhythmMode: "cardio-hell",
    rhythmArchetype: "muay-khao",
    rounds: { rounds: 4, roundLength: 180, restTime: 30 },
    featured: true,
  },
];

export const STYLE_SIGNAL_WEIGHTS: Record<
  FightStyle,
  Partial<Record<SignalType, number>>
> = {
  "muay-thai": {
    attack: 1.2,
    pressure: 1.3,
    defend: 1.0,
    move: 0.8,
    burnout: 0.9,
    reset: 0.7,
  },
  boxing: {
    attack: 1.1,
    move: 1.4,
    defend: 1.1,
    pressure: 1.0,
    burnout: 1.0,
    reset: 0.6,
  },
  mma: {
    attack: 1.0,
    defend: 1.2,
    move: 1.1,
    pressure: 1.1,
    burnout: 1.2,
    reset: 0.8,
  },
  kickboxing: {
    attack: 1.3,
    pressure: 1.4,
    defend: 0.9,
    move: 0.9,
    burnout: 1.0,
    reset: 0.5,
  },
};
