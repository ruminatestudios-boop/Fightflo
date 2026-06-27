import type { ShadowPositiveType, ShadowWeaknessType } from "@/lib/shadow/shadowboxingCopy";

export type SoundCategory = "guard" | "head" | "elbow" | "core" | "positive";

const EVENT_TYPE_TO_CATEGORY: Record<ShadowWeaknessType | ShadowPositiveType, SoundCategory> = {
  guard_drop_after_cross: "guard",
  slow_guard_return: "guard",
  quick_guard_return: "positive",
  chin_up: "head",
  chin_stayed_down: "positive",
  elbow_flare_on_cross: "elbow",
  elbow_tucked: "positive",
  flat_hips: "core",
  stance_drift: "core",
  good_hip_turn: "positive",
};

export function soundCategoryForEventType(
  eventType: ShadowWeaknessType | ShadowPositiveType
): SoundCategory {
  return EVENT_TYPE_TO_CATEGORY[eventType] ?? "guard";
}

export const SOUND_LEGEND: { category: SoundCategory; label: string; description: string }[] = [
  { category: "guard", label: "Guard", description: "A low buzz — your hands dropped or were slow back to guard." },
  { category: "head", label: "Head position", description: "A sharp ping — your chin lifted and got exposed." },
  { category: "elbow", label: "Elbow", description: "Two quick beeps — your elbow flared wide on a punch." },
  { category: "core", label: "Hips & stance", description: "A falling tone — flat hips on a punch, or your stance drifted." },
  { category: "positive", label: "Good moment", description: "A rising chime — something you did well just got picked up." },
];

let cachedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (cachedContext) return cachedContext;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  cachedContext = new Ctor();
  return cachedContext;
}

function playTone(freq: number, startOffsetMs: number, durationMs: number, ctx: AudioContext) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.value = freq;
  oscillator.type = "sine";
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const startTime = ctx.currentTime + startOffsetMs / 1000;
  const endTime = startTime + durationMs / 1000;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);
}

/** Synthesized tones — no audio assets to host, each category sounds distinct. */
export function playCoachingSound(category: SoundCategory): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  switch (category) {
    case "guard":
      playTone(220, 0, 180, ctx);
      break;
    case "head":
      playTone(1000, 0, 120, ctx);
      break;
    case "elbow":
      playTone(520, 0, 90, ctx);
      playTone(520, 130, 90, ctx);
      break;
    case "core":
      playTone(500, 0, 110, ctx);
      playTone(320, 110, 140, ctx);
      break;
    case "positive":
      playTone(440, 0, 100, ctx);
      playTone(660, 100, 160, ctx);
      break;
  }
}
