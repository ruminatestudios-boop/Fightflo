"use client";

import { useEffect } from "react";
import { isPwaInstalled, markPwaInstalled } from "@/lib/pwa-install";

export function PWARegister() {
  useEffect(() => {
    if (isPwaInstalled()) markPwaInstalled();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Dev: remove stale SW so phone always gets latest UI
    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* optional */
    });
  }, []);

  return null;
}
