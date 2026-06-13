const KEY = "fightflo-coming-soon";

export type ComingSoonTrigger = "session_end" | "first_visit" | "locked_mode";

export interface ComingSoonStorage {
  comingSoonEmailCaptured: boolean;
  capturedAt?: string;
  capturedEmail?: string;
  /** YYYY-MM-DD — last day the banner was shown */
  lastBannerShownAt?: string;
  hasVisitedBagHome: boolean;
  /** Waitlist modal already shown or dismissed — do not show again */
  comingSoonModalShown: boolean;
}

const DEFAULT: ComingSoonStorage = {
  comingSoonEmailCaptured: false,
  hasVisitedBagHome: false,
  comingSoonModalShown: false,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadComingSoonStorage(): ComingSoonStorage {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) } as ComingSoonStorage;
  } catch {
    return { ...DEFAULT };
  }
}

export function saveComingSoonStorage(
  patch: Partial<ComingSoonStorage>
): ComingSoonStorage {
  const next = { ...loadComingSoonStorage(), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function isComingSoonEmailCaptured(): boolean {
  return loadComingSoonStorage().comingSoonEmailCaptured;
}

export function markComingSoonEmailCaptured(email: string): ComingSoonStorage {
  return saveComingSoonStorage({
    comingSoonEmailCaptured: true,
    comingSoonModalShown: true,
    capturedEmail: email.trim().toLowerCase(),
    capturedAt: new Date().toISOString(),
  });
}

export function markComingSoonModalShown(): ComingSoonStorage {
  return saveComingSoonStorage({ comingSoonModalShown: true });
}

/** Show waitlist modal at most once per device (until email captured). */
export function shouldShowComingSoonModal(): boolean {
  if (isComingSoonEmailCaptured()) return false;
  return !loadComingSoonStorage().comingSoonModalShown;
}

export function markComingSoonBannerShown(): ComingSoonStorage {
  return saveComingSoonStorage({ lastBannerShownAt: todayKey() });
}

export function markBagHomeVisited(): ComingSoonStorage {
  return saveComingSoonStorage({ hasVisitedBagHome: true });
}

export function wasBannerShownToday(): boolean {
  return loadComingSoonStorage().lastBannerShownAt === todayKey();
}

/** Max one banner per day; skip if email already on waitlist. */
export function shouldShowComingSoonBanner(): boolean {
  if (isComingSoonEmailCaptured()) return false;
  if (wasBannerShownToday()) return false;
  return true;
}
