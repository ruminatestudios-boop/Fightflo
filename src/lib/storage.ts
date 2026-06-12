import { DEFAULT_SETTINGS, type AppSettings } from "./types";
import type { FightStyle, RhythmArchetype } from "./types";
import { ensureArchetypeForStyle } from "./style-discipline";

const STORAGE_KEY = "fightflo-settings";
const ONBOARDING_KEY = "fightflo-onboarding-done";
const ONBOARDING_HERO_KEY = "fightflo-onboarding-hero-v4";
const SIGNALS_PREVIEW_KEY = "fightflo-signals-previewed";
const OPPONENT_USES_KEY = "fightflo-opponent-uses";

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function setOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function hasSeenOnboardingHero(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_HERO_KEY) === "true";
}

export function setOnboardingHeroSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_HERO_KEY, "true");
}

export function hasPreviewedSignals(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIGNALS_PREVIEW_KEY) === "true";
}

export function setSignalsPreviewed(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIGNALS_PREVIEW_KEY, "true");
}

export function getOpponentSessionUses(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(OPPONENT_USES_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function incrementOpponentSessionUses(): number {
  if (typeof window === "undefined") return 0;
  const next = getOpponentSessionUses() + 1;
  localStorage.setItem(OPPONENT_USES_KEY, String(next));
  return next;
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const style = (parsed.style ?? DEFAULT_SETTINGS.style) as FightStyle;
    const rhythmArchetype = ensureArchetypeForStyle(
      style,
      (parsed.rhythmArchetype ?? DEFAULT_SETTINGS.rhythmArchetype) as RhythmArchetype
    );
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      style,
      workoutMode: parsed.workoutMode ?? DEFAULT_SETTINGS.workoutMode,
      cueStyle: parsed.cueStyle ?? DEFAULT_SETTINGS.cueStyle,
      rhythmArchetype,
      rhythmMode: parsed.rhythmMode ?? DEFAULT_SETTINGS.rhythmMode,
      language: parsed.language ?? DEFAULT_SETTINGS.language,
      audio: { ...DEFAULT_SETTINGS.audio, ...parsed.audio },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}
