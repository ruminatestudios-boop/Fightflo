"use client";

import { useCallback, useEffect, useState } from "react";
import {
  declinePwaInstall,
  isBeforeInstallPromptEvent,
  isIosHomeScreenInstallable,
  isPwaInstalled,
  markPwaInstalled,
  shouldShowPwaInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

export type PwaInstallMode = "native" | "ios";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [mode, setMode] = useState<PwaInstallMode>("native");

  useEffect(() => {
    if (isPwaInstalled()) {
      markPwaInstalled();
      return;
    }

    if (!shouldShowPwaInstallPrompt()) return;

    if (isIosHomeScreenInstallable()) {
      setMode("ios");
      setVisible(true);
    }

    const onBeforeInstall = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) return;
      event.preventDefault();
      setDeferredPrompt(event);
      setMode("native");
      setVisible(true);
    };

    const onInstalled = () => {
      markPwaInstalled();
      setDeferredPrompt(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (mode === "ios") {
      declinePwaInstall();
      setVisible(false);
      return true;
    }

    if (!deferredPrompt) return false;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        markPwaInstalled();
        setDeferredPrompt(null);
        setVisible(false);
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt, mode]);

  const dismiss = useCallback(() => {
    declinePwaInstall();
    setDeferredPrompt(null);
    setVisible(false);
  }, []);

  return {
    visible: visible && shouldShowPwaInstallPrompt(),
    installing,
    mode,
    install,
    dismiss,
  };
}
