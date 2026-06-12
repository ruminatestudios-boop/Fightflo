import type { BagCalibration } from "../calibration";
import { CALIBRATION_TTL_MS } from "./constants";
import type { GuardBaseline } from "./guard-monitor";

const STORAGE_KEY = "flowbag-calibration-v2";

export interface StoredCalibration extends BagCalibration {
  guardBaseline?: GuardBaseline;
  savedAt: number;
}

export function loadStoredCalibration(): BagCalibration | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCalibration;
    if (Date.now() - parsed.savedAt > CALIBRATION_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const { savedAt: _, ...cal } = parsed;
    return cal;
  } catch {
    return null;
  }
}

export function saveCalibration(cal: BagCalibration & { guardBaseline?: GuardBaseline }): void {
  if (typeof sessionStorage === "undefined") return;
  const stored: StoredCalibration = { ...cal, savedAt: Date.now() };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}
