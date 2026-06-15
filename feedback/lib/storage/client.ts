const ANON_USER_KEY = "feedback_anon_user_id";
const USER_NAME_KEY = "feedback_user_name";
const INTRO_DISMISSED_KEY = "feedback_intro_dismissed";
const INTRO_DISMISSED_COOKIE = "feedback_intro_session";

function introCookiePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "/feedback";
}

function hasIntroDismissedCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const [name, value] = part.trim().split("=");
    return name === INTRO_DISMISSED_COOKIE && value === "1";
  });
}

/** Dismissed for this browser session only — intro shows again on next visit. */
export function isIntroDismissed(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(INTRO_DISMISSED_KEY) === "1") return true;
  return hasIntroDismissedCookie();
}

export function markIntroDismissed(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(INTRO_DISMISSED_KEY, "1");
  document.cookie = `${INTRO_DISMISSED_COOKIE}=1; path=${introCookiePath()}; samesite=lax`;
}

export function clearIntroDismissed(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(INTRO_DISMISSED_KEY);
  localStorage.removeItem(INTRO_DISMISSED_KEY);
  const path = introCookiePath();
  for (const name of [INTRO_DISMISSED_COOKIE, "feedback_intro_dismissed"]) {
    document.cookie = `${name}=; path=${path}; max-age=0; samesite=lax`;
  }
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
