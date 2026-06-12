import type { RhythmSegment } from "./types";

/** What real corners tell you to DO during quiet phases — not "wait". */
export const TRAINER_IDLE_ACTIONS: Record<RhythmSegment, string[]> = {
  reading: [
    "Feint and circle — find your range",
    "Light on your feet — hands up, head moving",
    "Probe with the jab — don't stand still",
    "Cut angles — he's reading you too",
  ],
  probing: [
    "Touch and go — jab, exit",
    "Feint the cross — snap the jab out",
    "Small steps — stay in range",
  ],
  pressure: [
    "Stay busy — don't let him settle",
    "Hands up — move your head",
    "Keep your feet underneath you",
  ],
  explosive: [
    "Hands ready — exchange coming",
    "Shell tight — fire back on the exit",
  ],
  counter: [
    "Feint him — draw the lead",
    "Patient — head off center",
  ],
  defensive: [
    "Shell and roll — circle off",
    "Block and move — don't freeze",
  ],
  reset: [
    "Shake out — light footwork",
    "Breathe — stay loose, keep moving",
  ],
  grind: [
    "Stay in the pocket — work the body",
    "Keep volume — don't rest standing",
  ],
  feint: [
    "Sell the fake — change level",
    "Head fake — then step out",
  ],
};

export const ROUND_OPEN_CUES = [
  "Move your feet — stay sharp",
  "Hands up — light on your toes",
  "Stay loose — don't stand still",
];

let idleHintIndex = 0;

export function getIdleActivityHint(
  segment: RhythmSegment | null | undefined,
  customCues?: string[] | null
): string {
  idleHintIndex += 1;
  if (customCues && customCues.length > 0) {
    return customCues[idleHintIndex % customCues.length];
  }
  const seg = segment ?? "reading";
  const pool = TRAINER_IDLE_ACTIONS[seg] ?? TRAINER_IDLE_ACTIONS.reading;
  return pool[idleHintIndex % pool.length];
}

export function getRoundOpenCue(customCues?: string[] | null): string {
  if (customCues && customCues.length > 0) {
    return customCues[0];
  }
  return ROUND_OPEN_CUES[idleHintIndex % ROUND_OPEN_CUES.length];
}

export function formatRhythmPreview(segments: RhythmSegment[]): string {
  const labels: Record<RhythmSegment, string> = {
    reading: "Feel-out",
    probing: "Probe",
    pressure: "Pressure",
    explosive: "Exchange",
    counter: "Counter",
    defensive: "Shell",
    reset: "Reset",
    grind: "Grind",
    feint: "Feint",
  };
  const collapsed: string[] = [];
  for (const seg of segments.slice(0, 10)) {
    const label = labels[seg];
    if (collapsed[collapsed.length - 1] !== label) collapsed.push(label);
  }
  return collapsed.join(" → ");
}
