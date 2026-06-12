/** Map combo.speak strings from combos.ts to pre-generated audio files */

function normalizeSpeak(text: string, prefix?: string): string {
  let t = text.trim().toLowerCase();
  if (prefix) {
    const p = prefix.trim().toLowerCase();
    if (p.includes("again")) return `again::${t}`;
    t = `${p}${t}`;
  }
  return t
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/\s+/g, " ");
}

const SPEAK_TO_FILE: Record<string, string> = {
  "jab, cross": "combo-1-2.mp3",
  "jab, jab": "combo-double-jab.mp3",
  "jab, body shot": "combo-1-2-body.mp3",
  "cross, hook": "combo-cross-hook.mp3",
  "jab, jab, cross": "combo-double-jab-cross.mp3",
  "jab, cross, hook": "combo-jab-cross-hook.mp3",
  "body shot, head shot": "combo-body-head.mp3",
  "jab, slip, cross": "combo-jab-slip-cross.mp3",
  "lead hook, cross, hook": "combo-lead-hook-cross-hook.mp3",
  "jab, cross, hook, kick": "combo-1-2-3-kick.mp3",
  "jab, cross, hook, low kick": "combo-1-2-3-low-kick.mp3",
  "jab, cross, rear kick": "combo-1-2-rear-kick.mp3",
  "freestyle — ten seconds": "combo-freestyle.mp3",
  "jab, roll, cross, hook": "combo-jab-roll-cross-hook.mp3",
  "slip, jab, cross": "combo-slip-jab-cross.mp3",
  "duck, body shot, cross": "combo-duck-body-cross.mp3",
  go: "combo-go.mp3",
  "flurry — 15 seconds": "combo-flurry.mp3",
  "flurry — 30 seconds": "combo-flurry.mp3",
  "flurry — 60 seconds": "combo-flurry.mp3",
};

export function resolveComboAudio(speak: string, prefix?: string): string {
  const key = normalizeSpeak(speak, prefix);
  if (key.startsWith("again::")) {
    return "combo-again.mp3";
  }
  if (key.includes("flurry")) return "combo-flurry.mp3";
  return SPEAK_TO_FILE[key] ?? "combo-1-2.mp3";
}
