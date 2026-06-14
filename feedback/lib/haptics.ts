/** Light tap — status tick */
export function hapticTick(): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate(10);
}

/** Step change — short double pulse */
export function hapticStep(): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate([12, 36, 14]);
}

/** Analysis complete */
export function hapticSuccess(): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate([10, 40, 12, 40, 18]);
}
