import type { RhythmSegment } from "./types";

/**
 * Researched round scripts — how each fighter's rounds actually flow.
 * Used instead of random segment picking for opponent sessions.
 */
export const FIGHTER_RHYTHM_SCRIPTS: Record<string, RhythmSegment[]> = {
  Rodtang: [
    "reading",
    "pressure",
    "grind",
    "pressure",
    "explosive",
    "grind",
    "pressure",
    "explosive",
    "grind",
    "pressure",
  ],
  Saenchai: [
    "reading",
    "reading",
    "feint",
    "probing",
    "counter",
    "reset",
    "feint",
    "probing",
    "counter",
    "feint",
  ],
  Usyk: [
    "reading",
    "probing",
    "feint",
    "probing",
    "counter",
    "reading",
    "pressure",
    "counter",
    "reset",
    "probing",
  ],
  "Mike Tyson": [
    "reading",
    "pressure",
    "explosive",
    "reset",
    "pressure",
    "explosive",
    "grind",
    "explosive",
    "pressure",
    "explosive",
  ],
  "Terence Crawford": [
    "reading",
    "probing",
    "counter",
    "feint",
    "counter",
    "reading",
    "pressure",
    "counter",
    "reset",
    "counter",
  ],
  "Israel Adesanya": [
    "reading",
    "feint",
    "probing",
    "counter",
    "reading",
    "feint",
    "pressure",
    "counter",
    "reset",
    "feint",
  ],
  "Jon Jones": [
    "reading",
    "probing",
    "pressure",
    "feint",
    "counter",
    "reading",
    "pressure",
    "defensive",
    "counter",
    "pressure",
  ],
  Buakaw: [
    "reading",
    "pressure",
    "grind",
    "pressure",
    "explosive",
    "grind",
    "pressure",
    "grind",
    "explosive",
    "pressure",
  ],
  Lomachenko: [
    "reading",
    "feint",
    "probing",
    "counter",
    "reset",
    "feint",
    "probing",
    "counter",
    "reading",
    "counter",
  ],
  "Max Holloway": [
    "probing",
    "pressure",
    "grind",
    "pressure",
    "explosive",
    "grind",
    "pressure",
    "grind",
    "explosive",
    "grind",
  ],
};

/** Corner talk tied to what THIS fighter is doing in each phase */
export const FIGHTER_SEGMENT_COACHING: Record<
  string,
  Partial<Record<RhythmSegment, string[]>>
> = {
  Rodtang: {
    reading: [
      "Circle out — he's about to march forward",
      "Hands high — low guard trap coming",
    ],
    pressure: [
      "Pivot — don't back straight up",
      "Shell tight — volume wave incoming",
      "Body shots — slow the march",
    ],
    grind: [
      "Stay busy — he won't stop punching",
      "Clinch break mindset — keep moving",
    ],
    explosive: [
      "Blitz coming — shell and fire back",
      "Don't freeze — hands up and exit",
    ],
  },
  Saenchai: {
    reading: [
      "Don't chase — he's feinting",
      "Check the teep — stay off center",
    ],
    feint: [
      "Don't bite on the fake",
      "Feint back — make him commit first",
    ],
    probing: [
      "Probe light — he's countering",
      "Small steps — he switches angles",
    ],
    counter: [
      "Patient — wait for overcommit",
      "Head off line — counter window",
    ],
  },
  Usyk: {
    reading: [
      "Cut the ring — don't follow straight",
      "Feint first — he's reading you",
    ],
    probing: [
      "Jab to chest — don't reach",
      "Move your feet — static gets picked",
    ],
    feint: [
      "Sell nothing — he's feinting too",
      "Counter on his step out",
    ],
    counter: [
      "Head off center — wait for the step",
      "Don't overthrow — he'll pivot",
    ],
  },
  "Mike Tyson": {
    reading: [
      "Stay off the ropes — he's stalking",
      "High guard — he's dipping inside",
    ],
    pressure: [
      "Pivot out — don't get pinned",
      "Shell tight — hooks incoming",
    ],
    explosive: [
      "Explosive burst — cover and exit",
      "Clinch or pivot — don't trade",
    ],
  },
  Buakaw: {
    reading: [
      "Check the lead leg early",
      "Circle — kicks are building",
    ],
    pressure: [
      "Check and counter — don't trade blind",
      "Body kick slows his march",
    ],
    grind: [
      "Teak shin rhythm — stay composed",
      "Shell and exit the pocket",
    ],
  },
  Lomachenko: {
    reading: [
      "Measured shots — he'll pivot off misses",
      "Feint and probe — don't overcommit",
    ],
    feint: [
      "Don't chase the angle",
      "Stay centered — he disappears",
    ],
    counter: [
      "Patient — wait for your read",
      "Cut angles — he won't stay front",
    ],
  },
  "Max Holloway": {
    pressure: [
      "Volume coming — shell and move",
      "Head movement — he finds angles",
    ],
    grind: [
      "Body work — slow his pace",
      "Stay busy — never stop moving",
    ],
    explosive: [
      "Exchange burst — tight defense",
      "Fire back on the exit",
    ],
  },
};

export function getFighterRhythmScript(displayName: string): RhythmSegment[] | undefined {
  return FIGHTER_RHYTHM_SCRIPTS[displayName];
}

export function getFighterSegmentCoaching(
  displayName: string
): Partial<Record<RhythmSegment, string[]>> | undefined {
  return FIGHTER_SEGMENT_COACHING[displayName];
}
