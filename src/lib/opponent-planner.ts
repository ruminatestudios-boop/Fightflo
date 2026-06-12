import type {
  AppSettings,
  DifficultyMode,
  FightStyle,
  RhythmArchetype,
  RhythmBlueprint,
  RhythmMode,
  RhythmSegment,
  RoundSettings,
} from "./types";
import { buildFightPatternScript, hashSeed } from "./fight-patterns";
import {
  getFighterRhythmScript,
} from "./fighter-profiles";
import { formatRhythmPreview } from "./idle-coaching";
import { resolveRhythmArchetype } from "./fight-rhythm-engine";

export type PlanSource = "local" | "gemini" | "preset";

export interface FighterIntel {
  /** How they fight — from AI search or preset */
  tendencies: string[];
  /** One-line pace read */
  pacing: string;
  /** Primary weapons / patterns */
  weapons: string[];
}

export interface OpponentSessionPlan {
  /** Name shown in UI (user input or matched fighter) */
  displayName: string;
  /** True when a known fighter preset matched */
  matchedPreset: boolean;
  /** local fallback vs Gemini + search */
  planSource: PlanSource;
  /** One-line style read */
  styleSummary: string;
  /** Specific intel surfaced on the plan screen */
  intel: FighterIntel;
  /** What to do during quiet / feel-out phases (trainer talk) */
  lowActivityCoaching: string[];
  /** Human-readable round rhythm e.g. Feel-out → Pressure → Exchange */
  rhythmPreview: string;
  /** What to focus on in solo work */
  gameplan: string[];
  /** Corner lines during pauses in the round */
  sessionCoachCues: string[];
  /** Shown on rest screen */
  restCue: string;
  /** Fight-realistic segment order + seeded timing */
  rhythmBlueprint: RhythmBlueprint;
  /** Settings patch applied before training */
  session: Pick<
    AppSettings,
    | "style"
    | "mode"
    | "workoutMode"
    | "rhythmArchetype"
    | "rhythmMode"
    | "rounds"
  >;
}

const VALID_SEGMENTS = new Set<RhythmSegment>([
  "reading",
  "probing",
  "pressure",
  "explosive",
  "counter",
  "defensive",
  "reset",
  "grind",
  "feint",
]);

export function buildRhythmBlueprint(
  archetype: RhythmArchetype,
  rhythmMode: RhythmMode,
  seedKey: string,
  customScript?: RhythmSegment[],
  fighterProfile = false
): RhythmBlueprint {
  const resolved = resolveRhythmArchetype(archetype, rhythmMode);
  const segmentScript =
    customScript?.filter((s) => VALID_SEGMENTS.has(s)) ??
    buildFightPatternScript(resolved, rhythmMode, 1, 3);
  return {
    segmentScript:
      segmentScript.length > 0
        ? segmentScript
        : buildFightPatternScript(resolved, rhythmMode, 1, 3),
    seed: hashSeed(seedKey),
    fighterProfile: fighterProfile || (customScript?.length ?? 0) > 0,
  };
}

interface FighterPreset {
  aliases: string[];
  displayName: string;
  styleSummary: string;
  intel?: FighterIntel;
  lowActivityCoaching?: string[];
  gameplan: string[];
  sessionCoachCues: string[];
  restCue: string;
  session: OpponentSessionPlan["session"];
}

const DEFAULT_LOW_ACTIVITY = [
  "Feint and circle — find range",
  "Snap the jab — touch and move",
  "Light on your feet — don't freeze",
  "Hands up — head on a swivel",
];

export function assemblePlan(
  fields: Omit<
    OpponentSessionPlan,
    "rhythmPreview" | "intel" | "lowActivityCoaching"
  > & {
    intel?: FighterIntel;
    lowActivityCoaching?: string[];
  }
): OpponentSessionPlan {
  return {
    ...fields,
    intel: fields.intel ?? {
      tendencies: fields.gameplan.slice(0, 3),
      pacing: fields.styleSummary,
      weapons: [],
    },
    lowActivityCoaching: fields.lowActivityCoaching ?? DEFAULT_LOW_ACTIVITY,
    rhythmPreview: formatRhythmPreview(fields.rhythmBlueprint.segmentScript),
  };
}

function planFromPreset(preset: FighterPreset): OpponentSessionPlan {
  const fighterScript = getFighterRhythmScript(preset.displayName);
  const blueprint = buildRhythmBlueprint(
    preset.session.rhythmArchetype,
    preset.session.rhythmMode,
    preset.displayName,
    fighterScript,
    true
  );
  return assemblePlan({
    displayName: preset.displayName,
    matchedPreset: true,
    planSource: "preset",
    styleSummary: preset.styleSummary,
    gameplan: preset.gameplan,
    sessionCoachCues: preset.sessionCoachCues,
    restCue: preset.restCue,
    session: preset.session,
    rhythmBlueprint: blueprint,
    ...(preset.intel ? { intel: preset.intel } : {}),
    ...(preset.lowActivityCoaching
      ? { lowActivityCoaching: preset.lowActivityCoaching }
      : {}),
  });
}

const FIGHTER_PRESETS: FighterPreset[] = [
  {
    aliases: ["rodtang", "rod tang", "iron man", "rodtang jitmuangnon"],
    displayName: "Rodtang",
    styleSummary: "Forward pressure, low guard traps, nonstop volume",
    intel: {
      tendencies: [
        "Walks forward with hands low — draws counters",
        "Blitzes in bursts then smothers in clinch range",
        "Wears you down with body kicks and volume",
      ],
      pacing: "Short feel-out → immediate forward pressure → nonstop volume waves",
      weapons: ["Low guard traps", "Body kick", "Inside boxing volume"],
    },
    lowActivityCoaching: [
      "Circle on the outside — don't back straight up",
      "Feint low — he's hunting the counter",
      "Light feet — he's about to walk you down",
    ],
    gameplan: [
      "Don't back up in a straight line — pivot out",
      "Shell tight when he blitzes, fire back on the exit",
      "Body shots slow his march forward",
    ],
    sessionCoachCues: [
      "He's walking you down — move your feet",
      "Shell up — volume is coming",
      "Don't freeze — hands up and exit",
      "He's not stopping — stay busy",
    ],
    restCue: "Water. Next round he pushes again — hands up first.",
    session: {
      style: "muay-thai",
      mode: "hard",
      workoutMode: "solo",
      rhythmArchetype: "muay-mat",
      rhythmMode: "pressure-nightmare",
      rounds: { rounds: 3, roundLength: 180, restTime: 45 },
    },
  },
  {
    aliases: ["saenchai", "sainchai", "saen chai"],
    displayName: "Saenchai",
    styleSummary: "Feints, angles, counters off your commitment",
    intel: {
      tendencies: [
        "Feints constantly — punishes overcommitment",
        "Switches stances and angles mid-exchange",
        "Counters off your missed shots",
      ],
      pacing: "Long reads → feint-heavy probes → sudden counters",
      weapons: ["Teep", "Switch kick", "Elbow from angles"],
    },
    lowActivityCoaching: [
      "Feint and exit — don't chase him",
      "Check the teep — stay off center",
      "Probe light — he's waiting to counter",
    ],
    gameplan: [
      "Don't chase — feint and exit at an angle",
      "Check the teep — don't bite on fakes",
      "Patient counters when he overcommits",
    ],
    sessionCoachCues: [
      "He's feinting — don't bite",
      "Cut angle — don't follow straight",
      "Patient — wait for the kick",
      "Stay off the center line",
    ],
    restCue: "He's tricky. Next round — head movement first.",
    session: {
      style: "muay-thai",
      mode: "hard",
      workoutMode: "solo",
      rhythmArchetype: "muay-femur",
      rhythmMode: "counter-sniper",
      rounds: { rounds: 3, roundLength: 180, restTime: 60 },
    },
  },
  {
    aliases: ["usyk", "oleksandr usyk", "alexander usyk"],
    displayName: "Usyk",
    styleSummary: "Movement, feints, punishes static feet",
    gameplan: [
      "Cut off the ring — don't chase him linear",
      "Feint to draw, then counter on his step",
      "Change levels — he switches head and body",
    ],
    sessionCoachCues: [
      "Cut the ring — don't follow straight",
      "Feint first — he's reading you",
      "Move your feet — static gets picked",
      "Head off center — wait for the step",
    ],
    restCue: "Breathe. Next round — angle changes, not straight lines.",
    session: {
      style: "boxing",
      mode: "hard",
      workoutMode: "solo",
      rhythmArchetype: "counter-fighter",
      rhythmMode: "counter-sniper",
      rounds: { rounds: 3, roundLength: 180, restTime: 60 },
    },
  },
  {
    aliases: ["tyson", "mike tyson", "iron mike"],
    displayName: "Mike Tyson",
    styleSummary: "Explosive pressure, head movement, hooks in bursts",
    gameplan: [
      "Don't get pinned on the ropes",
      "High guard when he dips — uppercuts come",
      "Clinch or pivot when he loads the hook",
    ],
    sessionCoachCues: [
      "Head movement — he's dipping",
      "Shell tight — hooks incoming",
      "Pivot out — don't eat on the ropes",
      "Stay off the ropes",
    ],
    restCue: "Shake out. Next round — don't let him pin you.",
    session: {
      style: "boxing",
      mode: "stadium",
      workoutMode: "solo",
      rhythmArchetype: "muay-mat",
      rhythmMode: "pressure-nightmare",
      rounds: { rounds: 3, roundLength: 180, restTime: 60 },
    },
  },
  {
    aliases: ["crawford", "terence crawford", "bud crawford"],
    displayName: "Terence Crawford",
    styleSummary: "Switch stance, sharp counters, punishes mistakes",
    gameplan: [
      "Track the stance switch — don't get surprised",
      "Jab to chest, don't reach on counters",
      "Exit after exchanges — he counters hard",
    ],
    sessionCoachCues: [
      "Watch the switch — stay balanced",
      "Jab the body — don't overreach",
      "Counter window — be patient",
      "Hands up after you throw",
    ],
    restCue: "Water. Next round — respect the switch.",
    session: {
      style: "boxing",
      mode: "hard",
      workoutMode: "solo",
      rhythmArchetype: "counter-fighter",
      rhythmMode: "default",
      rounds: { rounds: 3, roundLength: 180, restTime: 60 },
    },
  },
  {
    aliases: ["adesanya", "israel adesanya", "stylebender", "style bender"],
    displayName: "Israel Adesanya",
    styleSummary: "Distance control, feints, counters off reads",
    gameplan: [
      "Manage range — don't walk into the counter",
      "Feint to draw, kick on his step out",
      "Stay on the outside — don't brawl",
    ],
    sessionCoachCues: [
      "Manage distance — don't rush in",
      "Feint — he's reading your rhythm",
      "Stay outside — pick your shots",
      "Counter off his step",
    ],
    restCue: "Next round — range first, brawl never.",
    session: {
      style: "kickboxing",
      mode: "hard",
      workoutMode: "solo",
      rhythmArchetype: "muay-femur",
      rhythmMode: "technical-femur",
      rounds: { rounds: 3, roundLength: 180, restTime: 60 },
    },
  },
  {
    aliases: ["jon jones", "jones", "bones jones", "bones"],
    displayName: "Jon Jones",
    styleSummary: "Distance, oblique kicks, unpredictable entries",
    gameplan: [
      "Check the lead leg — don't eat oblique kicks",
      "Don't predict one rhythm — he changes levels",
      "Counter when he overextends on entries",
    ],
    sessionCoachCues: [
      "Check the leg — he's kicking",
      "Change levels — don't get predictable",
      "Stay long — manage distance",
      "Counter the entry",
    ],
    restCue: "Breathe. Next round — legs and distance.",
    session: {
      style: "mma",
      mode: "hard",
      workoutMode: "solo",
      rhythmArchetype: "mma",
      rhythmMode: "default",
      rounds: { rounds: 3, roundLength: 180, restTime: 60 },
    },
  },
  {
    aliases: ["buakaw", "buakaw banchamek", "banchamek"],
    displayName: "Buakaw",
    styleSummary: "Relentless kicks, forward pressure, teak shin rhythm",
    gameplan: [
      "Check low kicks early — he builds on them",
      "Don't trade in the pocket without exit plan",
      "Body kick slows his forward march",
    ],
    sessionCoachCues: [
      "Check the kick — he's building",
      "Shell and exit — don't trade blind",
      "Move your feet — pressure coming",
      "Hands up when he steps in",
    ],
    restCue: "Water. Next round — check kicks first.",
    session: {
      style: "muay-thai",
      mode: "hard",
      workoutMode: "solo",
      rhythmArchetype: "muay-mat",
      rhythmMode: "stadium-pace",
      rounds: { rounds: 3, roundLength: 180, restTime: 45 },
    },
  },
  {
    aliases: ["lomachenko", "loma", "vasyl lomachenko", "vasiliy lomachenko"],
    displayName: "Lomachenko",
    styleSummary: "Angles, footwork traps, counters off your miss",
    gameplan: [
      "Don't overthrow — he'll pivot off your miss",
      "Feint and probe — he punishes lazy entries",
      "Cut angles — he won't stay in front of you",
    ],
    sessionCoachCues: [
      "Don't overcommit — he'll pivot",
      "Feint and probe — stay measured",
      "Cut angles — he's gone from center",
      "Patient — wait for your read",
    ],
    restCue: "Next round — measured shots, not haymakers.",
    session: {
      style: "boxing",
      mode: "hard",
      workoutMode: "solo",
      rhythmArchetype: "counter-fighter",
      rhythmMode: "counter-sniper",
      rounds: { rounds: 3, roundLength: 180, restTime: 60 },
    },
  },
  {
    aliases: ["max holloway", "holloway", "blessed"],
    displayName: "Max Holloway",
    styleSummary: "Volume, pressure, body-head mix, never stops",
    gameplan: [
      "Shell when volume spikes — don't trade wild",
      "Body work slows his pace",
      "Move head off center — he finds the chin",
    ],
    sessionCoachCues: [
      "Volume coming — shell and move",
      "Head movement — he's finding angles",
      "Body shots — slow him down",
      "Stay busy — don't freeze",
    ],
    restCue: "Breathe. Next round — volume defense.",
    session: {
      style: "mma",
      mode: "hard",
      workoutMode: "solo",
      rhythmArchetype: "dutch-kickboxer",
      rhythmMode: "pressure-nightmare",
      rounds: { rounds: 4, roundLength: 180, restTime: 45 },
    },
  },
];

function normalize(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function matchPreset(input: string): FighterPreset | null {
  const q = normalize(input);
  if (!q) return null;

  for (const preset of FIGHTER_PRESETS) {
    for (const alias of preset.aliases) {
      const a = normalize(alias);
      if (q === a || q.includes(a) || a.includes(q)) {
        return preset;
      }
    }
  }
  return null;
}

type StyleHint = {
  keywords: RegExp;
  style: FightStyle;
  archetype: RhythmArchetype;
  rhythmMode: RhythmMode;
  mode: DifficultyMode;
  summary: string;
  gameplan: string[];
  cues: string[];
};

const STYLE_HINTS: StyleHint[] = [
  {
    keywords: /pressure|aggressive|forward|swarmer|matador|walk forward|volume/,
    style: "muay-thai",
    archetype: "muay-mat",
    rhythmMode: "pressure-nightmare",
    mode: "hard",
    summary: "Forward pressure — high volume, walks you down",
    gameplan: [
      "Don't back up straight — pivot and shell",
      "Stay busy when pressured — don't freeze",
      "Counter on his step in",
    ],
    cues: [
      "He's pressing — move your feet",
      "Shell up — volume coming",
      "Don't stand still",
    ],
  },
  {
    keywords: /counter|elusive|feint|technical|sniper|patient|femur/,
    style: "boxing",
    archetype: "counter-fighter",
    rhythmMode: "counter-sniper",
    mode: "hard",
    summary: "Counter-heavy — reads you, punishes mistakes",
    gameplan: [
      "Feint before you commit",
      "Don't chase — cut angles",
      "Patient — wait for the opening",
    ],
    cues: [
      "Patient — he's reading you",
      "Feint first — don't rush",
      "Cut angle on the exit",
    ],
  },
  {
    keywords: /dutch|kickbox|kick boxing|low kick|combo/,
    style: "kickboxing",
    archetype: "dutch-kickboxer",
    rhythmMode: "default",
    mode: "hard",
    summary: "Dutch pace — combos and kick pressure",
    gameplan: [
      "Check kicks early",
      "Shell between exchanges",
      "Return fire on the exit",
    ],
    cues: [
      "Check the kick",
      "Hands up between combos",
      "Exit at an angle",
    ],
  },
  {
    keywords: /mma|wrestl|grappl|mixed/,
    style: "mma",
    archetype: "mma",
    rhythmMode: "default",
    mode: "hard",
    summary: "Mixed rhythm — level changes and unpredictable entries",
    gameplan: [
      "Sprawl on level changes",
      "Manage distance — don't get trapped",
      "Counter off his entries",
    ],
    cues: [
      "Level change — sprawl ready",
      "Stay long — manage distance",
      "Hands up on the entry",
    ],
  },
  {
    keywords: /southpaw|left hand|orthodox/,
    style: "boxing",
    archetype: "counter-fighter",
    rhythmMode: "default",
    mode: "hard",
    summary: "Stance matchup — jab battles and angle changes",
    gameplan: [
      "Win the jab battle first",
      "Foot on the outside of lead foot",
      "Don't cross feet when pivoting",
    ],
    cues: [
      "Win the jab — stay outside",
      "Pivot off the lead foot",
      "Don't cross your feet",
    ],
  },
];

const DEFAULT_ROUNDS: RoundSettings = {
  rounds: 3,
  roundLength: 180,
  restTime: 60,
};

function buildFallbackPlan(input: string): OpponentSessionPlan {
  const q = normalize(input);
  const hint = STYLE_HINTS.find((h) => h.keywords.test(q));

  if (hint) {
    const name = input.trim() || "Custom opponent";
    const session = {
      style: hint.style,
      mode: hint.mode,
      workoutMode: "solo" as const,
      rhythmArchetype: hint.archetype,
      rhythmMode: hint.rhythmMode,
      rounds: DEFAULT_ROUNDS,
    };
    return assemblePlan({
      displayName: name,
      matchedPreset: false,
      planSource: "local",
      styleSummary: hint.summary,
      gameplan: hint.gameplan,
      sessionCoachCues: hint.cues,
      restCue: "Water. Same rhythm next round — stay disciplined.",
      rhythmBlueprint: buildRhythmBlueprint(
        hint.archetype,
        hint.rhythmMode,
        name
      ),
      session,
    });
  }

  const session = {
    style: "muay-thai" as FightStyle,
    mode: "hard" as DifficultyMode,
    workoutMode: "solo" as const,
    rhythmArchetype: "muay-femur" as RhythmArchetype,
    rhythmMode: "default" as RhythmMode,
    rounds: DEFAULT_ROUNDS,
  };
  return assemblePlan({
    displayName: input.trim() || "Unknown style",
    matchedPreset: false,
    planSource: "local",
    styleSummary: "Balanced rhythm — react to pressure and counters",
    gameplan: [
      "Hands up — react to every cue",
      "Move your feet between exchanges",
      "Don't freeze in silence — stay active",
    ],
    sessionCoachCues: [
      "Stay active — you're not resting",
      "Hands up — wait for the cue",
      "Move your feet",
      "Cut angles",
    ],
    restCue: "Breathe. Next round — same focus.",
    rhythmBlueprint: buildRhythmBlueprint(
      session.rhythmArchetype,
      session.rhythmMode,
      input.trim() || "default"
    ),
    session,
  });
}

/**
 * Build a solo training session from a fighter name or style description.
 * Runs entirely on-device — no API keys or network calls.
 */
export function buildOpponentSession(input: string): OpponentSessionPlan {
  const trimmed = input.trim();
  if (!trimmed) {
    return buildFallbackPlan("");
  }

  const preset = matchPreset(trimmed);
  if (preset) {
    return planFromPreset(preset);
  }

  return buildFallbackPlan(trimmed);
}

/** Example names for the UI — no network required */
export const OPPONENT_EXAMPLES = [
  "Rodtang",
  "Saenchai",
  "Usyk",
  "Pressure southpaw",
] as const;
