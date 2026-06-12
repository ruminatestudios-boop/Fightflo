import type { TimerConfig } from "./types";
import { DEFAULT_TIMER_CONFIG } from "./types";

const KEY = "fightflo-timer-config";

export function loadTimerConfig(): TimerConfig {
  if (typeof window === "undefined") return { ...DEFAULT_TIMER_CONFIG };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_TIMER_CONFIG };
    return { ...DEFAULT_TIMER_CONFIG, ...JSON.parse(raw) } as TimerConfig;
  } catch {
    return { ...DEFAULT_TIMER_CONFIG };
  }
}

export function saveTimerConfig(config: TimerConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(config));
}
