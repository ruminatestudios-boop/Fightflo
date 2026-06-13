const INSTALLED_KEY = "flowbag-pwa-installed";
const DECLINED_KEY = "flowbag-pwa-install-declined";

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
