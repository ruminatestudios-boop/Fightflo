import type { SignalType } from "./types";

/** Haptic patterns synced to premium audio envelopes */
const PATTERNS: Record<SignalType, number | number[]> = {
  attack: [12, 8, 28],
  defend: [18, 14, 18],
  move: [10, 12, 14],
  burnout: [35, 20, 35, 20, 45],
  pressure: [22, 12, 22, 12, 28],
  reset: [8, 24],
};

export function triggerHaptic(type: SignalType): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(PATTERNS[type]);
}

export function triggerCountdownHaptic(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(12);
}

export function triggerGoHaptic(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate([18, 10, 42]);
}

export function triggerRoundEndHaptic(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate([24, 40, 24]);
}

/** Short pulse when a bag hit is registered. */
export function triggerHitHaptic(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate([10, 6, 28]);
}
