const ANON_USER_KEY = "feedback_anon_user_id";
const USER_NAME_KEY = "feedback_user_name";
const INTRO_DISMISSED_KEY = "feedback_intro_dismissed";
const INTRO_DISMISSED_COOKIE = "feedback_intro_session";

/** In-memory only — survives report → home remounts, resets on full page load. */
let introDismissedThisJsSession = false;

function introCookiePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "/feedback";
}

/** Clear legacy persistence from older builds so it cannot skip the intro. */
export function purgeLegacyIntroPersistence(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(INTRO_DISMISSED_KEY);
  localStorage.removeItem(INTRO_DISMISSED_KEY);
  const path = introCookiePath();
  for (const name of [INTRO_DISMISSED_COOKIE, "feedback_intro_dismissed"]) {
    document.cookie = `${name}=; path=${path}; max-age=0; samesite=lax`;
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  }
}

/** True only after the user taps Get started this JS session (not on reload). */
export function isIntroDismissed(): boolean {
  return introDismissedThisJsSession;
}

export function markIntroDismissed(): void {
  introDismissedThisJsSession = true;
  purgeLegacyIntroPersistence();
}

export function clearIntroDismissed(): void {
  introDismissedThisJsSession = false;
  purgeLegacyIntroPersistence();
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ANON_USER_KEY);
}

export function storeUserId(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANON_USER_KEY, userId);
}

export function getStoredUserName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_NAME_KEY);
}

export function storeUserName(name: string | null): void {
  if (typeof window === "undefined") return;
  const trimmed = name?.trim();
  if (!trimmed) {
    localStorage.removeItem(USER_NAME_KEY);
    return;
  }
  localStorage.setItem(USER_NAME_KEY, trimmed);
}
