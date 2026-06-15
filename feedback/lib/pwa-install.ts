const INSTALLED_KEY = "feedback-pwa-installed";
const DECLINED_KEY = "feedback-pwa-install-declined";

export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;

  if (localStorage.getItem(INSTALLED_KEY) === "true") return true;

  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

export function hasDeclinedPwaInstall(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(DECLINED_KEY) === "true";
}

export function markPwaInstalled(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTALLED_KEY, "true");
  localStorage.removeItem(DECLINED_KEY);
}

export function declinePwaInstall(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DECLINED_KEY, "true");
}

export function shouldShowPwaInstallPrompt(): boolean {
  return !isPwaInstalled() && !hasDeclinedPwaInstall();
}

export function isIosHomeScreenInstallable(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  if (!isIos) return false;
  const isSafari =
    /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return isSafari || isIos;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function isBeforeInstallPromptEvent(
  event: Event
): event is BeforeInstallPromptEvent {
  return (
    "prompt" in event &&
    typeof (event as BeforeInstallPromptEvent).prompt === "function"
  );
}
