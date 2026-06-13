"use client";

import { useCallback, useEffect, useState } from "react";
import {
  declinePwaInstall,
  isBeforeInstallPromptEvent,
  isPwaInstalled,
  markPwaInstalled,
  shouldShowPwaInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isPwaInstalled()) {
      markPwaInstalled();
      return;
    }

    if (!shouldShowPwaInstallPrompt()) return;

    const onBeforeInstall = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) return;
      event.preventDefault();
      setDeferredPrompt(event);
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
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    declinePwaInstall();
    setDeferredPrompt(null);
    setVisible(false);
  }, []);

  return {
    visible: visible && shouldShowPwaInstallPrompt(),
    installing,
    install,
    dismiss,
  };
}
