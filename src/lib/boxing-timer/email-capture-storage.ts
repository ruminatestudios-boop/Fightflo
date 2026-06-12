import { loadTimerUpsellStats } from "@/lib/boxing-timer/upsell-storage";
import { loadStoredCalibration } from "@/lib/bag-drill/detection/calibration-store";

const KEY = "fightflo-timer-email";

export type EmailCaptureSource = "post_session" | "banner" | "round3";

export interface TimerEmailStorage {
  emailCaptured: boolean;
  hasSeenBanner: boolean;
  capturedEmail?: string;
}

const DEFAULT: TimerEmailStorage = {
  emailCaptured: false,
  hasSeenBanner: false,
};

export function loadTimerEmailStorage(): TimerEmailStorage {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) } as TimerEmailStorage;
  } catch {
    return { ...DEFAULT };
  }
}

export function saveTimerEmailStorage(
  patch: Partial<TimerEmailStorage>
): TimerEmailStorage {
  const next = { ...loadTimerEmailStorage(), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function isEmailCaptured(): boolean {
  return loadTimerEmailStorage().emailCaptured;
}

export function markEmailCaptured(email: string): TimerEmailStorage {
  return saveTimerEmailStorage({
    emailCaptured: true,
    capturedEmail: email.trim().toLowerCase(),
  });
}

export function markBannerDismissed(): TimerEmailStorage {
  return saveTimerEmailStorage({ hasSeenBanner: true });
}

/** Skip email prompts for fighters already on FlowBag */
export function hasUsedFlowBag(): boolean {
  if (typeof window === "undefined") return false;

  if (loadTimerUpsellStats().clickedFlowBag) return true;

  try {
    if (loadStoredCalibration()) return true;

    const raw = localStorage.getItem("flowbag-free-sessions");
    if (raw) {
      const parsed = JSON.parse(raw) as { count?: number };
      if (typeof parsed.count === "number" && parsed.count > 0) return true;
    }
  } catch {
    /* ignore */
  }

  return false;
}

export function shouldShowEmailCapture(isPro: boolean): boolean {
  return !isPro && !isEmailCaptured() && !hasUsedFlowBag();
}
