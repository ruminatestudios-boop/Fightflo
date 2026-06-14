const ANON_USER_KEY = "feedback_anon_user_id";

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ANON_USER_KEY);
}

export function storeUserId(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANON_USER_KEY, userId);
}
