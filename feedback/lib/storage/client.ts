const ANON_USER_KEY = "feedback_anon_user_id";
const USER_NAME_KEY = "feedback_user_name";

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
