const ANON_USER_KEY = "feedback_anon_user_id";
const USER_NAME_KEY = "feedback_user_name";
const CREW_TOKEN_KEY = "feedback_crew_token";
const AFFILIATE_CODE_KEY = "feedback_affiliate_code";
const HOW_IT_WORKS_SEEN_KEY = "feedback_how_it_works_seen";

/** Real persistent flag — shown once ever, survives reloads (unlike the intro screen). */
export function hasSeenHowItWorks(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(HOW_IT_WORKS_SEEN_KEY) === "true";
}

export function markHowItWorksSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HOW_IT_WORKS_SEEN_KEY, "true");
}

export function storeCrewToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CREW_TOKEN_KEY, token);
}

export function getStoredCrewToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CREW_TOKEN_KEY);
}

export function storeAffiliateCode(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AFFILIATE_CODE_KEY, code);
}

export function getStoredAffiliateCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AFFILIATE_CODE_KEY);
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
