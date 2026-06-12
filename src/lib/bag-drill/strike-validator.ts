import type { BagStance } from "./calibration";
import type { BagCameraMode, BagCombo, BagDifficulty, BagStrike, StrikeValidation } from "./types";

export const MIN_HIT_CONFIDENCE = 0.75;

export type StrikeParseResult =
  | { kind: "confirmed"; strikeId: string; confidence?: number }
  | { kind: "hit"; strikeId: string; confidence?: number }
  | { kind: "wrong"; detail: string }
  | { kind: "miss" }
  | { kind: "punch" };

export function hitStrikes(combo: BagCombo): BagStrike[] {
  return combo.strikes.filter((s) => s.requiresHit);
}

export function expectedHits(combo: BagCombo): number {
  return combo.strikes.filter((s) => s.requiresHit).length;
}

export function comboWindowMs(
  combo: BagCombo,
  difficulty: BagDifficulty,
  scale = 1
): number {
  if (combo.isFreestyle) return (combo.freestyleSeconds ?? 10) * 1000;

  const hits = expectedHits(combo);
  const base =
    difficulty === "champion" ? 500 : difficulty === "fighter" ? 650 : 850;
  const perHit =
    difficulty === "champion" ? 320 : difficulty === "fighter" ? 400 : 500;
  return Math.round((base + hits * perHit) * scale);
}

export function buildBagDetectionPrompt(): string {
  return `You detect heavy bag impacts. Watch video AND listen to audio. When BOTH a sharp impact sound AND visible bag movement happen together, respond with only: PUNCH. Ignore swinging without impact. Ignore sounds without movement. Output nothing else.`;
}

export function buildFighterValidationPrompt(stance: BagStance = "orthodox"): string {
  const lead = stance === "southpaw" ? "right" : "left";
  const rear = stance === "southpaw" ? "left" : "right";
  return `You are an expert boxing coach watching a ${stance} fighter through a phone camera.

Lead hand is ${lead}, rear hand is ${rear}.

When you see the EXPECTED strike thrown with clear technique, respond:
HIT:[strike_id]:[confidence]

Examples: HIT:jab:0.92  HIT:cross:0.88  HIT:hook:0.85

confidence is 0.0–1.0 (only report HIT when confidence ≥ 0.75).

Strike definitions for ${stance}:
- jab = ${lead} hand straight
- cross = ${rear} hand straight
- hook = bent-arm horizontal from either hand
- body-shot = punch to torso
- kick = leg strike

Rules:
- Only call HIT for the strike you were told to expect RIGHT NOW.
- Wrong technique: WRONG:[brief detail]
- Full combo done: CONFIRMED:[combo_id]
- Nothing thrown: MISS
- ONE short line per event. No other text.`;
}

export function buildComboWatchTurn(combo: BagCombo): string {
  const sequence = combo.strikes
    .map((s) => `${s.id} (${s.label})`)
    .join(" → ");
  return `Combo ${combo.id} coming up: ${sequence}. Wait for per-strike cues.`;
}

/** Per-strike window — narrows what the model must detect. */
export function buildStrikeWatchTurn(
  strike: BagStrike,
  stance: BagStance,
  index: number,
  total: number
): string {
  const lead = stance === "southpaw" ? "right" : "left";
  const rear = stance === "southpaw" ? "left" : "right";
  const handHint =
    strike.id === "jab"
      ? `${lead} hand`
      : strike.id === "cross"
        ? `${rear} hand`
        : strike.label;
  return `NOW strike ${index + 1}/${total}: expect ONLY ${strike.id} (${strike.label}, ${handHint}). Respond HIT:${strike.id}:0.XX when clearly thrown. Ignore other strikes.`;
}

export function buildComboValidateTurn(combo: BagCombo): string {
  const sequence = combo.strikes
    .filter((s) => s.requiresHit)
    .map((s) => s.label)
    .join(", ");
  return `Did the fighter just complete combo ${combo.id} (${sequence}) in correct order? Respond CONFIRMED:${combo.id}, WRONG:[detail], or MISS.`;
}

export function parseStrikeResponse(text: string): StrikeParseResult | null {
  const t = text.trim();
  if (!t) return null;

  if (/\bPUNCH\b/i.test(t)) return { kind: "punch" };

  const hit = t.match(/\bHIT:\s*([a-z0-9-]+)(?::\s*([0-9.]+))?/i);
  if (hit) {
    const confidence = hit[2] != null ? parseFloat(hit[2]) : 0.85;
    if (!Number.isNaN(confidence) && confidence < MIN_HIT_CONFIDENCE) return null;
    return {
      kind: "hit",
      strikeId: hit[1].toLowerCase(),
      confidence: Number.isNaN(confidence) ? 0.85 : confidence,
    };
  }

  const confirmed = t.match(/CONFIRMED(?::\s*([a-z0-9-]+))?/i);
  if (confirmed) {
    return { kind: "confirmed", strikeId: (confirmed[1] ?? "combo").toLowerCase() };
  }

  const wrong = t.match(/WRONG:\s*(.+)/i);
  if (wrong) return { kind: "wrong", detail: wrong[1].trim() };

  if (/\bMISS\b/i.test(t)) return { kind: "miss" };

  return null;
}

/** Normalise model output to our strike ids (jab, cross, hook, body-shot, kick, …). */
export function normaliseStrikeId(raw: string): string {
  const id = raw.toLowerCase().trim();
  if (id.includes("jab")) return "jab";
  if (id.includes("cross") || id.includes("straight")) return "cross";
  if (id.includes("hook")) return "hook";
  if (id.includes("body")) return "body-shot";
  if (id.includes("kick")) return "kick";
  if (id.includes("upper")) return "uppercut";
  return id;
}

export function validateBagComboHits(hits: number, combo: BagCombo): StrikeValidation {
  const expected = expectedHits(combo);
  if (hits === 0) return "miss";
  if (hits >= expected) return "correct";
  // Allow one missed impact on multi-hit combos — mic often drops a strike in fast flow.
  if (expected > 1 && hits >= expected - 1) return "correct";
  return "wrong";
}

export function validateFighterComboResult(
  result: StrikeParseResult,
  combo: BagCombo
): StrikeValidation {
  if (result.kind === "confirmed") {
    return result.strikeId === combo.id || result.strikeId === "combo"
      ? "correct"
      : "wrong";
  }
  if (result.kind === "wrong") return "wrong";
  if (result.kind === "miss") return "miss";
  return null;
}

/** @deprecated single-strike */
export function buildValidateTurn(strike: BagStrike): string {
  return `Validate now. Expected strike_id: ${strike.id}. Expected technique: ${strike.label}.`;
}

/** @deprecated single-strike */
export function validationFromResult(
  result: StrikeParseResult,
  expected: BagStrike,
  cameraMode: BagCameraMode
): StrikeValidation {
  if (result.kind === "confirmed") {
    return result.strikeId === expected.id ? "correct" : "wrong";
  }
  if (result.kind === "wrong") return "wrong";
  if (result.kind === "miss") return "miss";
  if (result.kind === "punch" && cameraMode === "bag") return "correct";
  return null;
}
