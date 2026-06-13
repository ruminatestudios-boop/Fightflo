import type { BagCombo, BagDifficulty, BagStrike } from "./types";

function hit(id: string, label: string, speak?: string): BagStrike {
  return { id, label, speak: speak ?? label, requiresHit: true };
}

function move(id: string, label: string, speak?: string): BagStrike {
  return { id, label, speak: speak ?? label, requiresHit: false };
}

/** Speak every strike in order so the call matches the hit count. */
function makeCombo(
  id: string,
  label: string,
  strikes: BagStrike[],
  extra?: Partial<Pick<BagCombo, "isDefensive" | "isFreestyle" | "freestyleSeconds" | "speak">>
): BagCombo {
  return {
    id,
    label,
    speak: extra?.speak ?? strikes.map((s) => s.speak).join(", "),
    strikes,
    ...extra,
  };
}

export const BAG_COMBOS: Record<BagDifficulty, BagCombo[]> = {
  beginner: [
    makeCombo("jab-cross", "Jab, Cross", [
      hit("jab", "JAB", "Jab"),
      hit("cross", "CROSS", "Cross"),
    ]),
    makeCombo("double-jab", "Double Jab", [
      hit("jab", "JAB", "Jab"),
      hit("jab", "JAB", "Jab"),
    ]),
    makeCombo("jab-body", "Jab, Body Shot", [
      hit("jab", "JAB", "Jab"),
      hit("body-shot", "BODY SHOT", "Body shot"),
    ]),
    makeCombo("cross-hook", "Cross, Hook", [
      hit("cross", "CROSS", "Cross"),
      hit("hook", "HOOK", "Hook"),
    ]),
    makeCombo("two-jabs-cross", "Two Jabs, Cross", [
      hit("jab", "JAB", "Jab"),
      hit("jab", "JAB", "Jab"),
      hit("cross", "CROSS", "Cross"),
    ]),
  ],
  fighter: [
    makeCombo("jab-cross-hook", "Jab, Cross, Hook", [
      hit("jab", "JAB", "Jab"),
      hit("cross", "CROSS", "Cross"),
      hit("hook", "HOOK", "Hook"),
    ]),
    makeCombo("double-jab-cross", "Double Jab, Cross", [
      hit("jab", "JAB", "Jab"),
      hit("jab", "JAB", "Jab"),
      hit("cross", "CROSS", "Cross"),
    ]),
    makeCombo("body-head", "Body Shot, Head Shot", [
      hit("body-shot", "BODY SHOT", "Body shot"),
      hit("hook", "HEAD SHOT", "Head shot"),
    ]),
    makeCombo(
      "jab-slip-cross",
      "Jab, Slip, Cross",
      [
        hit("jab", "JAB", "Jab"),
        move("slip", "SLIP", "Slip"),
        hit("cross", "CROSS", "Cross"),
      ],
      { isDefensive: true }
    ),
    makeCombo("lead-hook-cross-hook", "Lead Hook, Cross, Hook", [
      hit("hook", "LEAD HOOK", "Lead hook"),
      hit("cross", "CROSS", "Cross"),
      hit("hook", "HOOK", "Hook"),
    ]),
  ],
  champion: [
    makeCombo("jab-cross-hook-kick", "Jab, Cross, Hook, Kick", [
      hit("jab", "JAB", "Jab"),
      hit("cross", "CROSS", "Cross"),
      hit("hook", "HOOK", "Hook"),
      hit("round-kick", "KICK", "Kick"),
    ]),
    makeCombo("three-punch-low-kick", "Jab, Cross, Hook, Low Kick", [
      hit("jab", "JAB", "Jab"),
      hit("cross", "CROSS", "Cross"),
      hit("hook", "HOOK", "Hook"),
      hit("low-kick", "LOW KICK", "Low kick"),
    ]),
    makeCombo("jab-cross-rear-kick", "Jab, Cross, Rear Kick", [
      hit("jab", "JAB", "Jab"),
      hit("cross", "CROSS", "Cross"),
      hit("rear-kick", "REAR KICK", "Rear kick"),
    ]),
    makeCombo(
      "freestyle-10",
      "Freestyle 10 seconds",
      [move("freestyle", "FREESTYLE", "Go")],
      { isFreestyle: true, freestyleSeconds: 10, speak: "Freestyle — ten seconds" }
    ),
    makeCombo("jab-roll-cross-hook", "Jab, Roll, Cross, Hook", [
      hit("jab", "JAB", "Jab"),
      move("roll", "ROLL", "Roll"),
      hit("cross", "CROSS", "Cross"),
      hit("hook", "HOOK", "Hook"),
    ]),
    makeCombo(
      "slip-jab-cross",
      "SLIP — Jab, Cross",
      [
        move("slip", "SLIP", "Slip"),
        hit("jab", "JAB", "Jab"),
        hit("cross", "CROSS", "Cross"),
      ],
      { isDefensive: true }
    ),
    makeCombo(
      "duck-body-cross",
      "DUCK — Body Shot, Cross",
      [
        move("duck", "DUCK", "Duck"),
        hit("body-shot", "BODY SHOT", "Body shot"),
        hit("cross", "CROSS", "Cross"),
      ],
      { isDefensive: true }
    ),
  ],
};

/** Single punches and short pairs for punch-speed drill. */
export const SPEED_COMBOS: BagCombo[] = [
  makeCombo("speed-jab", "Jab", [hit("jab", "JAB", "Jab")]),
  makeCombo("speed-cross", "Cross", [hit("cross", "CROSS", "Cross")]),
  makeCombo("speed-hook", "Hook", [hit("hook", "HOOK", "Hook")]),
  makeCombo("speed-body", "Body shot", [hit("body-shot", "BODY SHOT", "Body shot")]),
  makeCombo("speed-jab-cross", "Jab, Cross", [
    hit("jab", "JAB", "Jab"),
    hit("cross", "CROSS", "Cross"),
  ]),
  makeCombo("speed-cross-hook", "Cross, Hook", [
    hit("cross", "CROSS", "Cross"),
    hit("hook", "HOOK", "Hook"),
  ]),
];

export const DIFFICULTY_REST_MS: Record<BagDifficulty, number> = {
  beginner: 10_000,
  fighter: 5_000,
  champion: 3_000,
};

export const DIFFICULTY_SPEECH_RATE: Record<BagDifficulty, number> = {
  beginner: 0.85,
  fighter: 1.0,
  champion: 1.15,
};

export function defensiveCallChance(difficulty: BagDifficulty): number {
  if (difficulty === "beginner") return 0;
  if (difficulty === "fighter") return 0.2;
  return 0.35;
}

export function championMidSetSwapChance(): number {
  return 0.15;
}
